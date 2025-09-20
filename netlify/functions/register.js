const sqlite3 = require('sqlite3');
const crypto = require('crypto');

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
    
    // Only handle POST requests for registration
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }
    
    try {
        // Initialize database
        await initDatabase();
        
        // Parse request body
        const data = event.body ? JSON.parse(event.body) : {};
        
        console.log('Registration request received:', { ...data, password: '[HIDDEN]' });
        
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'gst_number', 'password'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: `${field} is required` })
                };
            }
        }
        
        // Hash password
        const { hash: passwordHash, salt } = hashPassword(data.password);
        const currentTime = getISTTime().toISOString();
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database('/tmp/users.db');
            
            db.run(`
                INSERT INTO users (first_name, last_name, email, phone, company, gst_number, password_hash, salt, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                data.first_name, 
                data.last_name, 
                data.email,
                data.phone || '', 
                data.company || '', 
                data.gst_number,
                passwordHash, 
                salt, 
                currentTime
            ], function(err) {
                db.close();
                
                if (err) {
                    console.error('Registration error:', err);
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
                    console.log('User registered successfully:', data.email);
                    resolve({
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, message: 'User registered successfully' })
                    });
                }
            });
        });
        
    } catch (error) {
        console.error('Registration function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};
