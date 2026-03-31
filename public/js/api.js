const API = (() => {
    const BASE = '/api';

    function getToken()  { return localStorage.getItem('nt_token') || ''; }
    function getUser()   { try { return JSON.parse(localStorage.getItem('nt_user')); } catch { return null; } }
    function isLoggedIn(){ return !!getToken() && !!getUser(); }

    function setSession(token, user) {
        localStorage.setItem('nt_token', token);
        localStorage.setItem('nt_user', JSON.stringify(user));
    }
    function clearSession() {
        localStorage.removeItem('nt_token');
        localStorage.removeItem('nt_user');
    }

    async function request(method, path, body = null, isFormData = false) {
        const headers = { Authorization: `Bearer ${getToken()}` };
        if (!isFormData) headers['Content-Type'] = 'application/json';
        const opts = { method, headers };
        if (body) opts.body = isFormData ? body : JSON.stringify(body);
        const res  = await fetch(BASE + path, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
    }

    return {
        getToken, setSession, clearSession, getUser, isLoggedIn,

        auth: {
            register: (name, email, password) =>
                request('POST', '/auth/register', { name, email, password }),
            login: (email, password) =>
                request('POST', '/auth/login', { email, password }),
            me: () => request('GET', '/auth/me')
        },

        profile: {
            get:  ()     => request('GET', '/profile'),
            save: (data) => request('PUT', '/profile', data)
        },

        foods: {
            list: (params = {}) => {
                const qs = new URLSearchParams(params).toString();
                return request('GET', `/foods${qs ? '?' + qs : ''}`);
            },
            get: (id) => request('GET', `/foods/${id}`)
        },

        logs: {
            get:        (date)                  => request('GET',    `/logs/${date}`),
            add:        (food_item_id, qty, dt) => request('POST',   '/logs', { food_item_id, quantity: qty, log_date: dt }),
            addBatch:   (items, log_date)       => request('POST',   '/logs/batch', { items, log_date }),
            remove:     (id)                    => request('DELETE', `/logs/${id}`),
            weekly:     (date)                  => request('GET',    `/logs/weekly/${date}`)
        },

        analytics: {
            weekly: () => request('GET', '/analytics/weekly'),
            streak: () => request('GET', '/analytics/streak')
        },

        import: {
            upload:           (formData) => request('POST', '/import', formData, true),
            downloadTemplate: () => {
                const a = document.createElement('a');
                a.href = '/api/import/template';
                a.download = 'nutritrack_food_template.xlsx';
                a.click();
            }
        }
    };
})();
