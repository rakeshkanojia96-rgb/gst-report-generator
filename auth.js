// User Authentication System - Isolated Module
// This module handles all authentication without affecting GST processing

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        // Detect Firebase availability (initialized in firebase-init.js)
        this.useFirebase = typeof window !== 'undefined' && !!window.firebaseServices;
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

    // --- Firebase helpers (no-ops when Firebase not present) ---
    get firebase() {
        return this.useFirebase ? window.firebaseServices : null;
    }

    async getUserProfileFromFirestore(uid) {
        if (!this.firebase) return null;
        try {
            const { db, doc, getDoc } = this.firebase;
            const snap = await getDoc(doc(db, 'users', uid));
            return snap.exists() ? snap.data() : null;
        } catch (e) {
            console.error('Firestore get profile error:', e);
            return null;
        }
    }

    async createUserProfileInFirestore(uid, profile) {
        if (!this.firebase) return false;
        try {
            const { db, doc, setDoc, serverTimestamp } = this.firebase;
            await setDoc(doc(db, 'users', uid), { ...profile, created_at: serverTimestamp() });
            return true;
        } catch (e) {
            console.error('Firestore set profile error:', e);
            return false;
        }
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
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="loginPassword" required>
                                            <button class="btn btn-outline-secondary" type="button" id="toggleLoginPassword">
                                                <i class="fas fa-eye" id="loginPasswordIcon"></i>
                                            </button>
                                        </div>
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
                                        <label for="signupGST" class="form-label">GST Number <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="signupGST" placeholder="e.g., 27AACCF6368D1CX" required>
                                        <div class="form-text">Enter your 15-digit GST number</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupPassword" class="form-label">Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="signupPassword" required minlength="6">
                                            <button class="btn btn-outline-secondary" type="button" id="toggleSignupPassword">
                                                <i class="fas fa-eye" id="signupPasswordIcon"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="signupConfirmPassword" class="form-label">Confirm Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="signupConfirmPassword" required>
                                            <button class="btn btn-outline-secondary" type="button" id="toggleSignupConfirmPassword">
                                                <i class="fas fa-eye" id="signupConfirmPasswordIcon"></i>
                                            </button>
                                        </div>
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

            <!-- User Profile Modal -->
            <div class="modal fade" id="userProfileModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">User Profile</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Profile View -->
                            <div id="profileView">
                                <div class="row mb-4">
                                    <div class="col-md-3 text-center">
                                        <div class="profile-avatar">
                                            <i class="fas fa-user-circle fa-5x text-primary"></i>
                                        </div>
                                    </div>
                                    <div class="col-md-9">
                                        <h4 id="profileFullName">User Name</h4>
                                        <p class="text-muted" id="profileEmail">user@example.com</p>
                                        <span class="badge bg-success">Active Account</span>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card h-100">
                                            <div class="card-header">
                                                <h6><i class="fas fa-info-circle"></i> Personal Information</h6>
                                            </div>
                                            <div class="card-body">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td style="white-space: nowrap; width: 30%;"><strong>Full Name:</strong></td>
                                                        <td id="profileFullNameDetail" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>Email:</strong></td>
                                                        <td id="profileEmailDetail" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>Phone:</strong></td>
                                                        <td id="profilePhone" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>&nbsp;</strong></td>
                                                        <td>&nbsp;</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card h-100">
                                            <div class="card-header">
                                                <h6><i class="fas fa-building"></i> Business Information</h6>
                                            </div>
                                            <div class="card-body">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td style="width: 30%;"><strong>Company:</strong></td>
                                                        <td id="profileCompany" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>GST Number:</strong></td>
                                                        <td id="profileGST" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Not provided</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>Member Since:</strong></td>
                                                        <td id="profileMemberSince" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="width: 30%;"><strong>Last Login:</strong></td>
                                                        <td id="profileLastLogin" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                                            <button class="btn btn-primary me-md-2" onclick="authSystem.showEditProfile()">
                                                <i class="fas fa-edit"></i> Edit Profile
                                            </button>
                                            <button class="btn btn-warning me-md-2" onclick="authSystem.showChangePassword()">
                                                <i class="fas fa-key"></i> Change Password
                                            </button>
                                            <button class="btn btn-danger" onclick="authSystem.handleLogout()">
                                                <i class="fas fa-sign-out-alt"></i> Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Edit Profile Form -->
                            <div id="editProfileForm" style="display: none;">
                                <form id="editProfileFormElement">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="editFirstName" class="form-label">First Name</label>
                                            <input type="text" class="form-control" id="editFirstName" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="editLastName" class="form-label">Last Name</label>
                                            <input type="text" class="form-control" id="editLastName" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editPhone" class="form-label">Phone Number</label>
                                        <input type="tel" class="form-control" id="editPhone" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editCompany" class="form-label">Company Name</label>
                                        <input type="text" class="form-control" id="editCompany" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editGST" class="form-label">GST Number</label>
                                        <input type="text" class="form-control" id="editGST" placeholder="e.g., 27AACCF6368D1CX" readonly>
                                    </div>
                                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                        <button type="button" class="btn btn-secondary me-md-2" onclick="authSystem.showProfileView()">Cancel</button>
                                        <button type="submit" class="btn btn-success">Save Changes</button>
                                    </div>
                                </form>
                            </div>

                            <!-- Change Password Form -->
                            <div id="changePasswordForm" style="display: none;">
                                <form id="changePasswordFormElement">
                                    <div class="mb-3">
                                        <label for="currentPassword" class="form-label">Current Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="currentPassword" required>
                                            <button class="btn btn-outline-secondary" type="button" id="toggleCurrentPassword">
                                                <i class="fas fa-eye" id="currentPasswordIcon"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="newPassword" class="form-label">New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="newPassword" required minlength="6">
                                            <button class="btn btn-outline-secondary" type="button" id="toggleNewPassword">
                                                <i class="fas fa-eye" id="newPasswordIcon"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="confirmNewPassword" class="form-label">Confirm New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="confirmNewPassword" required>
                                            <button class="btn btn-outline-secondary" type="button" id="toggleConfirmNewPassword">
                                                <i class="fas fa-eye" id="confirmNewPasswordIcon"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                        <button type="button" class="btn btn-secondary me-md-2" onclick="authSystem.showProfileView()">Cancel</button>
                                        <button type="submit" class="btn btn-warning">Change Password</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
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

        // Profile view event
        document.getElementById('viewProfile')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showUserProfile();
        });

        // GST number validation
        document.getElementById('signupGST')?.addEventListener('input', (e) => {
            this.validateGSTNumber(e.target);
        });

        // Profile form events
        document.getElementById('editProfileFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditProfile();
        });

        document.getElementById('changePasswordFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangePassword();
        });

        // Profile modal button events
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.showEditProfile();
        });

        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            this.showChangePassword();
        });

        // Password toggle events
        this.setupPasswordToggle('toggleLoginPassword', 'loginPassword', 'loginPasswordIcon');
        this.setupPasswordToggle('toggleSignupPassword', 'signupPassword', 'signupPasswordIcon');
        this.setupPasswordToggle('toggleSignupConfirmPassword', 'signupConfirmPassword', 'signupConfirmPasswordIcon');
        this.setupPasswordToggle('toggleCurrentPassword', 'currentPassword', 'currentPasswordIcon');
        this.setupPasswordToggle('toggleNewPassword', 'newPassword', 'newPasswordIcon');
        this.setupPasswordToggle('toggleConfirmNewPassword', 'confirmNewPassword', 'confirmNewPasswordIcon');

        document.getElementById('cancelEditProfile')?.addEventListener('click', () => {
            this.showProfileView();
        });

        document.getElementById('cancelChangePassword')?.addEventListener('click', () => {
            this.showProfileView();
        });

        document.getElementById('profileLogoutBtn')?.addEventListener('click', () => {
            this.logout();
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

    setupPasswordToggle(toggleButtonId, passwordFieldId, iconId) {
        const toggleButton = document.getElementById(toggleButtonId);
        const passwordField = document.getElementById(passwordFieldId);
        const icon = document.getElementById(iconId);

        if (toggleButton && passwordField && icon) {
            toggleButton.addEventListener('click', () => {
                const isPassword = passwordField.type === 'password';
                passwordField.type = isPassword ? 'text' : 'password';
                icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        console.log('Attempting login for:', email);

        try {
            const response = await this.loginUser(email, password);
            console.log('Login response:', response);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
                
                console.log('User authenticated:', this.currentUser);
                console.log('Calling showAuthenticatedState...');
                
                this.showAuthenticatedState();
                this.showGSTInterface();
                this.closeAuthModal();
                this.showSuccessMessage('Login successful!');
            } else {
                this.showErrorMessage(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
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
            gst_number: document.getElementById('signupGST').value.trim(),
            password: document.getElementById('signupPassword').value,
            confirmPassword: document.getElementById('signupConfirmPassword').value
        };

        console.log('Form data being sent:', formData);

        // Validate required fields
        if (!formData.gst_number) {
            this.showErrorMessage('GST Number is required');
            return;
        }

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            this.showErrorMessage('Passwords do not match');
            return;
        }

        try {
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
        // If Firebase is available, use it; otherwise fall back to local backend
        if (this.firebase) {
            try {
                const { auth, signInWithEmailAndPassword, db, doc, updateDoc, serverTimestamp, getDoc } = this.firebase;
                const cred = await signInWithEmailAndPassword(auth, email, password);
                const uid = cred.user.uid;
                // Stamp last_login on login (server time)
                try {
                    await updateDoc(doc(db, 'users', uid), { last_login: serverTimestamp() });
                } catch (e) {
                    console.warn('Could not update last_login:', e?.message || e);
                }
                // Reload profile from Firestore to pick the latest timestamps
                let profile = await this.getUserProfileFromFirestore(uid);
                if (!profile) {
                    // Fallback to immediate fetch if helper returned null due to race
                    try {
                        const snap = await getDoc(doc(db, 'users', uid));
                        profile = snap.exists() ? snap.data() : null;
                    } catch (_) {}
                }
                if (!profile) {
                    return { success: false, message: 'Profile not found in Firestore. Please contact support.' };
                }
                // Normalize Firestore Timestamp to milliseconds
                const createdAtMs = profile.created_at && typeof profile.created_at.toDate === 'function'
                    ? profile.created_at.toDate().getTime() : (profile.created_at || null);
                const lastLoginMs = profile.last_login && typeof profile.last_login.toDate === 'function'
                    ? profile.last_login.toDate().getTime() : (profile.last_login || null);

                const user = {
                    uid,
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    email: profile.email || email,
                    phone: profile.phone || '',
                    company: profile.company || '',
                    gst_number: profile.gst_number || '',
                    created_at: createdAtMs,
                    last_login: lastLoginMs
                };
                // Maintain previous session token key for compatibility
                localStorage.setItem('gst_session_token', 'firebase');
                return { success: true, user };
            } catch (error) {
                console.error('Firebase login error:', error);
                return { success: false, message: error.message };
            }
        }

        // Fallback to existing backend
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
                localStorage.setItem('gst_session_token', result.session_token);
            }
            return result;
        } catch (error) {
            return { success: false, message: 'Network error: ' + error.message };
        }
    }

    async registerUser(userData) {
        // If Firebase is available, create auth user and profile doc
        if (this.firebase) {
            try {
                const { auth, createUserWithEmailAndPassword } = this.firebase;
                const cred = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
                const uid = cred.user.uid;
                const profile = {
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email,
                    phone: userData.phone,
                    company: userData.company,
                    gst_number: userData.gst_number
                };
                const ok = await this.createUserProfileInFirestore(uid, profile);
                if (!ok) throw new Error('Failed to save profile');
                return { success: true };
            } catch (error) {
                console.error('Firebase register error:', error);
                return { success: false, message: error.message };
            }
        }

        // Fallback to existing backend
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Network error: ' + error.message };
        }
    }

    async handleLogout() {
        try {
            // Close profile modal if open
            this.closeProfileModal();

            if (this.firebase) {
                const { auth, signOut } = this.firebase;
                await signOut(auth);
            } else {
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
            }

            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('gst_user_session');
            localStorage.removeItem('gst_session_token');
            this.showUnauthenticatedState();
            this.hideGSTInterface();
            this.showAuthWelcome();
            this.showSuccessMessage('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local data even if server request fails
            this.closeProfileModal();
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('gst_user_session');
            localStorage.removeItem('gst_session_token');
            this.showUnauthenticatedState();
            this.hideGSTInterface();
            this.showAuthWelcome();
            this.showSuccessMessage('Logged out successfully');
        }
    }

    closeProfileModal() {
        const profileModal = document.getElementById('userProfileModal');
        if (profileModal) {
            const modal = bootstrap.Modal.getInstance(profileModal);
            if (modal) {
                modal.hide();
            }
        }
    }

    showAuthenticatedState() {
        // Hide login button, show user profile
        const loginBtn = document.getElementById('loginBtn');
        const userProfileSection = document.getElementById('userProfileSection');
        const userDisplayName = document.getElementById('userDisplayName');
        
        console.log('showAuthenticatedState called');
        console.log('loginBtn element:', loginBtn);
        console.log('userProfileSection element:', userProfileSection);
        console.log('userDisplayName element:', userDisplayName);
        console.log('currentUser:', this.currentUser);
        
        if (loginBtn) {
            loginBtn.classList.add('d-none');
            console.log('Login button hidden');
        } else {
            console.error('Login button not found!');
        }
        
        if (userProfileSection) {
            userProfileSection.classList.remove('d-none');
            console.log('User profile section shown');
        } else {
            console.error('User profile section not found!');
        }
        
        if (userDisplayName && this.currentUser) {
            userDisplayName.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            console.log('User display name updated');
        } else {
            console.error('User display name element not found or no current user!');
        }
        
        // Auto-populate GSTIN field with user's GST number and make it readonly
        if (this.currentUser && this.currentUser.gst_number) {
            const gstinField = document.getElementById('gstin');
            if (gstinField) {
                gstinField.value = this.currentUser.gst_number;
                gstinField.readOnly = true;
                gstinField.style.backgroundColor = '#f8f9fa';
                gstinField.style.cursor = 'not-allowed';
                console.log('GSTIN field populated with:', this.currentUser.gst_number);
            }
        }
        
        console.log('Authentication state updated - user profile should be visible');
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
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
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
    }

    showLoginFirstFlow() {
        // Hide main GST interface initially unless authenticated
        if (!this.isAuthenticated) {
            this.hideGSTInterface();
            this.showAuthWelcome();
        } else {
            this.showGSTInterface();
        }
    }

    hideGSTInterface() {
        // Hide all rows except header row
        const allRows = document.querySelectorAll('.container .row');
        allRows.forEach((row, index) => {
            // Keep first row (header) visible, hide everything else
            if (index > 0 && !row.id?.includes('authWelcome')) {
                row.style.display = 'none';
            }
        });
        
        // Also hide specific sections
        const sectionsToHide = ['#progressSection', '#results'];
        sectionsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    showGSTInterface() {
        // Show main GST sections by class and ID
        const sectionsToShow = [
            'div.row:has(.card .card-header h5:contains("Configuration"))',
            'div.row:has(.card .card-header h5:contains("Amazon MTR Reports"))',
            'div.row:has(.card .card-header h5:contains("Meesho Reports"))',
            'div.row:has(#processBtn)',
            'div.row:has(h3:contains("Features"))',
            'div.row:has(h3:contains("Simple Pricing"))'
        ];
        
        // Alternative approach - show all rows except header and welcome
        const allRows = document.querySelectorAll('.container .row');
        allRows.forEach((row, index) => {
            // Skip first row (header) and welcome row
            if (index > 0 && !row.id?.includes('authWelcome')) {
                row.style.display = '';
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

    showUserProfile() {
        // Populate profile data
        this.populateProfileData();
        
        // Show profile view and hide other forms
        this.showProfileView();
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
    }

    populateProfileData() {
        if (this.currentUser) {
            document.getElementById('profileFullName').textContent = 
                `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            document.getElementById('profileEmail').textContent = this.currentUser.email;
            document.getElementById('profileFullNameDetail').textContent = 
                `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            // Business info
            document.getElementById('profileEmailDetail').textContent = this.currentUser.email || '-';
            document.getElementById('profilePhone').textContent = this.currentUser.phone || '-';
            document.getElementById('profileCompany').textContent = this.currentUser.company || '-';
            document.getElementById('profileGST').textContent = this.currentUser.gst_number || 'Not provided';

            // Dates: created_at (Member Since) and last_login
            const createdAtValue = this.currentUser.created_at;
            const createdAtDate = createdAtValue && typeof createdAtValue.toDate === 'function'
                ? createdAtValue.toDate() : (createdAtValue ? new Date(createdAtValue) : null);
            const memberSince = createdAtDate ? createdAtDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
            document.getElementById('profileMemberSince').textContent = memberSince;

            const lastLoginValue = this.currentUser.last_login;
            const lastLoginDate = lastLoginValue && typeof lastLoginValue.toDate === 'function'
                ? lastLoginValue.toDate() : (lastLoginValue ? new Date(lastLoginValue) : null);
            const lastLoginStr = lastLoginDate ? lastLoginDate.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }) : 'N/A';
            document.getElementById('profileLastLogin').textContent = lastLoginStr;
        }
    }

    showProfileView() {
        document.getElementById('profileView').style.display = 'block';
        document.getElementById('editProfileForm').style.display = 'none';
        document.getElementById('changePasswordForm').style.display = 'none';
    }

    showEditProfile() {
        // Populate edit form with current data
        if (this.currentUser) {
            document.getElementById('editFirstName').value = this.currentUser.first_name;
            document.getElementById('editLastName').value = this.currentUser.last_name;
            document.getElementById('editPhone').value = this.currentUser.phone;
            document.getElementById('editCompany').value = this.currentUser.company;
            document.getElementById('editGST').value = this.currentUser.gst_number || '';
        }
        
        document.getElementById('profileView').style.display = 'none';
        document.getElementById('editProfileForm').style.display = 'block';
        document.getElementById('changePasswordForm').style.display = 'none';
    }

    showChangePassword() {
        // Clear password form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        
        document.getElementById('profileView').style.display = 'none';
        document.getElementById('editProfileForm').style.display = 'none';
        document.getElementById('changePasswordForm').style.display = 'block';
    }

    async handleEditProfile() {
        const formData = {
            first_name: document.getElementById('editFirstName').value.trim(),
            last_name: document.getElementById('editLastName').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            company: document.getElementById('editCompany').value.trim()
        };

        try {
            const response = await this.updateUserProfile(formData);
            
            if (response.success) {
                // Show user profile section
                document.getElementById('userProfileSection').classList.remove('d-none');
                document.getElementById('loginBtn').style.display = 'none';
                
                // Update display name
                document.getElementById('userDisplayName').textContent = 
                    `${this.currentUser.first_name} ${this.currentUser.last_name}`;
                
                // Auto-populate GSTIN field with user's GST number and make it readonly
                if (this.currentUser.gst_number) {
                    const gstinField = document.getElementById('gstin');
                    if (gstinField) {
                        gstinField.value = this.currentUser.gst_number;
                        gstinField.readOnly = true;
                        gstinField.style.backgroundColor = '#f8f9fa';
                        gstinField.style.cursor = 'not-allowed';
                    }
                }
                
                this.showSuccessMessage('Profile updated successfully!');
                this.populateProfileData();
                this.showProfileView();
            } else {
                this.showErrorMessage(response.message || 'Failed to update profile');
            }
        } catch (error) {
            this.showErrorMessage('Error updating profile: ' + error.message);
        }
    }

    async handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Validate passwords match
        if (newPassword !== confirmNewPassword) {
            this.showErrorMessage('New passwords do not match');
            return;
        }

        // Validate password strength
        if (newPassword.length < 6) {
            this.showErrorMessage('New password must be at least 6 characters long');
            return;
        }

        try {
            const response = await this.changeUserPassword({
                current_password: currentPassword,
                new_password: newPassword
            });
            
            if (response.success) {
                this.showSuccessMessage('Password changed successfully!');
                this.showProfileView();
            } else {
                this.showErrorMessage(response.message || 'Failed to change password');
            }
        } catch (error) {
            this.showErrorMessage('Error changing password: ' + error.message);
        }
    }

    async updateUserProfile(profileData) {
        try {
            const sessionToken = localStorage.getItem('gst_session_token');
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify(profileData)
            });
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                message: 'Network error: ' + error.message
            };
        }
    }

    async changeUserPassword(passwordData) {
        try {
            const sessionToken = localStorage.getItem('gst_session_token');
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify(passwordData)
            });
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                message: 'Network error: ' + error.message
            };
        }
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
