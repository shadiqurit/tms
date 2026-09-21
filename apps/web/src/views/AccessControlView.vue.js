import { computed, ref } from 'vue';
import { Check, ChevronRight, Info, Plus, Search, ShieldCheck, UsersRound } from 'lucide-vue-next';
const roles = [
    { id: 0, key: 'programmer', name: 'Programmer', users: 2, description: 'Super administrator with unrestricted system access' },
    { id: 1, key: 'admin', name: 'Admin', users: 1, description: 'Manages projects, people, and finance' },
    { id: 2, key: 'staff', name: 'Staff', users: 0, description: 'Operational access to assigned projects' },
    { id: 3, key: 'users', name: 'Users', users: 1, description: 'Limited data entry and viewing access' },
];
const modules = [
    { name: 'Projects', icon: 'P', permissions: ['View projects', 'Create & edit projects', 'Manage project sites', 'Assign project users', 'Delete unreferenced projects'] },
    { name: 'Expenses', icon: 'E', permissions: ['View general expenses', 'Create and modify general expenses', 'Delete general expenses', 'Manage expense setup'] },
    { name: 'Procurement', icon: 'P', permissions: ['View site engineer purchases', 'Create and modify site engineer purchases', 'Delete site engineer purchases', 'View corporate purchases', 'Create and modify corporate purchases', 'Delete corporate purchases', 'Transfer materials'] },
    { name: 'Workforce', icon: 'W', permissions: ['View employees', 'Create and modify employees', 'Delete unreferenced employees', 'Manage masons', 'Process salary & loans'] },
    { name: 'Finance', icon: 'F', permissions: ['View bills & deposits', 'Manage loans', 'Manage banks', 'Approve transactions'] },
    { name: 'Reports', icon: 'R', permissions: ['View reports', 'Export reports'] },
    { name: 'Administration', icon: 'A', permissions: ['Manage users', 'Manage menu permissions', 'Manage master data'] },
];
const selectedRole = ref(roles[1]);
const search = ref('');
const grants = ref({});
for (const module of modules)
    for (const permission of module.permissions)
        grants.value[permission] = selectedRole.value.key !== 'users' || permission.startsWith('View');
const filtered = computed(() => modules.filter((item) => item.name.toLowerCase().includes(search.value.toLowerCase()) || item.permissions.some((p) => p.toLowerCase().includes(search.value.toLowerCase()))));
function selectRole(role) {
    selectedRole.value = role;
    for (const module of modules)
        for (const permission of module.permissions)
            grants.value[permission] = role.key === 'programmer' || role.key === 'admin' || permission.startsWith('View');
}
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
});
const __VLS_0 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (18),
}));
const __VLS_2 = __VLS_1({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
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
                __VLS_ctx.selectRole(role);
            } },
        key: (role.id),
        ...{ class: "role-item" },
        ...{ class: ({ active: __VLS_ctx.selectedRole.id === role.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "role-icon" },
    });
    const __VLS_4 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (18),
    }));
    const __VLS_6 = __VLS_5({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (role.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (role.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    const __VLS_8 = {}.UsersRound;
    /** @type {[typeof __VLS_components.UsersRound, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (12),
    }));
    const __VLS_10 = __VLS_9({
        size: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    (role.users);
    (role.users === 1 ? 'user' : 'users');
    const __VLS_12 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (17),
    }));
    const __VLS_14 = __VLS_13({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
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
const __VLS_16 = {}.ShieldCheck;
/** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    size: (21),
}));
const __VLS_18 = __VLS_17({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
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
    ...{ class: "primary-button small" },
});
const __VLS_20 = {}.Check;
/** @type {[typeof __VLS_components.Check, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: (16),
}));
const __VLS_22 = __VLS_21({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "permission-note" },
});
const __VLS_24 = {}.Info;
/** @type {[typeof __VLS_components.Info, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    size: (16),
}));
const __VLS_26 = __VLS_25({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
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
const __VLS_28 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    size: (16),
}));
const __VLS_30 = __VLS_29({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Find a module or permission…",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "permission-groups" },
});
for (const [module] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        key: (module.name),
        ...{ class: "permission-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (module.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (module.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (module.permissions.filter((p) => __VLS_ctx.grants[p]).length);
    (module.permissions.length);
    for (const [permission] of __VLS_getVForSourceType((module.permissions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (permission),
            ...{ class: "permission-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (permission);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (permission.toLowerCase());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
            disabled: (__VLS_ctx.selectedRole.key === 'programmer'),
        });
        (__VLS_ctx.grants[permission]);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    }
}
/** @type {__VLS_StyleScopedClasses['access-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
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
/** @type {__VLS_StyleScopedClasses['permission-note']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-search']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-groups']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-group']} */ ;
/** @type {__VLS_StyleScopedClasses['permission-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            ChevronRight: ChevronRight,
            Info: Info,
            Plus: Plus,
            Search: Search,
            ShieldCheck: ShieldCheck,
            UsersRound: UsersRound,
            roles: roles,
            selectedRole: selectedRole,
            search: search,
            grants: grants,
            filtered: filtered,
            selectRole: selectRole,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
