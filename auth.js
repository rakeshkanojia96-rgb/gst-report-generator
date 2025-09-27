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

    // Settings: Theme + Email notifications
    bindSettings() {
        // Open modal
        document.getElementById('openSettings')?.addEventListener('click', (e) => {
            e.preventDefault();
            // load current prefs
            const prefs = this.loadPrefs();
            const themeToggle = document.getElementById('themeToggle');
            const emailToggle = document.getElementById('emailNotifToggle');
            if (themeToggle) themeToggle.checked = (prefs.theme === 'dark');
            if (emailToggle) emailToggle.checked = !!prefs.email_notifications;
            const m = new bootstrap.Modal(document.getElementById('settingsModal'));
            m.show();
        });

        // Save
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const themeToggle = document.getElementById('themeToggle');
            const emailToggle = document.getElementById('emailNotifToggle');
            const prefs = {
                theme: themeToggle?.checked ? 'dark' : 'light',
                email_notifications: !!emailToggle?.checked
            };
            this.applyTheme(prefs.theme);
            this.savePrefs(prefs);
            // persist to Firestore when logged in
            if (this.firebase && this.currentUser?.uid) {
                try {
                    const { db, doc, updateDoc } = this.firebase;
                    await updateDoc(doc(db, 'users', this.currentUser.uid), { preferences: prefs });
                } catch (e) { console.warn('Failed to persist preferences', e); }
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            if (modal) modal.hide();
            this.showSuccessMessage('Settings saved');
        });

        // Apply theme from saved prefs on startup
        const existing = this.loadPrefs();
        this.applyTheme(existing.theme || 'light');
    }

    loadPrefs() {
        try {
            const raw = localStorage.getItem('gst_prefs');
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    savePrefs(p) {
        try { localStorage.setItem('gst_prefs', JSON.stringify(p)); } catch {}
    }

    applyTheme(theme) {
        const body = document.body;
        if (!body) return;
        body.classList.remove('theme-light', 'theme-dark', 'bg-dark', 'text-white');
        if (theme === 'dark') {
            body.classList.add('theme-dark', 'bg-dark', 'text-white');
            // Let CSS control readonly GSTIN styles in dark mode
            const gstin = document.getElementById('gstin');
            if (gstin && gstin.readOnly) {
                gstin.style.backgroundColor = '';
                gstin.style.color = '';
                gstin.style.cursor = 'not-allowed';
            }
        } else {
            body.classList.add('theme-light');
            // Keep a subtle light readonly appearance in light mode
            const gstin = document.getElementById('gstin');
            if (gstin && gstin.readOnly) {
                gstin.style.backgroundColor = '#f8f9fa';
                gstin.style.color = '';
                gstin.style.cursor = 'not-allowed';
            }
        }
    }

    // Trial utilities
    updateTrialUI() {
        try {
            const banner = document.getElementById('trialStatusBanner');
            const processBtn = document.getElementById('processBtn');
            const amazonUpload = document.getElementById('amazonUpload');
            const meeshoUpload = document.getElementById('meeshoUpload');
            const startTrialBtn = document.getElementById('startTrialBtn');
            const subscribeBtn = document.getElementById('subscribeBtn');
            const trialCtaNote = document.getElementById('trialCtaNote');
            if (!banner) return;

            const now = Date.now();
            // If subscribed and still valid, show subscription status and enable everything
            if (this.currentUser?.subscription_status === 'active' && Number(this.currentUser.subscription_until || 0) > now) {
                const until = new Date(Number(this.currentUser.subscription_until));
                banner.className = 'alert alert-success';
                banner.innerHTML = `<i class="fas fa-check-circle"></i> Subscription active until ${until.toLocaleDateString()}. Thank you!`;
                if (processBtn) processBtn.disabled = false;
                if (amazonUpload) amazonUpload.style.pointerEvents = '';
                if (meeshoUpload) meeshoUpload.style.pointerEvents = '';
                if (startTrialBtn) startTrialBtn.classList.add('d-none');
                if (subscribeBtn) subscribeBtn.classList.add('d-none');
                if (trialCtaNote) trialCtaNote.classList.add('d-none');
                return;
            }

            const end = this.currentUser?.trial_end ? Number(this.currentUser.trial_end) : null;
            if (!end) {
                banner.className = 'alert alert-info';
                banner.innerHTML = '<strong>Free trial</strong>: Start your 15-day trial — click "Start Free Trial" below.';
                if (startTrialBtn) startTrialBtn.classList.remove('d-none');
                if (subscribeBtn) subscribeBtn.classList.add('d-none');
                if (trialCtaNote) trialCtaNote.classList.remove('d-none');
                // Gate features until trial starts or subscription becomes active
                if (processBtn) processBtn.disabled = true;
                if (amazonUpload) amazonUpload.style.pointerEvents = 'none';
                if (meeshoUpload) meeshoUpload.style.pointerEvents = 'none';
                return;
            }
            const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            if (end > now) {
                banner.className = 'alert alert-success';
                banner.innerHTML = `<i class="fas fa-gift"></i> Free trial active — ${daysLeft} day(s) left. <a href="#" id="bannerSubscribeLink" class="alert-link">Subscribe now</a>.`;
                if (processBtn) processBtn.disabled = false;
                if (amazonUpload) amazonUpload.classList.remove('disabled');
                if (meeshoUpload) meeshoUpload.classList.remove('disabled');
                if (startTrialBtn) startTrialBtn.classList.add('d-none');
                if (subscribeBtn) subscribeBtn.classList.remove('d-none');
                if (trialCtaNote) trialCtaNote.classList.add('d-none');
            } else {
                banner.className = 'alert alert-danger';
                banner.innerHTML = `Your free trial has expired. <a href="#" id="bannerSubscribeLink" class="alert-link">Subscribe now</a> to continue using the service.`;
                if (processBtn) processBtn.disabled = true;
                if (amazonUpload) amazonUpload.style.pointerEvents = 'none';
                if (meeshoUpload) meeshoUpload.style.pointerEvents = 'none';
                if (startTrialBtn) startTrialBtn.classList.add('d-none');
                if (subscribeBtn) subscribeBtn.classList.remove('d-none');
                if (trialCtaNote) trialCtaNote.classList.add('d-none');
            }
            // Wire banner subscribe link and button to modal
            const link = document.getElementById('bannerSubscribeLink');
            if (link) link.onclick = (e) => { e.preventDefault(); new bootstrap.Modal(document.getElementById('subscribeModal')).show(); };
            if (subscribeBtn) subscribeBtn.onclick = () => new bootstrap.Modal(document.getElementById('subscribeModal')).show();
        } catch (e) {
            console.warn('updateTrialUI error', e);
        }
    }

    bindRazorpay() {
        const payBtn = document.getElementById('payNowBtn');
        if (!payBtn) return;
        payBtn.onclick = async () => {
            const keyId = (typeof RAZORPAY !== 'undefined' && RAZORPAY.KEY_ID) || (window.RAZORPAY && window.RAZORPAY.KEY_ID);
            if (!keyId) {
                this.showErrorMessage('Razorpay Key ID not configured');
                return;
            }
            const amountPaise = 1200 * 100; // ₹1200
            // 1) Create order on backend
            let orderId = null;
            try {
                const res = await fetch((window.API_BASE || '') + '/api/payments/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: 'yearly_plan' })
                });
                const data = await res.json();
                if (!res.ok || !data || !data.id) throw new Error(data?.message || 'Could not create order');
                orderId = data.id;
            } catch (e) {
                this.showErrorMessage('Failed to create payment order: ' + (e?.message || e));
                return;
            }

            const options = {
                key: keyId,
                amount: amountPaise,
                currency: 'INR',
                name: 'GST Report Generator',
                description: 'Yearly Subscription',
                order_id: orderId,
                handler: async (response) => {
                    try {
                        // 2) Verify signature on backend first
                        const verifyRes = await fetch((window.API_BASE || '') + '/api/payments/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (!verifyData?.verified) {
                            this.showErrorMessage('Payment could not be verified. Please contact support.');
                            return;
                        }
                        // 3) Mark subscription active locally and in Firestore
                        const now = Date.now();
                        const until = now + 365 * 24 * 60 * 60 * 1000;
                        this.currentUser.subscription_status = 'active';
                        this.currentUser.subscription_plan = 'yearly';
                        this.currentUser.subscription_until = until;
                        localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
                        if (this.firebase && this.currentUser.uid) {
                            try {
                                const { db, doc, updateDoc } = this.firebase;
                                await updateDoc(doc(db, 'users', this.currentUser.uid), {
                                    subscription_status: 'active',
                                    subscription_plan: 'yearly',
                                    subscription_until: until,
                                    last_payment_id: response.razorpay_payment_id || null
                                });
                            } catch (e) { console.warn('Persist subscription failed', e); }
                        }
                        this.updateTrialUI();
                        this.showSuccessMessage('Payment successful. Subscription activated.');
                        const modal = bootstrap.Modal.getInstance(document.getElementById('subscribeModal'));
                        if (modal) modal.hide();
                    } catch (e) {
                        this.showErrorMessage('Failed to activate subscription: ' + (e?.message || e));
                    }
                },
                prefill: {
                    name: `${this.currentUser?.first_name || ''} ${this.currentUser?.last_name || ''}`.trim() || undefined,
                    email: this.currentUser?.email || undefined,
                    contact: this.currentUser?.phone || undefined
                },
                notes: {
                    user_email: this.currentUser?.email || '',
                    plan: 'yearly'
                },
                theme: { color: '#0d6efd' }
            };
            try {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } catch (e) {
                this.showErrorMessage('Unable to open payment window: ' + (e?.message || e));
            }
        };
    }

    async handleAvatarRemove() {
        // Clear local state and persisted session; keep Cloudinary asset (no credentials to delete)
        this.currentUser.photoURL = '';
        try {
            localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
            if (this.currentUser?.email) {
                localStorage.removeItem(`gst_photo_by_email:${this.currentUser.email}`);
            }
        } catch {}
        this.populateProfileData();
        this.showSuccessMessage('Profile photo removed');
    }

    async savePhotoURL(photoURL) {
        const sessionToken = localStorage.getItem('gst_session_token');
        // Attempt 1: JSON PUT to existing profile endpoint
        try {
            const putResp = await fetch((window.API_BASE || '') + '/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
                },
                body: JSON.stringify({ photoURL })
            });
            if (putResp.ok) return this.persistPhotoURLLocally(photoURL);
            if (putResp.status !== 415 && putResp.status !== 405 && putResp.status !== 501) {
                // if other error, surface json if available
                try { const d = await putResp.json(); console.warn('PUT profile response', d); } catch {}
            }
        } catch (e) { /* swallow and try fallback */ }

        // Attempt 2: multipart/form-data POST fallback
        try {
            const fd = new FormData();
            fd.append('photoURL', photoURL);
            const postResp = await fetch((window.API_BASE || '') + '/api/auth/profile', {
                method: 'POST',
                headers: {
                    ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
                },
                body: fd
            });
            if (postResp.ok) return this.persistPhotoURLLocally(photoURL);
        } catch (e) {
            // ignore
        }
        // Final fallback: persist locally so avatar survives reloads
        return this.persistPhotoURLLocally(photoURL);
    }

    persistPhotoURLLocally(photoURL) {
        try {
            this.currentUser = { ...this.currentUser, photoURL };
            localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
            if (this.currentUser?.email) {
                localStorage.setItem(`gst_photo_by_email:${this.currentUser.email}`, photoURL);
            }
            return true;
        } catch (_) { return false; }
    }

    bindProfilePhotoEvents() {
        const changeBtn = document.getElementById('changePhotoBtn');
        const avatar = document.getElementById('profileAvatar');
        const input = document.getElementById('profilePhotoInput');
        const removeBtn = document.getElementById('removePhotoBtn');

        if (changeBtn && input) {
            changeBtn.onclick = () => input.click();
        }
        if (avatar && input) {
            avatar.onclick = () => input.click();
        }
        if (input) {
            input.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    // simple progress: disable controls during upload
                    if (changeBtn) { changeBtn.disabled = true; changeBtn.textContent = 'Uploading...'; }
                    if (removeBtn) removeBtn.disabled = true;
                    await this.handleAvatarUpload(file);
                } finally {
                    if (changeBtn) { changeBtn.disabled = false; changeBtn.textContent = 'Change Photo'; }
                    if (removeBtn) removeBtn.disabled = false;
                }
                // reset input to allow same file re-upload
                e.target.value = '';
            };
        }
        if (removeBtn) {
            removeBtn.onclick = async () => {
                await this.handleAvatarRemove();
            };
        }
    }

    async handleAvatarUpload(file) {
        try {
            if (file.size > 2 * 1024 * 1024) {
                this.showErrorMessage('Image must be under 2MB');
                return;
            }
            const allowed = ['image/png','image/jpeg','image/jpg','image/webp'];
            if (!allowed.includes(file.type)) {
                this.showErrorMessage('Only PNG, JPG, or WebP images are allowed');
                return;
            }

            // Cloudinary unsigned upload
            const cloud = window?.CLOUDINARY || (window?.AppEnv && window.AppEnv.CLOUDINARY);
            const localEnv = (typeof CLOUDINARY !== 'undefined') ? CLOUDINARY : null;
            const CLOUD_NAME = localEnv?.CLOUD_NAME || cloud?.CLOUD_NAME;
            const UPLOAD_PRESET = localEnv?.UPLOAD_PRESET || cloud?.UPLOAD_PRESET;
            const FOLDER = localEnv?.FOLDER || cloud?.FOLDER || 'gst-report-generator/avatars';
            if (!CLOUD_NAME || !UPLOAD_PRESET) {
                this.showErrorMessage('Cloudinary is not configured');
                return;
            }

            const form = new FormData();
            form.append('file', file);
            form.append('upload_preset', UPLOAD_PRESET);
            form.append('folder', FOLDER);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: form
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            const photoURL = data.secure_url;

            // Persist in backend profile (best-effort)
            try {
                await this.savePhotoURL(photoURL);
            } catch (e) { console.warn('Backend savePhotoURL failed', e); }

            // Update local UI
            this.currentUser.photoURL = photoURL;
            this.populateProfileData();
            this.showSuccessMessage('Profile photo updated');
        } catch (err) {
            this.showErrorMessage('Failed to upload photo: ' + err.message);
        }
    }

    initializeAuth() {
        // Check for existing session
        this.checkExistingSession();
        this.setupAuthUI();
        this.bindAuthEvents();
        this.bindProfilePhotoEvents();
        this.bindRazorpay();
        this.bindSettings();
        // Start Free Trial button opens signup with trial note
        document.getElementById('startTrialBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('authModal'));
            modal.show();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
            document.getElementById('trialNote')?.classList.remove('d-none');
            document.getElementById('authModalTitle').textContent = 'Create Account — 15-day Free Trial';
        });
        // Top-right Login button should always show Login form first
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                try {
                    const modalEl = document.getElementById('authModal');
                    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                    document.getElementById('signupForm').style.display = 'none';
                    document.getElementById('loginForm').style.display = 'block';
                    document.getElementById('trialNote')?.classList.add('d-none');
                    document.getElementById('authModalTitle').textContent = 'Login to GST Generator';
                    modal.show();
                } catch(_) {}
            });
        }
        // Ensure we have a Firebase auth user (anonymous is fine for Storage)
        try {
            if (this.firebase && this.firebase.signInAnonymously) {
                const { auth, signInAnonymously } = this.firebase;
                if (!auth.currentUser) {
                    signInAnonymously(auth).catch(() => {});
                }
            }
        } catch (_) {}
        
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
            await setDoc(doc(db, 'users', uid), { 
                ...profile, 
                created_at: serverTimestamp(),
                // trial & subscription fields start undefined and are added later
                trial_start: null,
                trial_end: null,
                subscription_status: 'none',
                subscription_plan: null,
                subscription_until: null
            });
            return true;
        } catch (e) {
            console.error('Firestore set profile error:', e);
            return false;
        }
    }

    async persistTrialToFirestore(uid, startMs, endMs) {
        if (!this.firebase) return false;
        try {
            const { db, doc, updateDoc } = this.firebase;
            await updateDoc(doc(db, 'users', uid), {
                trial_start: startMs,
                trial_end: endMs
            });
            return true;
        } catch (e) {
            console.warn('Could not persist trial to Firestore:', e?.message || e);
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
                                    <div class="alert alert-info small" id="trialNote">
                                        Enjoy a 15-day free trial. After that, you’ll need a subscription to continue.
                                    </div>
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
                                            I agree to the <a href="./terms.html" target="_blank" rel="noopener">Terms of Service</a> and 
                                            <a href="./privacy.html" target="_blank" rel="noopener">Privacy Policy</a>
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
                                        <div class="profile-avatar mb-2" id="profileAvatar" style="cursor: pointer;">
                                            <i class="fas fa-user-circle fa-5x text-primary"></i>
                                        </div>
                                        <input type="file" id="profilePhotoInput" accept="image/*" style="display:none" />
                                        <div class="d-flex gap-2 justify-content-center">
                                            <button type="button" id="changePhotoBtn" class="btn btn-sm btn-outline-primary">Change Photo</button>
                                            <button type="button" id="removePhotoBtn" class="btn btn-sm btn-outline-danger">Remove</button>
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
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="editGST" placeholder="e.g., 27AACCF6368D1CX" readonly>
                                            <span class="input-group-text" id="editGSTLock" title="Locked">
                                                <i class="fas fa-lock"></i>
                                            </span>
                                        </div>
                                        <div class="form-text">Locked to your account. Contact support to update.</div>
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
        document.getElementById('trialNote')?.classList.remove('d-none');
        document.getElementById('authModalTitle').textContent = 'Create Account — 15-day Free Trial';
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
                // Merge locally saved avatar by email (survives server not persisting photoURL)
                try {
                    if (this.currentUser?.email) {
                        const localPhoto = localStorage.getItem(`gst_photo_by_email:${this.currentUser.email}`);
                        if (localPhoto) this.currentUser.photoURL = localPhoto;
                        // Merge trial info by email
                        const trialMap = localStorage.getItem(`gst_trial_by_email:${this.currentUser.email}`);
                        if (trialMap) {
                            const t = JSON.parse(trialMap);
                            this.currentUser.trial_start = t.trial_start;
                            this.currentUser.trial_end = t.trial_end;
                        } else {
                            // If user has no trial stored locally, start one-time trial now
                            if (!this.currentUser.trial_end) {
                                const now = Date.now();
                                const end = now + 15 * 24 * 60 * 60 * 1000;
                                this.currentUser.trial_start = now;
                                this.currentUser.trial_end = end;
                                localStorage.setItem(`gst_trial_by_email:${this.currentUser.email}`, JSON.stringify({ trial_start: now, trial_end: end }));
                                // Persist trial to Firestore so it follows user across devices
                                if (this.firebase && this.currentUser.uid) {
                                    this.persistTrialToFirestore(this.currentUser.uid, now, end);
                                }
                            }
                        }
                    }
                } catch {}
                this.isAuthenticated = true;
                localStorage.setItem('gst_user_session', JSON.stringify(this.currentUser));
                
                console.log('User authenticated:', this.currentUser);
                console.log('Calling showAuthenticatedState...');
                
                this.showAuthenticatedState();
                this.showGSTInterface();
                this.closeAuthModal();
                this.showSuccessMessage('Login successful!');
                this.updateTrialUI();
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
            console.log('Signup response:', response);
            
            if (response.success) {
                // Registration succeeded. Do NOT log the user in.
                // Show login form with email prefilled and clear any session state.
                this.currentUser = null;
                this.isAuthenticated = false;
                try { localStorage.removeItem('gst_user_session'); } catch {}
                // Switch modal to Login with prefilled email
                const signupEmail = document.getElementById('signupEmail');
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail && signupEmail) loginEmail.value = signupEmail.value.trim();
                this.showLoginForm();
                this.showSuccessMessage('Account created. Please log in to start your 15-day trial.');
            } else {
                const msg = (response.message || '').toLowerCase();
                if (msg.includes('email-already-in-use')) {
                    this.showErrorMessage('This email is already registered. Please log in.');
                    // Switch to login form and prefill email
                    document.getElementById('signupForm').style.display = 'none';
                    document.getElementById('loginForm').style.display = 'block';
                    const emailInput = document.getElementById('loginEmail');
                    const signupEmail = document.getElementById('signupEmail');
                    if (emailInput && signupEmail) emailInput.value = signupEmail.value.trim();
                    document.getElementById('authModalTitle').textContent = 'Login to GST Generator';
                } else {
                    this.showErrorMessage(response.message || 'Signup failed');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showErrorMessage('Signup error: ' + error.message);
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
                // Normalize time fields; tolerate either Timestamp or epoch ms
                const toMs = (v) => (v && typeof v.toDate === 'function') ? v.toDate().getTime() : (v ?? null);
                const createdAtMs = toMs(profile.created_at);
                const lastLoginMs = toMs(profile.last_login);
                const trialStartMs = toMs(profile.trial_start);
                const trialEndMs = toMs(profile.trial_end);
                const subUntilMs = toMs(profile.subscription_until);

                const user = {
                    uid,
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    email: profile.email || email,
                    phone: profile.phone || '',
                    company: profile.company || '',
                    gst_number: profile.gst_number || '',
                    created_at: createdAtMs,
                    last_login: lastLoginMs,
                    trial_start: trialStartMs,
                    trial_end: trialEndMs,
                    subscription_status: profile.subscription_status || 'none',
                    subscription_plan: profile.subscription_plan || null,
                    subscription_until: subUntilMs
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
            const response = await fetch((window.API_BASE || '') + '/api/auth/login', {
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
            const response = await fetch((window.API_BASE || '') + '/api/auth/register', {
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
                    await fetch((window.API_BASE || '') + '/api/auth/logout', {
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
            this.updateTrialUI();
            this.hideGSTInterface();
            this.showAuthWelcome();
            this.showSuccessMessage('Logged out successfully');
            // Soft refresh after a short delay to ensure full UI reset
            setTimeout(() => { try { window.location.reload(); } catch(_) {} }, 500);
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local data even if server request fails
            this.closeProfileModal();
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('gst_user_session');
            localStorage.removeItem('gst_session_token');
            this.showUnauthenticatedState();
            this.updateTrialUI();
            this.hideGSTInterface();
            this.showAuthWelcome();
            this.showSuccessMessage('Logged out successfully');
            setTimeout(() => { try { window.location.reload(); } catch(_) {} }, 500);
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
        // Show user profile section
        document.getElementById('userProfileSection').classList.remove('d-none');
        document.getElementById('loginBtn').style.display = 'none';
        // Update trial UI
        this.updateTrialUI();
        // Update header name and lock GSTIN
        try {
            const name = `${this.currentUser?.first_name || ''} ${this.currentUser?.last_name || ''}`.trim() || 'User';
            const nameEl = document.getElementById('userDisplayName');
            if (nameEl) nameEl.textContent = name;
            const gstinField = document.getElementById('gstin');
            if (gstinField && this.currentUser?.gst_number) {
                gstinField.value = this.currentUser.gst_number;
                gstinField.readOnly = true;
                // Let CSS/theme control colors; just set cursor
                gstinField.style.backgroundColor = '';
                gstinField.style.color = '';
                gstinField.style.cursor = 'not-allowed';
            }
        } catch (_) {}
    }

    showUnauthenticatedState() {
        // Show login button, hide user profile
        document.getElementById('loginBtn')?.classList.remove('d-none');
        document.getElementById('userProfileSection')?.classList.add('d-none');
        // Reset banner and pricing to unauthenticated state
        try {
            this.currentUser = null;
            this.isAuthenticated = false;
            const banner = document.getElementById('trialStatusBanner');
            if (banner) {
                banner.className = 'alert alert-info';
                banner.innerHTML = '<strong>Free trial</strong>: Start your 15-day trial — click "Start Free Trial" below.';
            }
            const startTrialBtn = document.getElementById('startTrialBtn');
            const subscribeBtn = document.getElementById('subscribeBtn');
            if (startTrialBtn) startTrialBtn.classList.remove('d-none');
            if (subscribeBtn) subscribeBtn.classList.add('d-none');
            const pricingTitle = document.getElementById('pricingTitle');
            const pricingSubtitle = document.getElementById('pricingSubtitle');
            const pricingPlanName = document.getElementById('pricingPlanName');
            const pricingHeader = document.getElementById('pricingCardHeader');
            const trialCtaNote = document.getElementById('trialCtaNote');
            const activePlanBadge = document.getElementById('activePlanBadge');
            if (pricingTitle) pricingTitle.textContent = 'Simple Yearly Pricing';
            if (pricingPlanName) pricingPlanName.textContent = 'Yearly Plan — ₹1200/year';
            if (pricingSubtitle) pricingSubtitle.innerHTML = '';
            if (trialCtaNote) trialCtaNote.classList.remove('d-none');
            if (pricingHeader) { pricingHeader.classList.remove('bg-success','bg-secondary'); pricingHeader.classList.add('bg-primary'); }
            if (activePlanBadge) activePlanBadge.classList.add('d-none');
        } catch (_) {}
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
            // Avatar
            const avatar = document.getElementById('profileAvatar');
            if (avatar) {
                if (this.currentUser.photoURL) {
                    avatar.innerHTML = `<img src="${this.currentUser.photoURL}" alt="avatar" width="96" height="96" class="rounded-circle object-fit-cover" />`;
                } else {
                    avatar.innerHTML = '<i class="fas fa-user-circle fa-5x text-primary"></i>';
                }
            }
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
        // ensure avatar events are bound (DOM may be recreated only once, but safe to re-bind)
        this.bindProfilePhotoEvents();
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
            const file = document.getElementById('editPhoto').files?.[0];

            if (this.firebase && this.currentUser?.uid) {
                const { db, doc, updateDoc, storage, ref, uploadBytes, getDownloadURL } = this.firebase;

                // If a new photo selected, upload to Storage and get URL
                let photoURL = this.currentUser.photoURL || '';
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        this.showErrorMessage('Image must be under 2MB');
                        return;
                    }
                    const pathRef = ref(storage, `user_avatars/${this.currentUser.uid}/profile.jpg`);
                    await uploadBytes(pathRef, file, { contentType: file.type });
                    photoURL = await getDownloadURL(pathRef);
                }

                const updatePayload = { ...formData };
                if (file) updatePayload.photoURL = photoURL;

                await updateDoc(doc(db, 'users', this.currentUser.uid), updatePayload);

                // Update local state
                this.currentUser = { ...this.currentUser, ...updatePayload };

                // Update UI
                document.getElementById('userProfileSection').classList.remove('d-none');
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.style.display = 'none';
                document.getElementById('userDisplayName').textContent = 
                    `${this.currentUser.first_name} ${this.currentUser.last_name}`;

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
                return;
            }

            // Fallback to existing backend
            const response = await this.updateUserProfile(formData);
            if (response.success) {
                document.getElementById('userProfileSection').classList.remove('d-none');
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.style.display = 'none';
                document.getElementById('userDisplayName').textContent = 
                    `${this.currentUser.first_name} ${this.currentUser.last_name}`;
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
            const response = await fetch((window.API_BASE || '') + '/api/auth/profile', {
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
            const response = await fetch((window.API_BASE || '') + '/api/auth/change-password', {
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
