// User Authentication System - Isolated Module
// This module handles all authentication without affecting GST processing

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initializeAuth();
    }

    initializeAuth() {
        // Check for existing session
        this.checkExistingSession();
        this.setupAuthUI();
        this.bindAuthEvents();
        
        // Show login-first flow
        this.showLoginFirstFlow();
    }

    checkExistingSession() {
        const savedUser = localStorage.getItem('gst_user_session');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.isAuthenticated = true;
                this.showAuthenticatedState();
            } catch (e) {
                localStorage.removeItem('gst_user_session');
            }
        }
    }

    setupAuthUI() {
        // Create authentication modal HTML
        const authModalHTML = `
            <!-- Authentication Modal -->
            <div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="authModalTitle">Login to GST Generator</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Login Form -->
                            <div id="loginForm" class="auth-form">
                                <form id="loginFormElement">
                                    <div class="mb-3">
                                        <label for="loginEmail" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="loginEmail" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="loginPassword" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="loginPassword" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Login</button>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Don't have an account? <a href="#" id="showSignupForm">Sign up here</a></p>
                                </div>
                            </div>

                            <!-- Signup Form -->
                            <div id="signupForm" class="auth-form" style="display: none;">
                                <form id="signupFormElement">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="signupFirstName" class="form-label">First Name</label>
                                            <input type="text" class="form-control" id="signupFirstName" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="signupLastName" class="form-label">Last Name</label>
                                            <input type="text" class="form-control" id="signupLastName" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupEmail" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="signupEmail" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupPhone" class="form-label">Phone Number</label>
                                        <input type="tel" class="form-control" id="signupPhone" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupCompany" class="form-label">Company Name</label>
                                        <input type="text" class="form-control" id="signupCompany" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupGST" class="form-label">GST Number <span class="text-muted">(Optional)</span></label>
                                        <input type="text" class="form-control" id="signupGST" placeholder="e.g., 27AACCF6368D1CX">
                                        <div class="form-text">Enter your 15-digit GST number if available</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupPassword" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="signupPassword" required minlength="6">
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupConfirmPassword" class="form-label">Confirm Password</label>
                                        <input type="password" class="form-control" id="signupConfirmPassword" required>
                                    </div>
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="agreeTerms" required>
                                        <label class="form-check-label" for="agreeTerms">
                                            I agree to the Terms of Service and Privacy Policy
                                        </label>
                                    </div>
                                    <button type="submit" class="btn btn-success w-100">Create Account</button>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Already have an account? <a href="#" id="showLoginForm">Login here</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- User Profile Dropdown -->
            <div id="userProfileSection" class="d-none">
                <div class="dropdown">
                    <button class="btn btn-outline-primary dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                        <i class="fas fa-user"></i> <span id="userDisplayName">User</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" id="viewProfile"><i class="fas fa-user-circle"></i> Profile</a></li>
                        <li><a class="dropdown-item" href="#" id="userSettings"><i class="fas fa-cog"></i> Settings</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
                    </ul>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', authModalHTML);
    }

    bindAuthEvents() {
        // Form toggle events
        document.getElementById('showSignupForm')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });

        document.getElementById('showLoginForm')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Form submission events
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Logout event
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // GST number validation
        document.getElementById('signupGST')?.addEventListener('input', (e) => {
            this.validateGSTNumber(e.target);
        });
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('authModalTitle').textContent = 'Login to GST Generator';
    }

    showSignupForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Create Account';
    }

    validateGSTNumber(input) {
        const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const value = input.value.toUpperCase();
        
        if (value && !gstPattern.test(value)) {
            input.setCustomValidity('Please enter a valid GST number (15 characters)');
            input.classList.add('is-invalid');
        } else {
            input.setCustomValidity('');
            input.classList.remove('is-invalid');
            if (value) input.classList.add('is-valid');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Simulate API call - replace with actual backend
            const response = await this.loginUser(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
                
                this.showAuthenticatedState();
                this.closeAuthModal();
                this.showSuccessMessage('Login successful!');
            } else {
                this.showErrorMessage(response.message || 'Login failed');
            }
        } catch (error) {
            this.showErrorMessage('Login error: ' + error.message);
        }
    }

    async handleSignup() {
        const formData = {
            first_name: document.getElementById('signupFirstName').value.trim(),
            last_name: document.getElementById('signupLastName').value.trim(),
            email: document.getElementById('signupEmail').value.trim(),
            phone: document.getElementById('signupPhone').value.trim(),
            company: document.getElementById('signupCompany').value.trim(),
            gst_number: document.getElementById('signupGST').value.trim() || null,
            password: document.getElementById('signupPassword').value,
            confirmPassword: document.getElementById('signupConfirmPassword').value
        };

        console.log('Form data being sent:', formData);

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            this.showErrorMessage('Passwords do not match');
            return;
        }

        try {
            // Simulate API call - replace with actual backend
            const response = await this.registerUser(formData);
            
            if (response.success) {
                this.showSuccessMessage('Account created successfully! Please login.');
                this.showLoginForm();
            } else {
                this.showErrorMessage(response.message || 'Registration failed');
            }
        } catch (error) {
            this.showErrorMessage('Registration error: ' + error.message);
        }
    }

    async loginUser(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success && result.session_token) {
                // Store session token
                localStorage.setItem('gst_session_token', result.session_token);
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Network error: ' + error.message
            };
        }
    }

    async registerUser(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                message: 'Network error: ' + error.message
            };
        }
    }

    async handleLogout() {
        try {
            const sessionToken = localStorage.getItem('gst_session_token');
            
            if (sessionToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('gst_user_session');
            localStorage.removeItem('gst_session_token');
            this.showUnauthenticatedState();
            this.showSuccessMessage('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local data even if server request fails
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('gst_user_session');
            localStorage.removeItem('gst_session_token');
            this.showUnauthenticatedState();
            this.showSuccessMessage('Logged out successfully');
        }
    }

    showAuthenticatedState() {
        // Hide login button, show user profile
        document.getElementById('loginBtn')?.classList.add('d-none');
        document.getElementById('userProfileSection')?.classList.remove('d-none');
        
        if (this.currentUser) {
            document.getElementById('userDisplayName').textContent = 
                `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    showUnauthenticatedState() {
        // Show login button, hide user profile
        document.getElementById('loginBtn')?.classList.remove('d-none');
        document.getElementById('userProfileSection')?.classList.add('d-none');
    }

    closeAuthModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
        if (modal) modal.hide();
    }

    showSuccessMessage(message) {
        // Create toast notification
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        // Create toast notification
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toastHTML = `
            <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Add toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
            this.showGSTInterface();
        }
    }
}

hideGSTInterface() {
    // Hide main GST sections
    const sectionsToHide = [
        '.container .row:nth-child(2)', // Configuration
        '.container .row:nth-child(3)', // Upload sections
        '.container .row:nth-child(4)', // Process button
        '#progressSection',
        '#results',
        '.container .row:nth-child(6)', // Features
        '.container .row:nth-child(7)'  // Pricing
    ];
    
    sectionsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        const sectionsToHide = [
            '.container .row:nth-child(2)', // Configuration
            '.container .row:nth-child(3)', // Upload sections
            '.container .row:nth-child(4)', // Process button
            '#progressSection',
            '#results',
            '.container .row:nth-child(6)', // Features
            '.container .row:nth-child(7)'  // Pricing
        ];
        
        sectionsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    showGSTInterface() {
        // Show main GST sections
        const sectionsToShow = [
            '.container .row:nth-child(2)', // Configuration
            '.container .row:nth-child(3)', // Upload sections
            '.container .row:nth-child(4)', // Process button
            '.container .row:nth-child(6)', // Features
            '.container .row:nth-child(7)'  // Pricing
        ];
        
        sectionsToShow.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = '';
            }
        });

        // Hide auth welcome
        const authWelcome = document.getElementById('authWelcome');
        if (authWelcome) {
            authWelcome.style.display = 'none';
        }
    }

    showAuthWelcome() {
        // Create welcome screen if it doesn't exist
        let authWelcome = document.getElementById('authWelcome');
        if (!authWelcome) {
            const welcomeHTML = `
                <div id="authWelcome" class="row justify-content-center">
                    <div class="col-md-8 text-center">
                        <div class="card shadow-lg">
                            <div class="card-body p-5">
                                <i class="fas fa-shield-alt fa-4x text-primary mb-4"></i>
                                <h2 class="mb-4">Welcome to GST Report Generator</h2>
                                <p class="lead mb-4">
                                    India's most trusted GST compliance tool for e-commerce businesses.
                                    Generate accurate GSTR1 reports from Amazon and Meesho data.
                                </p>
                                <div class="row mb-4">
                                    <div class="col-md-4">
                                        <i class="fas fa-file-upload fa-2x text-success mb-2"></i>
                                        <h6>Multi-Platform</h6>
                                        <small>Amazon & Meesho</small>
                                    </div>
                                    <div class="col-md-4">
                                        <i class="fas fa-shield-check fa-2x text-info mb-2"></i>
                                        <h6>GST Compliant</h6>
                                        <small>Portal Compatible</small>
                                    </div>
                                    <div class="col-md-4">
                                        <i class="fas fa-chart-line fa-2x text-warning mb-2"></i>
                                        <h6>Detailed Reports</h6>
                                        <small>Excel & JSON</small>
                                    </div>
                                </div>
                                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                                    <button class="btn btn-primary btn-lg me-md-2" onclick="authSystem.showAuthModal('login')">
                                        <i class="fas fa-sign-in-alt"></i> Login
                                    </button>
                                    <button class="btn btn-success btn-lg" onclick="authSystem.showAuthModal('signup')">
                                        <i class="fas fa-user-plus"></i> Create Account
                                    </button>
                                </div>
                                <hr class="my-4">
                                <button class="btn btn-outline-secondary" onclick="authSystem.skipAuth()">
                                    <i class="fas fa-play"></i> Continue Without Login (Testing)
                                </button>
                                <p class="small text-muted mt-2">
                                    Skip authentication for testing purposes only
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Insert after the header row
            const headerRow = document.querySelector('.container .row:first-child');
            if (headerRow) {
                headerRow.insertAdjacentHTML('afterend', welcomeHTML);
            }
        } else {
            authWelcome.style.display = '';
        }
    }

    showAuthModal(type = 'login') {
        if (type === 'signup') {
            this.showSignupForm();
        } else {
            this.showLoginForm();
        }
        
        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        modal.show();
    }

    skipAuth() {
        // For testing purposes - bypass authentication
        this.showGSTInterface();
        this.showSuccessMessage('Authentication bypassed for testing');
    }

    // Public methods for integration
    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    requireAuth(callback) {
        if (this.isAuthenticated) {
            callback();
        } else {
            // Show login modal
            const modal = new bootstrap.Modal(document.getElementById('authModal'));
            modal.show();
        }
    }
}

// Initialize authentication system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
