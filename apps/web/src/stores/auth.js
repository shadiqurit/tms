import { defineStore } from 'pinia';
import { api } from '../services/api';
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
const demoUser = {
    id: 0,
    name: 'Sadiqur Rahman',
    username: 'sadiq',
    email: 'demo@tms.local',
    role: { id: 0, key: 'programmer', name: 'System Administrator' },
};
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('tms_user') ?? 'null'),
        loading: false,
    }),
    getters: {
        authenticated: (state) => Boolean(state.user && localStorage.getItem('tms_token')),
    },
    actions: {
        async login(login, password, remember = false) {
            this.loading = true;
            try {
                if (demoMode) {
                    await new Promise((resolve) => setTimeout(resolve, 650));
                    if (login.toLowerCase() !== 'demo@tms.local' || password !== 'demo123') {
                        throw new Error('Use the preview credentials shown below the form.');
                    }
                    this.user = demoUser;
                    localStorage.setItem('tms_token', 'demo-session');
                }
                else {
                    const result = await api('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ login, password, remember }),
                    });
                    this.user = result.user;
                    localStorage.setItem('tms_token', result.token);
                }
                localStorage.setItem('tms_user', JSON.stringify(this.user));
            }
            finally {
                this.loading = false;
            }
        },
        logout() {
            this.user = null;
            localStorage.removeItem('tms_token');
            localStorage.removeItem('tms_user');
        },
    },
});
