const crypto = require('crypto');
const fs = require('fs');

// Hash password with salt
function hashPassword(password, salt) {
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return hash;
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

// Find user by email
function findUser(email) {
    try {
        const usersFile = '/tmp/users.json';
        if (!fs.existsSync(usersFile)) {
            return null;
        }
        
        const data = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(data);
        return users.find(user => user.email === email);
    } catch (error) {
        console.error('Error reading users file:', error);
        return null;
    }
}

// Save session
function saveSession(userId, sessionToken) {
    try {
        const sessionsFile = '/tmp/sessions.json';
        let sessions = [];
        
        // Read existing sessions
        if (fs.existsSync(sessionsFile)) {
            const data = fs.readFileSync(sessionsFile, 'utf8');
            sessions = JSON.parse(data);
        }
        
        // Add new session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const newSession = {
            user_id: userId,
            session_token: sessionToken,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
        };
        
        sessions.push(newSession);
        
        // Save back to file
        fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving session:', error);
        return false;
    }
}

// Update user last login
function updateLastLogin(email) {
    try {
        const usersFile = '/tmp/users.json';
        if (!fs.existsSync(usersFile)) {
            return false;
        }
        
        const data = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(data);
        
        const userIndex = users.findIndex(user => user.email === email);
        if (userIndex !== -1) {
            users[userIndex].last_login = getISTTime().toISOString();
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error updating last login:', error);
        return false;
    }
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
    
    // Only handle POST requests for login
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }
    
    try {
        // Parse request body
        const data = event.body ? JSON.parse(event.body) : {};
        
        console.log('Login request received for:', data.email);
        
        // Validate required fields
        if (!data.email || !data.password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Email and password are required' })
            };
        }
        
        // Find user
        const user = findUser(data.email);
        console.log('User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('User data structure:', {
                email: user.email,
                hasPasswordHash: !!user.password_hash,
                hasSalt: !!user.salt,
                passwordHashLength: user.password_hash ? user.password_hash.length : 0,
                saltLength: user.salt ? user.salt.length : 0
            });
        }
        
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' })
            };
        }
        
        // Verify password
        const hashedPassword = hashPassword(data.password, user.salt);
        console.log('Password verification:', {
            provided: hashedPassword,
            stored: user.password_hash,
            salt: user.salt,
            match: hashedPassword === user.password_hash
        });
        
        if (hashedPassword !== user.password_hash) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' })
            };
        }
        
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Save session
        const sessionSaved = saveSession(user.id, sessionToken);
        if (!sessionSaved) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: 'Failed to create session' })
            };
        }
        
        // Update last login
        updateLastLogin(data.email);
        
        // Prepare user data (excluding sensitive information)
        const userData = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            company: user.company,
            gst_number: user.gst_number,
            session_token: sessionToken,
            last_login: getISTTime().toISOString()
        };
        
        console.log('User logged in successfully:', data.email);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, user: userData })
        };
        
    } catch (error) {
        console.error('Login function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};
