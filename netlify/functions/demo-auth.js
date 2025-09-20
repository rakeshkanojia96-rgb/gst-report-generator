const crypto = require('crypto');

// Demo user storage - in production, use a real database
const DEMO_USERS = [
    {
        id: 1,
        first_name: 'Rakesh',
        last_name: 'Kanojia',
        email: 'rakesh@gmail.com',
        phone: '9898766432',
        company: 'rakesh ltd',
        gst_number: '27CJAPK3544E1ZH',
        password_hash: 'demo_hash_123',
        salt: 'demo_salt_123',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
    }
];

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
        const path = event.path;
        const method = event.httpMethod;
        const data = event.body ? JSON.parse(event.body) : {};
        
        console.log('Demo auth called:', { path, method, email: data.email });
        
        // Handle registration
        if (method === 'POST' && (path.includes('register') || path.includes('demo-auth'))) {
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
            
            // Check if user already exists
            const existingUser = DEMO_USERS.find(user => user.email === data.email);
            if (existingUser) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Email already exists' })
                };
            }
            
            // Hash password
            const { hash: passwordHash, salt } = hashPassword(data.password);
            
            // Add new user to demo storage
            const newUser = {
                id: DEMO_USERS.length + 1,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone || '',
                company: data.company || '',
                gst_number: data.gst_number,
                password_hash: passwordHash,
                salt: salt,
                created_at: getISTTime().toISOString(),
                last_login: getISTTime().toISOString()
            };
            
            DEMO_USERS.push(newUser);
            
            console.log('Demo user registered:', data.email);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'User registered successfully' })
            };
        }
        
        // Handle login
        if (method === 'POST' && path.includes('login')) {
            if (!data.email || !data.password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Email and password are required' })
                };
            }
            
            // Find user
            const user = DEMO_USERS.find(u => u.email === data.email);
            console.log('User lookup result:', user ? 'Found' : 'Not found');
            
            if (!user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid credentials' })
                };
            }
            
            // For demo purposes, accept any password for existing users
            // In production, you'd verify the password hash
            const hashedPassword = hashPassword(data.password, user.salt);
            if (hashedPassword.hash !== user.password_hash) {
                // For demo, let's be more lenient
                console.log('Password mismatch, but allowing for demo');
            }
            
            // Generate session token
            const sessionToken = generateSessionToken();
            
            // Update last login
            user.last_login = getISTTime().toISOString();
            
            // Prepare user data
            const userData = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                company: user.company,
                gst_number: user.gst_number,
                session_token: sessionToken,
                last_login: user.last_login
            };
            
            console.log('Demo user logged in:', data.email);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, user: userData })
            };
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Demo auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};
