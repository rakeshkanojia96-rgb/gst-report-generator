from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our existing backend
from auth_backend import AuthBackend

app = Flask(__name__)
CORS(app)

# Initialize authentication backend
auth = AuthBackend()

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Authentication API routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        result = auth.register_user(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        result = auth.login_user(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/validate-session', methods=['POST'])
def validate_session():
    try:
        data = request.get_json()
        result = auth.validate_session(data.get('session_token'))
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        data = request.get_json()
        result = auth.logout_user(data.get('session_token'))
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        result = auth.get_user_profile(session_token)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data = request.get_json()
        result = auth.update_user_profile(session_token, data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/change-password', methods=['POST'])
def change_password():
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data = request.get_json()
        result = auth.change_password(session_token, data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8082))
    app.run(host='0.0.0.0', port=port, debug=False)
