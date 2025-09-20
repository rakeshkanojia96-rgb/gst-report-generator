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
    
    console.log('Simple auth function called');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Body:', event.body);
    
    try {
        const data = event.body ? JSON.parse(event.body) : {};
        console.log('Parsed data:', data);
        
        // Handle login
        if (event.httpMethod === 'POST') {
            console.log('Processing login request');
            
            // Check credentials
            if (data.email === 'rakesh@gmail.com' && data.password === 'YasYah@1') {
                console.log('Credentials match - login successful');
                
                // Return success with user data
                const userData = {
                    id: 1,
                    first_name: 'Rakesh',
                    last_name: 'Kanojia',
                    email: 'rakesh@gmail.com',
                    phone: '9898766432',
                    company: 'rakesh ltd',
                    gst_number: '27CJAPK3544E1ZI',
                    session_token: 'demo_session_' + Date.now(),
                    last_login: new Date().toISOString()
                };
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, user: userData })
                };
            } else {
                console.log('Credentials do not match');
                console.log('Expected: rakesh@gmail.com / YasYah@1');
                console.log('Received:', data.email, '/', data.password);
                
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid credentials' })
                };
            }
        }
        
        // Handle registration (just return success for demo)
        if (event.httpMethod === 'POST' && event.path.includes('register')) {
            console.log('Registration request - returning success');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'User registered successfully' })
            };
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Simple auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
        };
    }
};
