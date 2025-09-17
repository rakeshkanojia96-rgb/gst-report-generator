const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const path = require('path');

// Initialize database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = '/tmp/users.db';
        const db = new sqlite3.Database(dbPath);
        
        db.serialize(() => {
            // Create users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    company TEXT,
                    gst_number TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            `);
            
            // Create sessions table
            db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    session_token TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `, (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// Hash password with salt
function hashPassword(password, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return { hash, salt };
}

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('base64url');
}

// Get IST time
function getISTTime() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(now.getTime() + istOffset);
}

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // Initialize database
        await initDatabase();
        
        // Parse request
        const path = event.path;
        const method = event.httpMethod;
        const body = event.body ? JSON.parse(event.body) : {};
        
        // Debug logging
        console.log('Function called with:', { path, method, body });
        
        // Route requests - handle all auth endpoints
        if (method === 'POST') {
            if (path.includes('register') || path === '/.netlify/functions/auth') {
                console.log('Processing registration request');
                return await registerUser(body, headers);
            } else if (path.includes('login')) {
                return await loginUser(body, headers);
            } else if (path.includes('logout')) {
                return await logoutUser(body, headers);
            } else if (path.includes('validate')) {
                return await validateSession(body, headers);
            } else if (path.includes('update-profile')) {
                return await updateProfile(body, headers);
            } else if (path.includes('change-password')) {
                return await changePassword(body, headers);
            }
        } else if (method === 'GET') {
            if (path.includes('profile')) {
                const sessionToken = event.headers.authorization?.replace('Bearer ', '');
                return await getProfile({ session_token: sessionToken }, headers);
            }
        }
        
        // If no route matches, check if it's a general auth request
        if (path === '/.netlify/functions/auth' && method === 'POST') {
            // Default to registration if no specific endpoint
            return await registerUser(body, headers);
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: 'Endpoint not found' })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};

