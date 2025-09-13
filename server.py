#!/usr/bin/env python3
"""
Simple HTTP server for GST Report Generator
Run this script to serve the web application locally
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow file uploads
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the directory containing the web files
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    PORT = 8080
    
    # Try to find an available port
    for port in range(8080, 8090):
        try:
            with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
                PORT = port
                break
        except OSError:
            continue
    else:
        print("Could not find an available port between 8080-8089")
        sys.exit(1)
    
    print(f"GST Report Generator Server Starting...")
    print(f"Serving files from: {script_dir}")
    print(f"Server running at: http://localhost:{PORT}")
    print(f"Open your browser and navigate to the URL above")
    print(f"Press Ctrl+C to stop the server")
    print("-" * 50)
    
    # Try to open browser automatically
    try:
        webbrowser.open(f'http://localhost:{PORT}')
        print("Browser opened automatically")
    except:
        print("Could not open browser automatically")
        print(f"   Please manually open: http://localhost:{PORT}")
    
    print("-" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        print("Thank you for using GST Report Generator!")

if __name__ == "__main__":
    main()
