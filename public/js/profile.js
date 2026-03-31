class ProfileManager {
    constructor() {
        if (!API.isLoggedIn()) { window.location.href = '/login.html'; return; }
        this.profile = null;
        this.init();
    }

    async init() {
        this.setupLogout();
        this.setupInputListeners();

        try {
            this.profile = await API.profile.get();
            if (this.profile && this.profile.height_cm) {
                this.loadProfile(this.profile);
            }
        } catch (err) {
            this.showToast('Could not load profile: ' + err.message, 'error');
        }

        document.getElementById('profileForm').addEventListener('submit', e => this.handleSubmit(e));
    }

    setupLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.addEventListener('click', () => { API.clearSession(); window.location.href = '/login.html'; });
    }

    setupInputListeners() {
        ['profileHeight', 'profileWeight', 'profileAge', 'profileGender', 'activityLevel', 'goal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calculateBMI());
        });
    }

    loadProfile(p) {
        const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
        set('profileName', p.name);
        set('profileAge', p.age);
        set('profileHeight', p.height_cm);
        set('profileWeight', p.weight_kg);
        set('profileGender', p.gender);
        set('activityLevel', p.activity_level);
        set('goal', p.goal);
        this.calculateBMI();
    }

    calculateBMI() {
        const height = parseFloat(document.getElementById('profileHeight').value);
        const weight = parseFloat(document.getElementById('profileWeight').value);
        const age    = parseInt(document.getElementById('profileAge').value);
        const gender = document.getElementById('profileGender').value;
        const activity = document.getElementById('activityLevel').value;
        const goal   = document.getElementById('goal').value;

        if (height && weight) {
            const hm = height / 100;
            const bmi = (weight / (hm * hm)).toFixed(1);
            document.getElementById('bmiValue').textContent = bmi;
            let cat = '', cls = '';
            if (bmi < 18.5)      { cat = 'Underweight'; cls = 'warning'; }
            else if (bmi < 25)   { cat = 'Normal weight'; cls = 'success'; }
            else if (bmi < 30)   { cat = 'Overweight'; cls = 'warning'; }
            else                 { cat = 'Obese'; cls = 'danger'; }
            const el = document.getElementById('bmiCategory');
            el.textContent = cat;
            el.className = `bmi-category ${cls}`;
        }

        if (height && weight && age && gender) {
            let bmr = gender === 'male'
                ? 10 * weight + 6.25 * height - 5 * age + 5
                : 10 * weight + 6.25 * height - 5 * age - 161;
            const mults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very-active': 1.9 };
            let tdee = bmr * (mults[activity] || 1.2);
            if (goal === 'lose') tdee -= 500;
            else if (goal === 'gain') tdee += 500;
            document.getElementById('recommendedCalories').textContent = Math.round(tdee);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Saving…';

        const data = {
            name:           document.getElementById('profileName').value.trim(),
            age:            parseInt(document.getElementById('profileAge').value),
            height_cm:      parseFloat(document.getElementById('profileHeight').value),
            weight_kg:      parseFloat(document.getElementById('profileWeight').value),
            gender:         document.getElementById('profileGender').value,
            activity_level: document.getElementById('activityLevel').value,
            goal:           document.getElementById('goal').value
        };

        try {
            await API.profile.save(data);
            this.showToast('Profile saved!', 'success');
            setTimeout(() => { window.location.href = '/index.html'; }, 900);
        } catch (err) {
            this.showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Save Profile & Go to Dashboard';
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
}

document.addEventListener('DOMContentLoaded', () => { new ProfileManager(); });
