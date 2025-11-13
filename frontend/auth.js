// Authentication Handler for AIVIA Platform

class AuthManager {
    constructor() {
        this.apiUrl = 'http://localhost:8000/api/auth';
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // DOM Elements for Authentication UI
        this.loginTab = document.getElementById('login-tab');
        this.registerTab = document.getElementById('register-tab');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginFormEl = document.getElementById('login-form-element');
        this.registerFormEl = document.getElementById('register-form-element');
        this.loginError = document.getElementById('login-error');
        this.registerError = document.getElementById('register-error');
        this.guestContinue = document.getElementById('guest-continue');
        
        // Initialize event listeners
        this.init();
        
        // Check if user is already logged in
        this.checkAuthStatus();
    }
    
    init() {
        // Tab switching
        this.loginTab.addEventListener('click', () => this.switchTab('login'));
        this.registerTab.addEventListener('click', () => this.switchTab('register'));
        
        // Form submissions
        this.loginFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        this.registerFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Guest access
        this.guestContinue.addEventListener('click', () => {
            this.proceedAsGuest();
        });
    }
    
    switchTab(tab) {
        if (tab === 'login') {
            this.loginTab.classList.add('active');
            this.registerTab.classList.remove('active');
            this.loginForm.classList.add('active');
            this.registerForm.classList.remove('active');
        } else {
            this.loginTab.classList.remove('active');
            this.registerTab.classList.add('active');
            this.loginForm.classList.remove('active');
            this.registerForm.classList.add('active');
        }
    }
    
    async handleLogin() {
        this.loginError.textContent = '';
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.loginError.textContent = 'Please enter both username and password.';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // Important for cookies
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Login failed. Please try again.');
            }
            
            this.isAuthenticated = true;
            this.currentUser = data.user;
            
            // Proceed to role selection
            this.showRoleSelection();
            
        } catch (error) {
            this.loginError.textContent = error.message;
        }
    }
    
    async handleRegister() {
        this.registerError.textContent = '';
        
        const email = document.getElementById('register-email').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        if (!email || !username || !password) {
            this.registerError.textContent = 'Please fill out all fields.';
            return;
        }
        
        if (password.length < 8) {
            this.registerError.textContent = 'Password must be at least 8 characters.';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password }),
                credentials: 'include' // Important for cookies
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Registration failed. Please try again.');
            }
            
            this.isAuthenticated = true;
            this.currentUser = data.user;
            
            // Proceed to role selection
            this.showRoleSelection();
            
        } catch (error) {
            this.registerError.textContent = error.message;
        }
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/me`, {
                method: 'GET',
                credentials: 'include' // Important for cookies
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = true;
                this.currentUser = data;
                
                // If user is already authenticated, skip to role selection
                this.showRoleSelection();
            }
        } catch (error) {
            console.log('Not authenticated:', error.message);
        }
    }
    
    proceedAsGuest() {
        // Just proceed without authentication
        this.showRoleSelection();
    }
    
    showRoleSelection() {
        // Hide auth screen and show role selection
        document.getElementById('authentication').classList.remove('active');
        document.getElementById('role-selection').classList.add('active');
        
        // Update header if user is logged in
        if (this.isAuthenticated && this.currentUser) {
            const headerEl = document.querySelector('.header-content');
            
            // Create user info element if not exists
            if (!document.getElementById('user-info')) {
                const userInfo = document.createElement('div');
                userInfo.id = 'user-info';
                userInfo.classList.add('user-info');
                
                const userName = document.createElement('span');
                userName.textContent = `Hello, ${this.currentUser.username}`;
                
                const logoutBtn = document.createElement('button');
                logoutBtn.textContent = 'Logout';
                logoutBtn.classList.add('btn-logout');
                logoutBtn.addEventListener('click', () => this.handleLogout());
                
                userInfo.appendChild(userName);
                userInfo.appendChild(logoutBtn);
                
                headerEl.appendChild(userInfo);
            }
        }
    }
    
    async handleLogout() {
        try {
            await fetch(`${this.apiUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.isAuthenticated = false;
            this.currentUser = null;
            
            // Refresh the page to reset state
            window.location.reload();
            
        } catch (error) {
            console.error('Logout failed:', error.message);
        }
    }
}

// Initialize auth manager when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});