// Register user function
async function registerUser(data, headers) {
    return new Promise((resolve, reject) => {
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'gst_number', 'password'];
        for (const field of requiredFields) {
            if (!data[field]) {
                resolve({
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: `${field} is required` })
                });
                return;
            }
        }
        
        // Hash password
        const { hash: passwordHash, salt } = hashPassword(data.password);
        const currentTime = getISTTime().toISOString();
        
        const db = new sqlite3.Database('/tmp/users.db');
        
        db.run(`
            INSERT INTO users (first_name, last_name, email, phone, company, gst_number, password_hash, salt, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.first_name, data.last_name, data.email,
            data.phone || '', data.company || '', data.gst_number,
            passwordHash, salt, currentTime
        ], function(err) {
            db.close();
            
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    resolve({
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, message: 'Email already exists' })
                    });
                } else {
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ success: false, message: `Registration failed: ${err.message}` })
                    });
                }
            } else {
                resolve({
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'User registered successfully' })
                });
            }
        });
    });
}

// Login user function
async function loginUser(data, headers) {
    return new Promise((resolve, reject) => {
        const { email, password } = data;
        
        if (!email || !password) {
            resolve({
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Email and password required' })
            });
            return;
        }
        
        const db = new sqlite3.Database('/tmp/users.db');
        
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err || !user) {
                db.close();
                resolve({
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid credentials' })
                });
                return;
            }
            
            // Verify password
            const { hash: passwordHash } = hashPassword(password, user.salt);
            
            if (passwordHash !== user.password_hash) {
                db.close();
                resolve({
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid credentials' })
                });
                return;
            }
            
            // Create session
            const sessionToken = generateSessionToken();
            const currentTime = getISTTime();
            const expiresAt = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            db.run(`
                INSERT INTO sessions (user_id, session_token, expires_at)
                VALUES (?, ?, ?)
            `, [user.id, sessionToken, expiresAt.toISOString()], (err) => {
                if (err) {
                    db.close();
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ success: false, message: 'Session creation failed' })
                    });
                    return;
                }
                
                // Update last login
                db.run('UPDATE users SET last_login = ? WHERE id = ?', 
                      [currentTime.toISOString(), user.id], (err) => {
                    db.close();
                    
                    const userData = {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        phone: user.phone,
                        company: user.company,
                        gst_number: user.gst_number,
                        session_token: sessionToken,
                        last_login: currentTime.toISOString()
                    };
                    
                    resolve({
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, user: userData })
                    });
                });
            });
        });
    });
}

// Validate session function
async function validateSession(data, headers) {
    return new Promise((resolve, reject) => {
        const { session_token } = data;
        
        if (!session_token) {
            resolve({
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Session token required' })
            });
            return;
        }
        
        const db = new sqlite3.Database('/tmp/users.db');
        
        db.get(`
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > ?
        `, [session_token, new Date().toISOString()], (err, result) => {
            db.close();
            
            if (err || !result) {
                resolve({
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid or expired session' })
                });
                return;
            }
            
            const userData = {
                id: result.user_id,
                first_name: result.first_name,
                last_name: result.last_name,
                email: result.email,
                phone: result.phone,
                company: result.company,
                gst_number: result.gst_number,
                session_token: session_token,
                last_login: result.last_login
            };
            
            resolve({
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, user: userData })
            });
        });
    });
}

// Get profile function
async function getProfile(data, headers) {
    return await validateSession(data, headers);
}

// Update profile function
async function updateProfile(data, headers) {
    try {
        const validation = await validateSession({ session_token: data.session_token }, headers);
        if (validation.statusCode !== 200) {
            return validation;
        }
        
        const userData = JSON.parse(validation.body).user;
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database('/tmp/users.db');
            
            db.run(`
                UPDATE users SET first_name = ?, last_name = ?, phone = ?, company = ?
                WHERE id = ?
            `, [
                data.first_name || userData.first_name,
                data.last_name || userData.last_name,
                data.phone || userData.phone,
                data.company || userData.company,
                userData.id
            ], (err) => {
                db.close();
                
                if (err) {
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ success: false, message: `Update failed: ${err.message}` })
                    });
                } else {
                    resolve({
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, message: 'Profile updated successfully' })
                    });
                }
            });
        });
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Update failed: ${error.message}` })
        };
    }
}

// Change password function
async function changePassword(data, headers) {
    try {
        const validation = await validateSession({ session_token: data.session_token }, headers);
        if (validation.statusCode !== 200) {
            return validation;
        }
        
        const userData = JSON.parse(validation.body).user;
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database('/tmp/users.db');
            
            // Get current password hash
            db.get('SELECT password_hash, salt FROM users WHERE id = ?', [userData.id], (err, result) => {
                if (err || !result) {
                    db.close();
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ success: false, message: 'User not found' })
                    });
                    return;
                }
                
                // Verify current password
                const { hash: currentHash } = hashPassword(data.current_password, result.salt);
                if (currentHash !== result.password_hash) {
                    db.close();
                    resolve({
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, message: 'Current password incorrect' })
                    });
                    return;
                }
                
                // Hash new password
                const { hash: newHash, salt: newSalt } = hashPassword(data.new_password);
                
                // Update password
                db.run('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
                      [newHash, newSalt, userData.id], (err) => {
                    db.close();
                    
                    if (err) {
                        resolve({
                            statusCode: 500,
                            headers,
                            body: JSON.stringify({ success: false, message: `Password change failed: ${err.message}` })
                        });
                    } else {
                        resolve({
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({ success: true, message: 'Password changed successfully' })
                        });
                    }
                });
            });
        });
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Password change failed: ${error.message}` })
        };
    }
}

// Logout user function
async function logoutUser(data, headers) {
    return new Promise((resolve, reject) => {
        const { session_token } = data;
        
        if (session_token) {
            const db = new sqlite3.Database('/tmp/users.db');
            db.run('DELETE FROM sessions WHERE session_token = ?', [session_token], (err) => {
                db.close();
            });
        }
        
        resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Logged out successfully' })
        });
    });
}
