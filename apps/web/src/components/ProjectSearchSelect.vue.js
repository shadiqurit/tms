import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-vue-next';
const props = defineProps();
const emit = defineEmits();
const root = ref();
const input = ref();
const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const selected = computed(() => props.projects.find((project) => project.id === props.modelValue));
const selectedLabel = computed(() => selected.value ? `${selected.value.code} — ${selected.value.name}` : '');
const filtered = computed(() => {
    const term = query.value.trim().toLowerCase();
    if (!term || query.value === selectedLabel.value)
        return props.projects;
    return props.projects.filter((project) => [project.code, project.tenderId, project.name, project.location].some((value) => value.toLowerCase().includes(term)));
});
watch(selectedLabel, (label) => { if (!open.value)
    query.value = label; }, { immediate: true });
watch(filtered, () => { activeIndex.value = 0; });
function handleOutside(event) {
    if (root.value && !root.value.contains(event.target))
        close();
}
onMounted(() => document.addEventListener('pointerdown', handleOutside, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutside, true));
function show() {
    open.value = true;
    query.value = '';
    activeIndex.value = Math.max(0, filtered.value.findIndex((project) => project.id === props.modelValue));
    nextTick(() => input.value?.focus());
}
function close() {
    open.value = false;
    query.value = selectedLabel.value;
}
function choose(project) {
    emit('update:modelValue', project.id);
    query.value = `${project.code} — ${project.name}`;
    open.value = false;
}
function clear() {
    emit('update:modelValue', 0);
    query.value = '';
    open.value = true;
    nextTick(() => input.value?.focus());
}
function onInput() {
    if (query.value !== selectedLabel.value)
        emit('update:modelValue', 0);
}
function keydown(event) {
    if (!open.value && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        show();
        return;
    }
    if (!open.value)
        return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1);
    }
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex.value = Math.max(activeIndex.value - 1, 0);
    }
    else if (event.key === 'Enter' && filtered.value[activeIndex.value]) {
        event.preventDefault();
        choose(filtered.value[activeIndex.value]);
    }
    else if (event.key === 'Escape') {
        event.preventDefault();
        close();
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onKeydown: (__VLS_ctx.keydown) },
    ref: "root",
    ...{ class: "project-combobox" },
    ...{ class: ({ open: __VLS_ctx.open }) },
});
/** @type {typeof __VLS_ctx.root} */ ;
const __VLS_0 = {}.Building2;
/** @type {[typeof __VLS_components.Building2, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (17),
}));
const __VLS_2 = __VLS_1({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onFocus: (__VLS_ctx.show) },
    ...{ onInput: (__VLS_ctx.onInput) },
    ref: "input",
    role: "combobox",
    autocomplete: "off",
    'aria-label': "Search and select project",
    'aria-expanded': (__VLS_ctx.open),
    placeholder: (__VLS_ctx.open ? 'Search by package, tender, name or location…' : 'Select a project'),
});
(__VLS_ctx.query);
/** @type {typeof __VLS_ctx.input} */ ;
if (__VLS_ctx.modelValue && __VLS_ctx.open) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clear) },
        type: "button",
        ...{ class: "combo-clear" },
        'aria-label': "Clear selection",
    });
    const __VLS_4 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (15),
    }));
    const __VLS_6 = __VLS_5({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.open ? __VLS_ctx.close() : __VLS_ctx.show();
        } },
    type: "button",
    ...{ class: "combo-toggle" },
    'aria-label': "Open project options",
});
const __VLS_8 = {}.ChevronDown;
/** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (16),
}));
const __VLS_10 = __VLS_9({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
if (__VLS_ctx.open) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "combo-menu" },
        role: "listbox",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "combo-search-hint" },
    });
    const __VLS_12 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (14),
    }));
    const __VLS_14 = __VLS_13({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.query ? `${__VLS_ctx.filtered.length} matching projects` : `${__VLS_ctx.projects.length} projects available`);
    for (const [project, index] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onMouseenter: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        return;
                    __VLS_ctx.activeIndex = index;
                } },
            ...{ onMousedown: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        return;
                    __VLS_ctx.choose(project);
                } },
            key: (project.id),
            type: "button",
            role: "option",
            ...{ class: "combo-option" },
            ...{ class: ({ active: index === __VLS_ctx.activeIndex, selected: project.id === __VLS_ctx.modelValue }) },
            'aria-selected': (project.id === __VLS_ctx.modelValue),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "combo-project-mark" },
        });
        (project.code.slice(0, 2));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (project.code);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (project.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
        (project.location);
        (project.tenderId);
        if (project.id === __VLS_ctx.modelValue) {
            const __VLS_16 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                size: (16),
            }));
            const __VLS_18 = __VLS_17({
                size: (16),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        }
    }
    if (__VLS_ctx.filtered.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "combo-empty" },
        });
        const __VLS_20 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (18),
        }));
        const __VLS_22 = __VLS_21({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
}
/** @type {__VLS_StyleScopedClasses['project-combobox']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-clear']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-search-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-option']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-project-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['combo-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Building2: Building2,
            Check: Check,
            ChevronDown: ChevronDown,
            Search: Search,
            X: X,
            root: root,
            input: input,
            open: open,
            query: query,
            activeIndex: activeIndex,
            filtered: filtered,
            show: show,
            close: close,
            choose: choose,
            clear: clear,
            onInput: onInput,
            keydown: keydown,
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
