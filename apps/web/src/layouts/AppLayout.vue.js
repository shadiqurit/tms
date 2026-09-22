import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Bell, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/BrandMark.vue';
import SideNavigation from '../components/SideNavigation.vue';
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const mobileOpen = ref(false);
const profileOpen = ref(false);
const title = computed(() => {
    if (route.path === '/dashboard')
        return `Good evening, ${auth.user?.name.split(' ')[0] ?? 'there'}`;
    if (route.path === '/projects')
        return 'Projects';
    if (route.name === 'project-new')
        return 'New project';
    if (route.name === 'project-edit')
        return 'Edit project';
    if (route.name === 'project-sites')
        return 'Project sites';
    if (route.name === 'project-site-new')
        return 'New project site';
    if (route.name === 'project-site-edit')
        return 'Edit project site';
    if (route.name === 'assignments')
        return 'Employee assignments';
    if (route.name === 'assignment-new')
        return 'New assignment';
    if (route.name === 'assignment-edit')
        return 'Modify assignment';
    if (route.name === 'employees')
        return 'Employees';
    if (route.name === 'employee-new')
        return 'New employee';
    if (route.name === 'employee-edit')
        return 'Edit employee';
    if (route.name === 'project-costs')
        return 'Project Costs';
    if (route.name === 'project-cost-new')
        return 'New project cost';
    if (route.name === 'expense-edit')
        return 'Modify expense';
    if (route.name === 'expense-setup')
        return 'Expense setup';
    if (route.name === 'site-purchases')
        return 'Site engineer purchases';
    if (route.name === 'site-purchase-new')
        return 'New site purchase';
    if (route.name === 'site-purchase-edit')
        return 'Site purchase ledger';
    if (route.name === 'corporate-purchases')
        return 'Corporate purchases';
    if (route.name === 'corporate-purchase-new')
        return 'New corporate purchase';
    if (route.name === 'corporate-purchase-edit')
        return 'Corporate purchase';
    if (route.name === 'corporate-transfers')
        return 'Corporate transfers';
    if (route.name === 'corporate-transfer-new')
        return 'New corporate transfer';
    if (route.name === 'corporate-transfer-edit')
        return 'Corporate transfer';
    if (route.name === 'master-data')
        return 'Master setup';
    if (route.name === 'users')
        return 'User setup';
    if (route.name === 'menus')
        return 'Menu setup';
    if (route.path === '/admin/access')
        return 'Access control';
    if (route.name === 'forbidden')
        return 'Access denied';
    return route.path.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Overview';
});
function logout() {
    auth.logout();
    router.push('/login');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-shell" },
    ...{ class: ({ 'sidebar-collapsed': __VLS_ctx.collapsed, 'mobile-nav-open': __VLS_ctx.mobileOpen }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-head" },
});
/** @type {[typeof BrandMark, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(BrandMark, new BrandMark({
    compact: (__VLS_ctx.collapsed),
    inverse: true,
}));
const __VLS_1 = __VLS_0({
    compact: (__VLS_ctx.collapsed),
    inverse: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.mobileOpen = false;
        } },
    ...{ class: "icon-button sidebar-close-mobile" },
    'aria-label': "Close menu",
});
const __VLS_3 = {}.X;
/** @type {[typeof __VLS_components.X, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    size: (19),
}));
const __VLS_5 = __VLS_4({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
/** @type {[typeof SideNavigation, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(SideNavigation, new SideNavigation({
    ...{ 'onNavigate': {} },
    collapsed: (__VLS_ctx.collapsed),
}));
const __VLS_8 = __VLS_7({
    ...{ 'onNavigate': {} },
    collapsed: (__VLS_ctx.collapsed),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    onNavigate: (...[$event]) => {
        __VLS_ctx.mobileOpen = false;
    }
};
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-foot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "help-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "help-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "nav-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.collapsed = !__VLS_ctx.collapsed;
        } },
    ...{ class: "collapse-button" },
});
if (!__VLS_ctx.collapsed) {
    const __VLS_14 = {}.PanelLeftClose;
    /** @type {[typeof __VLS_components.PanelLeftClose, ]} */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
        size: (17),
    }));
    const __VLS_16 = __VLS_15({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
}
else {
    const __VLS_18 = {}.PanelLeftOpen;
    /** @type {[typeof __VLS_components.PanelLeftOpen, ]} */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        size: (17),
    }));
    const __VLS_20 = __VLS_19({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "nav-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.mobileOpen = false;
        } },
    ...{ class: "sidebar-scrim" },
    'aria-label': "Close navigation",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "main-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "topbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.mobileOpen = true;
        } },
    ...{ class: "icon-button mobile-menu" },
    'aria-label': "Open navigation",
});
const __VLS_22 = {}.Menu;
/** @type {[typeof __VLS_components.Menu, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    size: (21),
}));
const __VLS_24 = __VLS_23({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
(__VLS_ctx.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "topbar-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "global-search" },
});
const __VLS_26 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    size: (17),
}));
const __VLS_28 = __VLS_27({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "search",
    placeholder: "Search anything…",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "icon-button notification" },
    'aria-label': "Notifications",
});
const __VLS_30 = {}.Bell;
/** @type {[typeof __VLS_components.Bell, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    size: (19),
}));
const __VLS_32 = __VLS_31({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.profileOpen = !__VLS_ctx.profileOpen;
        } },
    ...{ class: "profile-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "avatar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.auth.user?.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
(__VLS_ctx.auth.user?.role.name);
const __VLS_34 = {}.ChevronDown;
/** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    size: (15),
}));
const __VLS_36 = __VLS_35({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
if (__VLS_ctx.profileOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-menu" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.hr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.logout) },
        ...{ class: "danger" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-content" },
});
const __VLS_38 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-head']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-close-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['help-card']} */ ;
/** @type {__VLS_StyleScopedClasses['help-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['collapse-button']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-scrim']} */ ;
/** @type {__VLS_StyleScopedClasses['main-area']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['global-search']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['notification']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-button']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['page-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Bell: Bell,
            ChevronDown: ChevronDown,
            Menu: Menu,
            PanelLeftClose: PanelLeftClose,
            PanelLeftOpen: PanelLeftOpen,
            Search: Search,
            X: X,
            BrandMark: BrandMark,
            SideNavigation: SideNavigation,
            auth: auth,
            collapsed: collapsed,
            mobileOpen: mobileOpen,
            profileOpen: profileOpen,
            title: title,
            logout: logout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
