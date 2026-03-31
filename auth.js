class Auth {
    constructor() {
        this.init();
    }

    init() {
        const path = window.location.pathname;
        const isAuthPage = path.includes('login.html') || path.includes('register.html');
        const isProtected = !isAuthPage;

        if (API.isLoggedIn() && isAuthPage) {
            window.location.href = '/index.html';
            return;
        }
        if (!API.isLoggedIn() && isProtected) {
            window.location.href = '/login.html';
            return;
        }

        if (document.getElementById('registerForm')) {
            document.getElementById('registerForm').addEventListener('submit', e => this.handleRegister(e));
        }
        if (document.getElementById('loginForm')) {
            document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));
        }
        if (document.getElementById('logoutBtn')) {
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        }

        const toggle = document.getElementById('togglePassword');
        const pwInput = document.getElementById('regPassword');
        if (toggle && pwInput) {
            toggle.addEventListener('click', () => {
                const isPass = pwInput.type === 'password';
                pwInput.type = isPass ? 'text' : 'password';
                toggle.textContent = isPass ? '🙈' : '👁';
            });
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        clearTimeout(this._t);
        this._t = setTimeout(() => toast.classList.remove('show'), 3200);
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        const btn = e.target.querySelector('button[type=submit]');

        btn.disabled = true;
        btn.textContent = 'Creating account…';
        try {
            const { token, user } = await API.auth.register(name, email, password);
            API.setSession(token, user);
            this.showToast('Account created! Setting up profile…', 'success');
            setTimeout(() => { window.location.href = '/profile.html'; }, 1000);
        } catch (err) {
            this.showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const btn = e.target.querySelector('button[type=submit]');

        btn.disabled = true;
        btn.textContent = 'Signing in…';
        try {
            const { token, user } = await API.auth.login(email, password);
            API.setSession(token, user);
            this.showToast('Welcome back!', 'success');
            setTimeout(() => { window.location.href = '/index.html'; }, 900);
        } catch (err) {
            this.showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    }

    logout() {
        API.clearSession();
        window.location.href = '/login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => { new Auth(); });
