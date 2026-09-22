import { computed, onMounted, reactive, ref } from 'vue';
import { Check, ChevronRight, Layers3, LoaderCircle, Menu, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore();
const tab = ref('menus');
const items = ref([]);
const permissions = ref([]);
const roles = ref([]);
const users = ref([]);
const roleGrants = ref([]);
const userOverrides = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saved = ref('');
const search = ref('');
const selectedRoleId = ref(0);
const selectedUserId = ref(0);
const groupValues = ref({});
const userValues = ref({});
const modalOpen = ref(false);
const editingId = ref(null);
const form = reactive({ parentId: null, permissionId: null, label: '', route: '', icon: 'Circle', sortOrder: 10, active: true });
const canManage = computed(() => auth.hasPermission('admin.menus.manage'));
const roots = computed(() => items.value.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder));
const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value));
const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value));
const menuName = (item) => item.parentId ? `${items.value.find((parent) => parent.id === item.parentId)?.label ?? 'Menu'} / ${item.label}` : item.label;
const filteredItems = computed(() => {
    const term = search.value.trim().toLowerCase();
    return [...items.value].sort((a, b) => (a.parentId ?? a.id) - (b.parentId ?? b.id) || a.sortOrder - b.sortOrder)
        .filter((item) => !term || `${menuName(item)} ${item.route ?? ''} ${item.permissionKey ?? ''}`.toLowerCase().includes(term));
});
const accessItems = computed(() => {
    const unique = new Map();
    for (const item of items.value)
        if (item.permissionId && !unique.has(item.permissionId))
            unique.set(item.permissionId, item);
    return [...unique.values()].sort((a, b) => menuName(a).localeCompare(menuName(b)));
});
async function load() {
    loading.value = true;
    error.value = '';
    try {
        const result = await api('/menus');
        items.value = result.items;
        permissions.value = result.permissions;
        roles.value = result.roles;
        users.value = result.users;
        roleGrants.value = result.roleGrants;
        userOverrides.value = result.userOverrides;
        selectedRoleId.value ||= result.roles.find((role) => role.key === 'admin')?.id ?? result.roles[0]?.id ?? 0;
        selectedUserId.value ||= result.users.find((user) => user.roleKey !== 'programmer')?.id ?? result.users[0]?.id ?? 0;
        populateGroup();
        populateUser();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load menu setup.';
    }
    finally {
        loading.value = false;
    }
}
function roleAllowed(roleId, permissionId) {
    const role = roles.value.find((item) => item.id === roleId);
    return role?.key === 'programmer' || Boolean(roleGrants.value.find((grant) => grant.roleId === roleId && grant.permissionId === permissionId)?.allowed);
}
function populateGroup() { groupValues.value = Object.fromEntries(accessItems.value.map((item) => [item.permissionId, roleAllowed(selectedRoleId.value, item.permissionId)])); }
function populateUser() {
    userValues.value = Object.fromEntries(accessItems.value.map((item) => {
        const override = userOverrides.value.find((entry) => entry.userId === selectedUserId.value && entry.permissionId === item.permissionId);
        return [item.permissionId, override === undefined ? 'inherit' : Boolean(override.allowed) ? 'allow' : 'deny'];
    }));
}
function openCreate() { editingId.value = null; Object.assign(form, { parentId: null, permissionId: null, label: '', route: '', icon: 'Circle', sortOrder: 10, active: true }); error.value = ''; modalOpen.value = true; }
function openEdit(item) { editingId.value = item.id; Object.assign(form, { parentId: item.parentId, permissionId: item.permissionId, label: item.label, route: item.route ?? '', icon: item.icon, sortOrder: item.sortOrder, active: Boolean(item.active) }); error.value = ''; modalOpen.value = true; }
async function saveMenu() {
    if (!form.label.trim()) {
        error.value = 'Menu label is required.';
        return;
    }
    saving.value = true;
    error.value = '';
    saved.value = '';
    try {
        const result = await api(editingId.value ? `/menus/${editingId.value}` : '/menus', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify({ ...form, route: form.route || null }) });
        saved.value = result.message;
        modalOpen.value = false;
        await load();
        window.dispatchEvent(new Event('tms:navigation-changed'));
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save menu.';
    }
    finally {
        saving.value = false;
    }
}
async function deleteMenu(item) {
    if (!window.confirm(`Delete menu ${item.label}?`))
        return;
    try {
        const result = await api(`/menus/${item.id}`, { method: 'DELETE' });
        saved.value = result.message;
        await load();
        window.dispatchEvent(new Event('tms:navigation-changed'));
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete menu.';
    }
}
async function saveGroup() {
    if (!selectedRole.value || selectedRole.value.key === 'programmer')
        return;
    saving.value = true;
    error.value = '';
    try {
        const payload = accessItems.value.map((item) => ({ permissionId: item.permissionId, allowed: Boolean(groupValues.value[item.permissionId]) }));
        const result = await api(`/menus/roles/${selectedRoleId.value}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: payload }) });
        saved.value = result.message;
        await load();
        if (auth.user?.role.id === selectedRoleId.value) {
            await auth.refreshSession();
            window.dispatchEvent(new Event('tms:navigation-changed'));
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save group menu access.';
    }
    finally {
        saving.value = false;
    }
}
async function saveUser() {
    if (!selectedUser.value || selectedUser.value.roleKey === 'programmer')
        return;
    saving.value = true;
    error.value = '';
    try {
        const payload = accessItems.value.map((item) => ({ permissionId: item.permissionId, allowed: userValues.value[item.permissionId] === 'inherit' ? null : userValues.value[item.permissionId] === 'allow' }));
        const result = await api(`/menus/users/${selectedUserId.value}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: payload }) });
        saved.value = result.message;
        await load();
        if (auth.user?.id === selectedUserId.value) {
            await auth.refreshSession();
            window.dispatchEvent(new Event('tms:navigation-changed'));
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save personal menu access.';
    }
    finally {
        saving.value = false;
    }
}
function effectiveUserAllowed(permissionId) {
    const value = userValues.value[permissionId];
    return value === 'allow' || (value === 'inherit' && selectedUser.value ? roleAllowed(selectedUser.value.roleId, permissionId) : false);
}
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "admin-setup-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.tab = 'menus';
        } },
    ...{ class: ({ active: __VLS_ctx.tab === 'menus' }) },
});
const __VLS_0 = {}.Menu;
/** @type {[typeof __VLS_components.Menu, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (16),
}));
const __VLS_2 = __VLS_1({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.tab = 'groups';
        } },
    ...{ class: ({ active: __VLS_ctx.tab === 'groups' }) },
});
const __VLS_4 = {}.UsersRound;
/** @type {[typeof __VLS_components.UsersRound, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (16),
}));
const __VLS_6 = __VLS_5({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.tab = 'users';
        } },
    ...{ class: ({ active: __VLS_ctx.tab === 'users' }) },
});
const __VLS_8 = {}.UserRound;
/** @type {[typeof __VLS_components.UserRound, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (16),
}));
const __VLS_10 = __VLS_9({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
if (__VLS_ctx.error && !__VLS_ctx.modalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.saved) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "save-success" },
    });
    const __VLS_12 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (15),
    }));
    const __VLS_14 = __VLS_13({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    (__VLS_ctx.saved);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "access-loading panel" },
    });
    const __VLS_16 = {}.LoaderCircle;
    /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (22),
        ...{ class: "spin" },
    }));
    const __VLS_18 = __VLS_17({
        size: (22),
        ...{ class: "spin" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
else if (__VLS_ctx.tab === 'menus') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel admin-list-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "table-search" },
    });
    const __VLS_20 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (16),
    }));
    const __VLS_22 = __VLS_21({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Search menu, route, or permission…",
    });
    (__VLS_ctx.search);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.items.length);
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openCreate) },
            ...{ class: "primary-button small" },
        });
        const __VLS_24 = {}.Plus;
        /** @type {[typeof __VLS_components.Plus, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            size: (16),
        }));
        const __VLS_26 = __VLS_25({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-config-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "menu-config-row" },
            ...{ class: ({ child: item.parentId, inactive: !item.active }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "menu-config-icon" },
        });
        const __VLS_28 = {}.Layers3;
        /** @type {[typeof __VLS_components.Layers3, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (17),
        }));
        const __VLS_30 = __VLS_29({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.menuName(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.route || 'Menu group');
        (item.permissionKey || 'Visible to signed-in users');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
        (item.sortOrder);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
        (item.active ? 'Active' : 'Hidden');
        if (__VLS_ctx.canManage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.tab === 'menus'))
                            return;
                        if (!(__VLS_ctx.canManage))
                            return;
                        __VLS_ctx.openEdit(item);
                    } },
                ...{ class: "icon-button" },
            });
            const __VLS_32 = {}.Pencil;
            /** @type {[typeof __VLS_components.Pencil, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                size: (15),
            }));
            const __VLS_34 = __VLS_33({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        }
        if (__VLS_ctx.canManage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.tab === 'menus'))
                            return;
                        if (!(__VLS_ctx.canManage))
                            return;
                        __VLS_ctx.deleteMenu(item);
                    } },
                ...{ class: "icon-button danger-icon" },
            });
            const __VLS_36 = {}.Trash2;
            /** @type {[typeof __VLS_components.Trash2, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                size: (15),
            }));
            const __VLS_38 = __VLS_37({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        }
    }
}
else if (__VLS_ctx.tab === 'groups') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-access-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "panel access-selector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.tab === 'menus'))
                        return;
                    if (!(__VLS_ctx.tab === 'groups'))
                        return;
                    __VLS_ctx.selectedRoleId = role.id;
                    __VLS_ctx.saved = '';
                    __VLS_ctx.populateGroup();
                } },
            key: (role.id),
            ...{ class: ({ active: __VLS_ctx.selectedRoleId === role.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "role-icon" },
        });
        const __VLS_40 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            size: (17),
        }));
        const __VLS_42 = __VLS_41({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (role.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (Number(role.users));
        const __VLS_44 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: (16),
        }));
        const __VLS_46 = __VLS_45({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel menu-access-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.selectedRole?.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveGroup) },
            ...{ class: "primary-button small" },
            disabled: (__VLS_ctx.selectedRole?.key === 'programmer' || __VLS_ctx.saving),
        });
        if (__VLS_ctx.saving) {
            const __VLS_48 = {}.LoaderCircle;
            /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                size: (15),
                ...{ class: "spin" },
            }));
            const __VLS_50 = __VLS_49({
                size: (15),
                ...{ class: "spin" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        }
        else {
            const __VLS_52 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                size: (15),
            }));
            const __VLS_54 = __VLS_53({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        }
    }
    if (__VLS_ctx.selectedRole?.key === 'programmer') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "permission-note" },
        });
        const __VLS_56 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: (16),
        }));
        const __VLS_58 = __VLS_57({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.accessItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (item.permissionId),
            ...{ class: "menu-access-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.menuName(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.permissionKey);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
            disabled: (__VLS_ctx.selectedRole?.key === 'programmer'),
        });
        (__VLS_ctx.groupValues[item.permissionId]);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-access-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "panel access-selector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    for (const [user] of __VLS_getVForSourceType((__VLS_ctx.users))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.tab === 'menus'))
                        return;
                    if (!!(__VLS_ctx.tab === 'groups'))
                        return;
                    __VLS_ctx.selectedUserId = user.id;
                    __VLS_ctx.saved = '';
                    __VLS_ctx.populateUser();
                } },
            key: (user.id),
            ...{ class: ({ active: __VLS_ctx.selectedUserId === user.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "role-icon" },
        });
        const __VLS_60 = {}.UserRound;
        /** @type {[typeof __VLS_components.UserRound, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            size: (17),
        }));
        const __VLS_62 = __VLS_61({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (user.name || user.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (user.roleName);
        (user.status);
        const __VLS_64 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            size: (16),
        }));
        const __VLS_66 = __VLS_65({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel menu-access-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.selectedUser?.name || __VLS_ctx.selectedUser?.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveUser) },
            ...{ class: "primary-button small" },
            disabled: (__VLS_ctx.selectedUser?.roleKey === 'programmer' || __VLS_ctx.saving),
        });
        if (__VLS_ctx.saving) {
            const __VLS_68 = {}.LoaderCircle;
            /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                size: (15),
                ...{ class: "spin" },
            }));
            const __VLS_70 = __VLS_69({
                size: (15),
                ...{ class: "spin" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        }
        else {
            const __VLS_72 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
                size: (15),
            }));
            const __VLS_74 = __VLS_73({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        }
    }
    if (__VLS_ctx.selectedUser?.roleKey === 'programmer') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "permission-note" },
        });
        const __VLS_76 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            size: (16),
        }));
        const __VLS_78 = __VLS_77({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.accessItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.permissionId),
            ...{ class: "user-menu-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.menuName(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.permissionKey);
        (__VLS_ctx.roleAllowed(__VLS_ctx.selectedUser?.roleId ?? 0, item.permissionId) ? 'allowed' : 'denied');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.userValues[item.permissionId]),
            disabled: (__VLS_ctx.selectedUser?.roleKey === 'programmer'),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "inherit",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "allow",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "deny",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({
            ...{ class: ({ allowed: __VLS_ctx.effectiveUserAllowed(item.permissionId) }) },
        });
        (__VLS_ctx.effectiveUserAllowed(item.permissionId) ? 'Visible' : 'Hidden');
    }
}
if (__VLS_ctx.modalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveMenu) },
        ...{ class: "admin-entry-modal compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "role-icon big" },
    });
    const __VLS_80 = {}.Menu;
    /** @type {[typeof __VLS_components.Menu, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        size: (21),
    }));
    const __VLS_82 = __VLS_81({
        size: (21),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.editingId ? 'Update menu item' : 'Create menu item');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        type: "button",
        ...{ class: "icon-button" },
    });
    const __VLS_84 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        size: (18),
    }));
    const __VLS_86 = __VLS_85({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error" },
        });
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        required: true,
    });
    (__VLS_ctx.form.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.parentId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [root] of __VLS_getVForSourceType((__VLS_ctx.roots.filter((root) => root.id !== __VLS_ctx.editingId)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (root.id),
            value: (root.id),
        });
        (root.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.permissionId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [permission] of __VLS_getVForSourceType((__VLS_ctx.permissions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (permission.id),
            value: (permission.id),
        });
        (permission.module);
        (permission.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "/module/page",
    });
    (__VLS_ctx.form.route);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Circle",
    });
    (__VLS_ctx.form.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: "9999",
    });
    (__VLS_ctx.form.sortOrder);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "toggle-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.form.active);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.saving),
    });
    if (__VLS_ctx.saving) {
        const __VLS_88 = {}.LoaderCircle;
        /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
            size: (16),
            ...{ class: "spin" },
        }));
        const __VLS_90 = __VLS_89({
            size: (16),
            ...{ class: "spin" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    }
    else {
        const __VLS_92 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            size: (16),
        }));
        const __VLS_94 = __VLS_93({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    }
    (__VLS_ctx.saving ? 'Saving…' : 'Save menu');
}
/** @type {__VLS_StyleScopedClasses['admin-setup-page']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['access-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-config-list']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-config-row']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-config-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-access-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['access-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-access-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-note']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-access-row']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-access-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['access-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-access-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-note']} */ ;
/** @type {__VLS_StyleScopedClasses['user-menu-row']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-entry-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['big']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-field']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            ChevronRight: ChevronRight,
            Layers3: Layers3,
            LoaderCircle: LoaderCircle,
            Menu: Menu,
            Pencil: Pencil,
            Plus: Plus,
            Search: Search,
            ShieldCheck: ShieldCheck,
            Trash2: Trash2,
            UserRound: UserRound,
            UsersRound: UsersRound,
            X: X,
            tab: tab,
            items: items,
            permissions: permissions,
            roles: roles,
            users: users,
            loading: loading,
            saving: saving,
            error: error,
            saved: saved,
            search: search,
            selectedRoleId: selectedRoleId,
            selectedUserId: selectedUserId,
            groupValues: groupValues,
            userValues: userValues,
            modalOpen: modalOpen,
            editingId: editingId,
            form: form,
            canManage: canManage,
            roots: roots,
            selectedRole: selectedRole,
            selectedUser: selectedUser,
            menuName: menuName,
            filteredItems: filteredItems,
            accessItems: accessItems,
            roleAllowed: roleAllowed,
            populateGroup: populateGroup,
            populateUser: populateUser,
            openCreate: openCreate,
            openEdit: openEdit,
            saveMenu: saveMenu,
            deleteMenu: deleteMenu,
            saveGroup: saveGroup,
            saveUser: saveUser,
            effectiveUserAllowed: effectiveUserAllowed,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
