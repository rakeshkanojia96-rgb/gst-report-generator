const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Simple in-memory storage for demo (not persistent across function calls)
// In a real production environment, you'd use a database like FaunaDB, Supabase, or Airtable
let users = [];

function saveUser(userData) {
    return new Promise((resolve, reject) => {
        try {
            // Check if email already exists
            if (users.find(user => user.email === userData.email)) {
                reject(new Error('Email already exists'));
                return;
            }
            
            // Add new user
            const newUser = {
                id: Date.now(),
                ...userData,
                created_at: new Date().toISOString()
            };
            
            users.push(newUser);
            console.log('User saved to memory:', newUser.email);
            console.log('Total users in memory:', users.length);
            
            resolve(newUser);
            
        } catch (error) {
            reject(error);
        }
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
        
        // Prepare user data
        const userData = {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone || '',
            company: data.company || '',
            gst_number: data.gst_number,
            password_hash: passwordHash,
            salt: salt,
            last_login: getISTTime().toISOString()
        };
        
        // Save user
        await saveUser(userData);
        
        console.log('User registered successfully:', data.email);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'User registered successfully' })
        };
        
    } catch (error) {
        console.error('Registration function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};
