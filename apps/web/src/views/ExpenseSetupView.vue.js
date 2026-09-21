import { computed, onMounted, reactive, ref } from 'vue';
import { AlertTriangle, Check, Pencil, Plus, ReceiptText, Search, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { expenseTypes as demoExpenseTypes } from '../data/expenses';
import { expenseHeadOptions } from '../data/sitePurchases';
const tab = ref('general');
const expenseTypes = ref(demoExpenseTypes.map((item) => ({ ...item })));
const expenseHeads = ref(expenseHeadOptions.map((item) => ({ id: item.id, name: item.name, status: 'active', usageCount: 0 })));
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saved = ref('');
const editingId = ref(null);
const typeForm = reactive({ name: '', phase: 'pre_award', refundable: false, defaultRate: null, defaultAmount: null, defaultReturnAmount: null, active: true });
const headForm = reactive({ name: '', status: 'active' });
const deleteTarget = ref(null);
const deleteLoading = ref(false);
const deleting = ref(false);
async function loadSetup(showLoading = true) {
    if (import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    if (showLoading)
        loading.value = true;
    try {
        const [typesResult, headsResult] = await Promise.all([
            api('/expenses/types'),
            api('/site-purchases/expense-heads'),
        ]);
        expenseTypes.value = typesResult.expenseTypes;
        expenseHeads.value = headsResult.expenseHeads;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load expense setup.';
    }
    finally {
        if (showLoading)
            loading.value = false;
    }
}
onMounted(() => loadSetup());
const filteredTypes = computed(() => { const term = search.value.toLowerCase(); return expenseTypes.value.filter((item) => !term || item.name.toLowerCase().includes(term)); });
const filteredHeads = computed(() => { const term = search.value.toLowerCase(); return expenseHeads.value.filter((item) => !term || item.name.toLowerCase().includes(term)); });
function resetForm() {
    editingId.value = null;
    saved.value = '';
    error.value = '';
    Object.assign(typeForm, { name: '', phase: 'pre_award', refundable: false, defaultRate: null, defaultAmount: null, defaultReturnAmount: null, active: true });
    Object.assign(headForm, { name: '', status: 'active' });
}
function editType(item) { tab.value = 'general'; editingId.value = item.id; Object.assign(typeForm, { name: item.name, phase: item.phase, refundable: item.refundable, defaultRate: item.defaultRate, defaultAmount: item.defaultAmount, defaultReturnAmount: item.defaultReturnAmount, active: item.active }); }
function editHead(item) { tab.value = 'engineer'; editingId.value = item.id; Object.assign(headForm, { name: item.name, status: item.status }); }
async function saveSetup() {
    error.value = '';
    saved.value = '';
    if (tab.value === 'general' && !typeForm.name.trim()) {
        error.value = 'Enter the expense type name.';
        return;
    }
    if (tab.value === 'engineer' && !headForm.name.trim()) {
        error.value = 'Enter the expense head name.';
        return;
    }
    saving.value = true;
    try {
        if (tab.value === 'general') {
            const payload = { ...typeForm, name: typeForm.name.trim() };
            if (import.meta.env.VITE_DEMO_MODE === 'false')
                await api(editingId.value ? `/expenses/types/${editingId.value}` : '/expenses/types', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            else {
                const id = editingId.value ?? Math.max(0, ...expenseTypes.value.map((item) => item.id)) + 1;
                const record = { id, ...payload, usageCount: expenseTypes.value.find((item) => item.id === id)?.usageCount ?? 0 };
                const index = expenseTypes.value.findIndex((item) => item.id === id);
                if (index >= 0)
                    expenseTypes.value[index] = record;
                else
                    expenseTypes.value.unshift(record);
            }
        }
        else {
            const payload = { name: headForm.name.trim(), status: headForm.status };
            if (import.meta.env.VITE_DEMO_MODE === 'false')
                await api(editingId.value ? `/site-purchases/expense-heads/${editingId.value}` : '/site-purchases/expense-heads', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            else {
                const id = editingId.value ?? Math.max(0, ...expenseHeads.value.map((item) => item.id)) + 1;
                const record = { id, ...payload, usageCount: expenseHeads.value.find((item) => item.id === id)?.usageCount ?? 0 };
                const index = expenseHeads.value.findIndex((item) => item.id === id);
                if (index >= 0)
                    expenseHeads.value[index] = record;
                else
                    expenseHeads.value.unshift(record);
            }
        }
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadSetup(false);
        saved.value = editingId.value ? 'Setup updated.' : 'Setup added.';
        resetForm();
        saved.value = 'Saved successfully.';
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save expense setup.';
    }
    finally {
        saving.value = false;
    }
}
async function requestDelete(kind, item) {
    deleteTarget.value = { kind, id: item.id, name: item.name, canDelete: false, references: 0 };
    deleteLoading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const result = kind === 'general'
                ? await api(`/expenses/types/${item.id}/delete-check`)
                : await api(`/site-purchases/expense-heads/${item.id}/delete-check`);
            deleteTarget.value.canDelete = result.canDelete;
            deleteTarget.value.references = 'expenseEntries' in result.references ? result.references.expenseEntries : result.references.siteExpenseEntries;
        }
        else {
            deleteTarget.value.canDelete = item.usageCount === 0;
            deleteTarget.value.references = item.usageCount;
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not check references.';
        deleteTarget.value = null;
    }
    finally {
        deleteLoading.value = false;
    }
}
async function confirmDelete() {
    if (!deleteTarget.value?.canDelete)
        return;
    deleting.value = true;
    try {
        const target = deleteTarget.value;
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(target.kind === 'general' ? `/expenses/types/${target.id}` : `/site-purchases/expense-heads/${target.id}`, { method: 'DELETE' });
        const list = target.kind === 'general' ? expenseTypes.value : expenseHeads.value;
        const index = list.findIndex((item) => item.id === target.id);
        if (index >= 0)
            list.splice(index, 1);
        deleteTarget.value = null;
        resetForm();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete this setup record.';
        deleteTarget.value = null;
    }
    finally {
        deleting.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "expense-setup-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row projects-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetForm) },
    ...{ class: "secondary-button" },
});
const __VLS_0 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (17),
}));
const __VLS_2 = __VLS_1({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "setup-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.tab = 'general';
            __VLS_ctx.resetForm();
        } },
    ...{ class: ({ active: __VLS_ctx.tab === 'general' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.expenseTypes.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.tab = 'engineer';
            __VLS_ctx.resetForm();
        } },
    ...{ class: ({ active: __VLS_ctx.tab === 'engineer' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.expenseHeads.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expense-setup-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.saveSetup) },
    ...{ class: "panel setup-entry-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editingId ? 'Modify' : 'Add');
(__VLS_ctx.tab === 'general' ? 'expense type' : 'expense head');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.tab === 'general' ? 'Used by pre-award and project vouchers.' : 'Used by site-engineer other-expense entries.');
if (__VLS_ctx.tab === 'general') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setup-form-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_4 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (16),
    }));
    const __VLS_6 = __VLS_5({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Expense type name",
    });
    (__VLS_ctx.typeForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.typeForm.phase),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "pre_award",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "execution",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.typeForm.refundable);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid three" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0",
    });
    (__VLS_ctx.typeForm.defaultRate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0",
    });
    (__VLS_ctx.typeForm.defaultAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0",
    });
    (__VLS_ctx.typeForm.defaultReturnAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.typeForm.active);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setup-form-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_8 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (16),
    }));
    const __VLS_10 = __VLS_9({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Site expense head",
    });
    (__VLS_ctx.headForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.headForm.status),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "active",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "inactive",
    });
}
if (__VLS_ctx.error) {
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
        size: (16),
    }));
    const __VLS_14 = __VLS_13({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    (__VLS_ctx.saved);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "setup-form-actions" },
});
if (__VLS_ctx.editingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetForm) },
        type: "button",
        ...{ class: "secondary-button" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_16 = {}.Check;
/** @type {[typeof __VLS_components.Check, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    size: (16),
}));
const __VLS_18 = __VLS_17({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editingId ? 'Save changes' : 'Add setup');
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel setup-list-panel" },
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
    placeholder: (__VLS_ctx.tab === 'general' ? 'Search expense types…' : 'Search engineer expense heads…'),
});
(__VLS_ctx.search);
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setup-record-list" },
    });
    for (const [item] of __VLS_getVForSourceType(((__VLS_ctx.tab === 'general' ? __VLS_ctx.filteredTypes : __VLS_ctx.filteredHeads)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.name);
        if (__VLS_ctx.tab === 'general') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
            (item.phase === 'pre_award' ? 'Pre-award' : 'Project cost');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.refundable ? 'Refundable' : 'Non-refundable');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
            (item.status);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.usageCount);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.tab === 'general' ? __VLS_ctx.editType(item) : __VLS_ctx.editHead(item);
                } },
            ...{ class: "card-edit" },
        });
        const __VLS_24 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            size: (14),
        }));
        const __VLS_26 = __VLS_25({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.requestDelete(__VLS_ctx.tab, item);
                } },
            ...{ class: "card-edit danger" },
        });
        const __VLS_28 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (14),
        }));
        const __VLS_30 = __VLS_29({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    }
    if (!(__VLS_ctx.tab === 'general' ? __VLS_ctx.filteredTypes : __VLS_ctx.filteredHeads).length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_32 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            size: (22),
        }));
        const __VLS_34 = __VLS_33({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    }
}
if (__VLS_ctx.deleteTarget) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteTarget))
                    return;
                __VLS_ctx.deleteTarget = null;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "delete-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteTarget))
                    return;
                __VLS_ctx.deleteTarget = null;
            } },
        ...{ class: "modal-close" },
    });
    const __VLS_36 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (18),
    }));
    const __VLS_38 = __VLS_37({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_40 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        size: (24),
    }));
    const __VLS_42 = __VLS_41({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.deleteTarget.name);
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.deleteTarget.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_44 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: (18),
        }));
        const __VLS_46 = __VLS_45({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.deleteTarget.references);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.deleteTarget))
                        return;
                    if (!!(__VLS_ctx.deleteLoading))
                        return;
                    if (!(!__VLS_ctx.deleteTarget.canDelete))
                        return;
                    __VLS_ctx.deleteTarget = null;
                } },
            ...{ class: "secondary-button modal-done" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.deleteTarget))
                        return;
                    if (!!(__VLS_ctx.deleteLoading))
                        return;
                    if (!!(!__VLS_ctx.deleteTarget.canDelete))
                        return;
                    __VLS_ctx.deleteTarget = null;
                } },
            ...{ class: "secondary-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmDelete) },
            ...{ class: "danger-button" },
            disabled: (__VLS_ctx.deleting),
        });
        const __VLS_48 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            size: (16),
        }));
        const __VLS_50 = __VLS_49({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete');
    }
}
/** @type {__VLS_StyleScopedClasses['expense-setup-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['projects-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-setup-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-entry-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['check-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['three']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['check-field']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['card-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-blocked']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-done']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertTriangle: AlertTriangle,
            Check: Check,
            Pencil: Pencil,
            Plus: Plus,
            ReceiptText: ReceiptText,
            Search: Search,
            Trash2: Trash2,
            X: X,
            tab: tab,
            expenseTypes: expenseTypes,
            expenseHeads: expenseHeads,
            search: search,
            loading: loading,
            saving: saving,
            error: error,
            saved: saved,
            editingId: editingId,
            typeForm: typeForm,
            headForm: headForm,
            deleteTarget: deleteTarget,
            deleteLoading: deleteLoading,
            deleting: deleting,
            filteredTypes: filteredTypes,
            filteredHeads: filteredHeads,
            resetForm: resetForm,
            editType: editType,
            editHead: editHead,
            saveSetup: saveSetup,
            requestDelete: requestDelete,
            confirmDelete: confirmDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
