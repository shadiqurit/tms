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
        permissions: JSON.parse(localStorage.getItem('tms_permissions') ?? '[]'),
        loading: false,
        sessionChecked: false,
    }),
    getters: {
        authenticated: (state) => Boolean(state.user && localStorage.getItem('tms_token')),
        hasPermission: (state) => (required) => {
            if (!required || state.user?.role.key === 'programmer')
                return true;
            const keys = Array.isArray(required) ? required : [required];
            return keys.some((key) => state.permissions.includes(key));
        },
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
                    this.permissions = ['*'];
                    localStorage.setItem('tms_token', 'demo-session');
                }
                else {
                    const result = await api('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ login, password, remember }),
                    });
                    this.user = result.user;
                    this.permissions = result.permissions;
                    localStorage.setItem('tms_token', result.token);
                }
                localStorage.setItem('tms_user', JSON.stringify(this.user));
                localStorage.setItem('tms_permissions', JSON.stringify(this.permissions));
                this.sessionChecked = true;
            }
            finally {
                this.loading = false;
            }
        },
        async refreshSession() {
            if (demoMode) {
                this.user = demoUser;
                this.permissions = ['*'];
                this.sessionChecked = true;
                return;
            }
            const result = await api('/auth/me');
            this.user = result.user;
            this.permissions = result.permissions;
            this.sessionChecked = true;
            localStorage.setItem('tms_user', JSON.stringify(this.user));
            localStorage.setItem('tms_permissions', JSON.stringify(this.permissions));
        },
        async ensureSession() {
            if (!this.authenticated)
                return;
            try {
                await this.refreshSession();
            }
            catch (error) {
                this.logout();
                throw error;
            }
        },
        logout() {
            this.user = null;
            this.permissions = [];
            this.sessionChecked = false;
            localStorage.removeItem('tms_token');
            localStorage.removeItem('tms_user');
            localStorage.removeItem('tms_permissions');
        },
    },
});
