import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDown } from 'lucide-vue-next';
import { navigation } from '../data/navigation';
import AppIcon from './AppIcon.vue';
const __VLS_props = defineProps();
const emit = defineEmits();
const route = useRoute();
const openGroups = ref([]);
function containsRoute(item) {
    return item.route === route.path || item.children?.some((child) => child.route === route.path);
}
watch(() => route.path, () => {
    const active = navigation.find((item) => containsRoute(item));
    if (active?.children && !openGroups.value.includes(active.id))
        openGroups.value.push(active.id);
}, { immediate: true });
function toggle(id) {
    openGroups.value = openGroups.value.includes(id)
        ? openGroups.value.filter((item) => item !== id)
        : [...openGroups.value, id];
}
const isOpen = computed(() => (id) => openGroups.value.includes(id));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "side-nav" },
    'aria-label': "Main navigation",
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.navigation))) {
    (item.id);
    if (!item.children) {
        const __VLS_0 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            to: (item.route),
            ...{ class: "nav-link" },
            title: (__VLS_ctx.collapsed ? item.label : undefined),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            to: (item.route),
            ...{ class: "nav-link" },
            title: (__VLS_ctx.collapsed ? item.label : undefined),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_4;
        let __VLS_5;
        let __VLS_6;
        const __VLS_7 = {
            onClick: (...[$event]) => {
                if (!(!item.children))
                    return;
                __VLS_ctx.emit('navigate');
            }
        };
        __VLS_3.slots.default;
        /** @type {[typeof AppIcon, ]} */ ;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent(AppIcon, new AppIcon({
            name: (item.icon),
        }));
        const __VLS_9 = __VLS_8({
            name: (item.icon),
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-label" },
        });
        (item.label);
        if (item.badge) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "nav-badge" },
            });
            (item.badge);
        }
        var __VLS_3;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "nav-group" },
            ...{ class: ({ active: __VLS_ctx.containsRoute(item), open: __VLS_ctx.isOpen(item.id) }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!item.children))
                        return;
                    __VLS_ctx.toggle(item.id);
                } },
            ...{ class: "nav-link nav-button" },
            title: (__VLS_ctx.collapsed ? item.label : undefined),
        });
        /** @type {[typeof AppIcon, ]} */ ;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent(AppIcon, new AppIcon({
            name: (item.icon),
        }));
        const __VLS_12 = __VLS_11({
            name: (item.icon),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-label" },
        });
        (item.label);
        const __VLS_14 = {}.ChevronDown;
        /** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
            ...{ class: "nav-chevron" },
            size: (15),
        }));
        const __VLS_16 = __VLS_15({
            ...{ class: "nav-chevron" },
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "nav-children" },
        });
        for (const [child] of __VLS_getVForSourceType((item.children))) {
            const __VLS_18 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
                ...{ 'onClick': {} },
                key: (child.id),
                to: (child.route),
                ...{ class: "nav-child" },
            }));
            const __VLS_20 = __VLS_19({
                ...{ 'onClick': {} },
                key: (child.id),
                to: (child.route),
                ...{ class: "nav-child" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            let __VLS_22;
            let __VLS_23;
            let __VLS_24;
            const __VLS_25 = {
                onClick: (...[$event]) => {
                    if (!!(!item.children))
                        return;
                    __VLS_ctx.emit('navigate');
                }
            };
            __VLS_21.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "nav-dot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (child.label);
            if (child.badge) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "nav-badge" },
                });
                (child.badge);
            }
            var __VLS_21;
        }
    }
}
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-group']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-children']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-child']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-badge']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ChevronDown: ChevronDown,
            navigation: navigation,
            AppIcon: AppIcon,
            emit: emit,
            containsRoute: containsRoute,
            toggle: toggle,
            isOpen: isOpen,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
