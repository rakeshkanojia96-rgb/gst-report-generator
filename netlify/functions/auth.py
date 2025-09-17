import json
import os
import hashlib
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta

def lambda_handler(event, context):
    """
    Netlify serverless function for authentication
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    # Handle preflight requests
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Initialize database
        init_database()
        
        # Parse request
        path = event.get('path', '')
        method = event['httpMethod']
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        
        # Route requests
        if method == 'POST':
            if '/register' in path:
                return register_user(body, headers)
            elif '/login' in path:
                return login_user(body, headers)
            elif '/logout' in path:
                return logout_user(body, headers)
            elif '/validate' in path:
                return validate_session(body, headers)
            elif '/update-profile' in path:
                return update_profile(body, headers)
            elif '/change-password' in path:
                return change_password(body, headers)
        elif method == 'GET':
            if '/profile' in path:
                session_token = event.get('headers', {}).get('authorization', '').replace('Bearer ', '')
                return get_profile({'session_token': session_token}, headers)
        
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Endpoint not found'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Server error: {str(e)}'})
        }

def init_database():
    """Initialize SQLite database"""
    db_path = '/tmp/users.db'  # Netlify functions use /tmp for temporary storage
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
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
    ''')
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            session_token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def hash_password(password, salt=None):
    """Hash password with salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return password_hash, salt

def register_user(data, headers):
    """Register new user"""
    try:
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'gst_number', 'password']
        for field in required_fields:
            if not data.get(field):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'message': f'{field} is required'})
                }
        
        # Hash password
        password_hash, salt = hash_password(data['password'])
        
        # Get IST timezone
        ist = timezone(timedelta(hours=5, minutes=30))
        current_time = datetime.now(ist).isoformat()
        
        # Insert user
        conn = sqlite3.connect('/tmp/users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO users (first_name, last_name, email, phone, company, gst_number, password_hash, salt, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['first_name'], data['last_name'], data['email'],
            data.get('phone', ''), data.get('company', ''), data['gst_number'],
            password_hash, salt, current_time
        ))
        
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'User registered successfully'})
        }
        
    except sqlite3.IntegrityError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Email already exists'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Registration failed: {str(e)}'})
        }

def login_user(data, headers):
    """Login user"""
    try:
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Email and password required'})
            }
        
        conn = sqlite3.connect('/tmp/users.db')
        cursor = conn.cursor()
        
        # Get user
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Invalid credentials'})
            }
        
        # Verify password
        stored_hash = user[7]  # password_hash
        salt = user[8]  # salt
        password_hash, _ = hash_password(password, salt)
        
        if password_hash != stored_hash:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Invalid credentials'})
            }
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        ist = timezone(timedelta(hours=5, minutes=30))
        current_time = datetime.now(ist)
        expires_at = current_time + timedelta(days=7)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user[0], session_token, expires_at.isoformat()))
        
        # Update last login
        cursor.execute('UPDATE users SET last_login = ? WHERE id = ?', 
                      (current_time.isoformat(), user[0]))
        
        conn.commit()
        conn.close()
        
        # Return user data
        user_data = {
            'id': user[0],
            'first_name': user[1],
            'last_name': user[2],
            'email': user[3],
            'phone': user[4],
            'company': user[5],
            'gst_number': user[6],
            'session_token': session_token,
            'last_login': current_time.isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'user': user_data})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Login failed: {str(e)}'})
        }

def validate_session(data, headers):
    """Validate session token"""
    try:
        session_token = data.get('session_token')
        
        if not session_token:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Session token required'})
            }
        
        conn = sqlite3.connect('/tmp/users.db')
        cursor = conn.cursor()
        
        # Get session and user
        cursor.execute('''
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > ?
        ''', (session_token, datetime.now(timezone.utc).isoformat()))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Invalid or expired session'})
            }
        
        # Return user data
        user_data = {
            'id': result[5],
            'first_name': result[6],
            'last_name': result[7],
            'email': result[8],
            'phone': result[9],
            'company': result[10],
            'gst_number': result[11],
            'session_token': session_token,
            'last_login': result[15]
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'user': user_data})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Validation failed: {str(e)}'})
        }

def get_profile(data, headers):
    """Get user profile"""
    return validate_session(data, headers)

def update_profile(data, headers):
    """Update user profile"""
    try:
        session_token = data.get('session_token')
        
        # Validate session first
        validation = validate_session({'session_token': session_token}, headers)
        if validation['statusCode'] != 200:
            return validation
        
        user_data = json.loads(validation['body'])['user']
        user_id = user_data['id']
        
        # Update allowed fields (excluding GST number)
        conn = sqlite3.connect('/tmp/users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET first_name = ?, last_name = ?, phone = ?, company = ?
            WHERE id = ?
        ''', (
            data.get('first_name', user_data['first_name']),
            data.get('last_name', user_data['last_name']),
            data.get('phone', user_data['phone']),
            data.get('company', user_data['company']),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Profile updated successfully'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Update failed: {str(e)}'})
        }

def change_password(data, headers):
    """Change user password"""
    try:
        session_token = data.get('session_token')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not all([session_token, current_password, new_password]):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'All password fields required'})
            }
        
        # Validate session
        validation = validate_session({'session_token': session_token}, headers)
        if validation['statusCode'] != 200:
            return validation
        
        user_data = json.loads(validation['body'])['user']
        user_id = user_data['id']
        
        conn = sqlite3.connect('/tmp/users.db')
        cursor = conn.cursor()
        
        # Get current password hash
        cursor.execute('SELECT password_hash, salt FROM users WHERE id = ?', (user_id,))
        result = cursor.fetchone()
        
        # Verify current password
        current_hash, _ = hash_password(current_password, result[1])
        if current_hash != result[0]:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Current password incorrect'})
            }
        
        # Hash new password
        new_hash, new_salt = hash_password(new_password)
        
        # Update password
        cursor.execute('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
                      (new_hash, new_salt, user_id))
        
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Password changed successfully'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Password change failed: {str(e)}'})
        }

def logout_user(data, headers):
    """Logout user"""
    try:
        session_token = data.get('session_token')
        
        if session_token:
            conn = sqlite3.connect('/tmp/users.db')
            cursor = conn.cursor()
            cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
            conn.commit()
            conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Logged out successfully'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': f'Logout failed: {str(e)}'})
        }
