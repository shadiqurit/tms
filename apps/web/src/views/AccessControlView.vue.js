import { computed, onMounted, ref } from 'vue';
import { Check, ChevronRight, Info, LoaderCircle, Search, ShieldCheck, UsersRound } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore();
const roles = ref([]);
const permissions = ref([]);
const selectedRoleId = ref(0);
const grants = ref({});
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const dirty = ref(false);
const error = ref('');
const saved = ref('');
const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value));
const rolePermissions = computed(() => permissions.value.filter((permission) => permission.roleId === selectedRoleId.value));
const modules = computed(() => {
    const grouped = new Map();
    for (const permission of rolePermissions.value)
        grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
    const term = search.value.trim().toLowerCase();
    return [...grouped.entries()].map(([name, items]) => ({ name, permissions: items }))
        .filter((module) => !term || module.name.toLowerCase().includes(term) || module.permissions.some((permission) => `${permission.name} ${permission.permissionKey}`.toLowerCase().includes(term)));
});
function populateGrants() {
    grants.value = Object.fromEntries(rolePermissions.value.map((permission) => [permission.id, selectedRole.value?.key === 'programmer' || Boolean(permission.allowed)]));
    dirty.value = false;
    saved.value = '';
    error.value = '';
}
function selectRole(role) { selectedRoleId.value = role.id; populateGrants(); }
function findByKey(key) { return rolePermissions.value.find((permission) => permission.permissionKey === key); }
function permissionChanged(permission, event) {
    const allowed = event.target.checked;
    grants.value[permission.id] = allowed;
    const match = permission.permissionKey.match(/^(.*)\.(view|manage|delete)$/);
    if (match) {
        const [, prefix, action] = match;
        if (allowed && (action === 'manage' || action === 'delete')) {
            const view = findByKey(`${prefix}.view`);
            if (view)
                grants.value[view.id] = true;
        }
        if (!allowed && action === 'view')
            for (const dependent of [`${prefix}.manage`, `${prefix}.delete`]) {
                const item = findByKey(dependent);
                if (item)
                    grants.value[item.id] = false;
            }
    }
    dirty.value = true;
    saved.value = '';
    error.value = '';
}
async function loadAccess() {
    loading.value = true;
    error.value = '';
    try {
        const result = await api('/access/roles');
        roles.value = result.roles;
        permissions.value = result.permissions;
        selectedRoleId.value = result.roles.find((role) => role.key === 'admin')?.id ?? result.roles[0]?.id ?? 0;
        populateGrants();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load role permissions.';
    }
    finally {
        loading.value = false;
    }
}
async function savePermissions() {
    if (!selectedRole.value || selectedRole.value.key === 'programmer' || !dirty.value)
        return;
    saving.value = true;
    error.value = '';
    saved.value = '';
    try {
        const roleItems = rolePermissions.value.map((permission) => ({ permissionId: permission.id, allowed: Boolean(grants.value[permission.id]) }));
        const result = await api(`/access/roles/${selectedRole.value.id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: roleItems }) });
        for (const permission of rolePermissions.value)
            permission.allowed = grants.value[permission.id];
        dirty.value = false;
        saved.value = result.message;
        if (auth.user?.role.id === selectedRole.value.id)
            await auth.refreshSession();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save role permissions.';
    }
    finally {
        saving.value = false;
    }
}
onMounted(loadAccess);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "access-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.saved) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "save-success" },
    });
    const __VLS_0 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (15),
    }));
    const __VLS_2 = __VLS_1({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    (__VLS_ctx.saved);
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error site-load-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "access-loading panel" },
    });
    const __VLS_4 = {}.LoaderCircle;
    /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (22),
        ...{ class: "spin" },
    }));
    const __VLS_6 = __VLS_5({
        size: (22),
        ...{ class: "spin" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "access-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "roles-panel panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.roles.length);
    for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.selectRole(role);
                } },
            key: (role.id),
            ...{ class: "role-item" },
            ...{ class: ({ active: __VLS_ctx.selectedRoleId === role.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "role-icon" },
        });
        const __VLS_8 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            size: (18),
        }));
        const __VLS_10 = __VLS_9({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (role.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (role.description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
        const __VLS_12 = {}.UsersRound;
        /** @type {[typeof __VLS_components.UsersRound, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (12),
        }));
        const __VLS_14 = __VLS_13({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        (Number(role.users));
        (Number(role.users) === 1 ? 'user' : 'users');
        const __VLS_16 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (17),
        }));
        const __VLS_18 = __VLS_17({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    }
    if (__VLS_ctx.selectedRole) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            ...{ class: "permissions-panel panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "permission-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "role-icon big" },
        });
        const __VLS_20 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (21),
        }));
        const __VLS_22 = __VLS_21({
            size: (21),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (__VLS_ctx.selectedRole.name);
        if (__VLS_ctx.selectedRole.key === 'programmer') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({
                ...{ class: "super-admin-badge" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.selectedRole.description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.savePermissions) },
            ...{ class: "primary-button small" },
            disabled: (__VLS_ctx.selectedRole.key === 'programmer' || !__VLS_ctx.dirty || __VLS_ctx.saving),
        });
        if (__VLS_ctx.saving) {
            const __VLS_24 = {}.LoaderCircle;
            /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                size: (16),
                ...{ class: "spin" },
            }));
            const __VLS_26 = __VLS_25({
                size: (16),
                ...{ class: "spin" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
        else {
            const __VLS_28 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                size: (16),
            }));
            const __VLS_30 = __VLS_29({
                size: (16),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
        (__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.dirty ? 'Save changes' : 'Saved');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "permission-note" },
        });
        const __VLS_32 = {}.Info;
        /** @type {[typeof __VLS_components.Info, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            size: (16),
        }));
        const __VLS_34 = __VLS_33({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        if (__VLS_ctx.selectedRole.key === 'programmer') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "permission-search" },
        });
        const __VLS_36 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            size: (16),
        }));
        const __VLS_38 = __VLS_37({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Find a module or permission…",
        });
        (__VLS_ctx.search);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "permission-groups" },
        });
        for (const [module] of __VLS_getVForSourceType((__VLS_ctx.modules))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                key: (module.name),
                ...{ class: "permission-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (module.name.slice(0, 1).toUpperCase());
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (module.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
            (module.permissions.filter((permission) => __VLS_ctx.grants[permission.id]).length);
            (module.permissions.length);
            for (const [permission] of __VLS_getVForSourceType((module.permissions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    key: (permission.id),
                    ...{ class: "permission-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (permission.name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (permission.permissionKey);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onChange: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!(__VLS_ctx.selectedRole))
                                return;
                            __VLS_ctx.permissionChanged(permission, $event);
                        } },
                    checked: (__VLS_ctx.grants[permission.id]),
                    type: "checkbox",
                    disabled: (__VLS_ctx.selectedRole.key === 'programmer'),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
            }
        }
        if (!__VLS_ctx.modules.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "site-empty" },
            });
            const __VLS_40 = {}.ShieldCheck;
            /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                size: (22),
            }));
            const __VLS_42 = __VLS_41({
                size: (22),
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
    }
}
/** @type {__VLS_StyleScopedClasses['access-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['site-load-error']} */ ;
/** @type {__VLS_StyleScopedClasses['access-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['access-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['roles-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['role-item']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['permissions-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-head']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['big']} */ ;
/** @type {__VLS_StyleScopedClasses['super-admin-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-note']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-search']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-groups']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-group']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-row']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            ChevronRight: ChevronRight,
            Info: Info,
            LoaderCircle: LoaderCircle,
            Search: Search,
            ShieldCheck: ShieldCheck,
            UsersRound: UsersRound,
            roles: roles,
            selectedRoleId: selectedRoleId,
            grants: grants,
            search: search,
            loading: loading,
            saving: saving,
            dirty: dirty,
            error: error,
            saved: saved,
            selectedRole: selectedRole,
            modules: modules,
            selectRole: selectRole,
            permissionChanged: permissionChanged,
            savePermissions: savePermissions,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
