import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, FileText, Plus, ReceiptText, RotateCcw, Save, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { expenseRecords, expenseTypes as demoExpenseTypes, nextExpenseId, nextExpenseLineId } from '../data/expenses';
import { projects as demoProjects } from '../data/projects';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'expense-edit');
const expenseId = computed(() => Number(route.params.id));
const requestedPhase = computed(() => route.name === 'pre-award-expense-new' || route.query.phase === 'pre_award' ? 'pre_award' : 'execution');
const backRoute = computed(() => requestedPhase.value === 'pre_award' ? '/expenses/pre-award' : '/expenses/project');
const projects = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const expenseTypes = ref(demoExpenseTypes.map((item) => ({ ...item })));
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const form = reactive({ projectId: Number(route.query.projectId || 0), paymentNo: '', payTo: '', payeeAddress: '', paymentDate: new Date().toISOString().slice(0, 10), paymentType: '', referenceNo: '', referenceDate: '', notes: '', status: 'posted' });
const lines = ref([]);
function dateValue(value) { return value ? String(value).slice(0, 10) : ''; }
function addLine() {
    const first = expenseTypes.value.find((item) => item.active && item.phase === requestedPhase.value) ?? expenseTypes.value.find((item) => item.active);
    lines.value.push({ expenseTypeId: first?.id ?? 0, amount: first?.defaultAmount ?? '', discount: '', returnedAmount: first?.defaultReturnAmount ?? '', returnDate: '', notes: '' });
}
function typeFor(line) { return expenseTypes.value.find((item) => item.id === line.expenseTypeId); }
function lineTotal(line) { return Math.max(0, Number(line.amount || 0) - Number(line.discount || 0) - Number(line.returnedAmount || 0)); }
const grossTotal = computed(() => lines.value.reduce((sum, line) => sum + Number(line.amount || 0), 0));
const returnedTotal = computed(() => lines.value.reduce((sum, line) => sum + Number(line.returnedAmount || 0), 0));
const netTotal = computed(() => lines.value.reduce((sum, line) => sum + lineTotal(line), 0));
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value); }
function fillExpense(item) {
    form.projectId = item.projectId;
    form.paymentNo = item.paymentNo ?? '';
    form.payTo = item.payTo ?? '';
    form.payeeAddress = item.payeeAddress ?? '';
    form.paymentDate = dateValue(item.paymentDate);
    form.paymentType = item.paymentType ?? '';
    form.referenceNo = item.referenceNo ?? '';
    form.referenceDate = dateValue(item.referenceDate);
    form.notes = item.notes ?? '';
    form.status = item.status;
    lines.value = item.lines.filter((line) => line.expenseTypeId).map((line) => ({ id: line.id, expenseTypeId: line.expenseTypeId, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: Number(line.returnedAmount || 0), returnDate: dateValue(line.returnDate), notes: line.notes ?? '' }));
}
onMounted(async () => {
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        const existing = expenseRecords.find((item) => item.id === expenseId.value);
        if (editing.value && existing)
            fillExpense(existing);
        if (!editing.value)
            addLine();
        return;
    }
    loading.value = true;
    try {
        const [options, current] = await Promise.all([
            api('/expenses/options'),
            editing.value ? api(`/expenses/${expenseId.value}`) : null,
        ]);
        projects.value = options.projects;
        expenseTypes.value = options.expenseTypes;
        if (current)
            fillExpense(current.expense);
        else
            addLine();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load expense information.';
    }
    finally {
        loading.value = false;
    }
});
async function save() {
    error.value = '';
    saved.value = false;
    if (!form.projectId || !form.paymentDate) {
        error.value = 'Select a project and payment date.';
        return;
    }
    if (!lines.value.length || lines.value.some((line) => !line.expenseTypeId || Number(line.amount) < 0 || line.amount === '')) {
        error.value = 'Add at least one complete expense line.';
        return;
    }
    saving.value = true;
    try {
        const payload = { ...form, lines: lines.value.map((line) => ({ expenseTypeId: line.expenseTypeId, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: Number(line.returnedAmount || 0), returnDate: line.returnDate, notes: line.notes })) };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editing.value ? `/expenses/${expenseId.value}` : '/expenses', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const id = editing.value ? expenseId.value : nextExpenseId();
            const project = projects.value.find((item) => item.id === form.projectId);
            let lineSeed = nextExpenseLineId();
            const record = { id, ...form, projectCode: project.code, projectName: project.name, lines: lines.value.map((line) => { const type = typeFor(line); return { id: line.id ?? lineSeed++, expenseTypeId: line.expenseTypeId, expenseTypeName: type.name, phase: type.phase, refundable: type.refundable, quantity: null, unitName: '', amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: Number(line.returnedAmount || 0), totalAmount: lineTotal(line), returnDate: line.returnDate, notes: line.notes }; }) };
            const index = expenseRecords.findIndex((item) => item.id === id);
            if (index >= 0)
                expenseRecords[index] = record;
            else
                expenseRecords.unshift(record);
        }
        saved.value = true;
        setTimeout(() => router.push(backRoute.value), 550);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the expense voucher.';
    }
    finally {
        saving.value = false;
    }
}
async function removeExpense() {
    if (deleteText.value !== 'DELETE')
        return;
    deleting.value = true;
    error.value = '';
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(`/expenses/${expenseId.value}`, { method: 'DELETE' });
        else {
            const index = expenseRecords.findIndex((item) => item.id === expenseId.value);
            if (index >= 0)
                expenseRecords.splice(index, 1);
        }
        await router.push(backRoute.value);
    }
    catch (reason) {
        deleteOpen.value = false;
        error.value = reason instanceof Error ? reason.message : 'The expense voucher could not be deleted.';
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
    ...{ class: "project-form-page expense-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: (__VLS_ctx.backRoute),
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: (__VLS_ctx.backRoute),
    ...{ class: "back-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (16),
}));
const __VLS_6 = __VLS_5({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
(__VLS_ctx.requestedPhase === 'pre_award' ? 'Pre-award expenses' : 'Project costs');
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "form-heading-icon" },
});
const __VLS_8 = {}.ReceiptText;
/** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Modify expense voucher' : 'Add expense voucher');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.save) },
    ...{ class: "project-form expense-entry-form panel" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "site-form-loading" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
/** @type {[typeof ProjectSearchSelect, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(ProjectSearchSelect, new ProjectSearchSelect({
    modelValue: (__VLS_ctx.form.projectId),
    projects: (__VLS_ctx.projects),
}));
const __VLS_13 = __VLS_12({
    modelValue: (__VLS_ctx.form.projectId),
    projects: (__VLS_ctx.projects),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_15 = {}.FileText;
/** @type {[typeof __VLS_components.FileText, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    size: (17),
}));
const __VLS_17 = __VLS_16({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Auto or manual voucher number",
});
(__VLS_ctx.form.paymentNo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_19 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    size: (17),
}));
const __VLS_21 = __VLS_20({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
    required: true,
});
(__VLS_ctx.form.paymentDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Person or office",
});
(__VLS_ctx.form.payTo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Cash, bank, cheque…",
});
(__VLS_ctx.form.paymentType);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_23 = {}.FileText;
/** @type {[typeof __VLS_components.FileText, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    size: (17),
}));
const __VLS_25 = __VLS_24({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Reference number",
});
(__VLS_ctx.form.referenceNo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_27 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    size: (17),
}));
const __VLS_29 = __VLS_28({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.referenceDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Address",
});
(__VLS_ctx.form.payeeAddress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Short voucher notes",
});
(__VLS_ctx.form.notes);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.status),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "posted",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "draft",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "cancelled",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-divider" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expense-lines-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.addLine) },
    type: "button",
    ...{ class: "secondary-button" },
});
const __VLS_31 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    size: (16),
}));
const __VLS_33 = __VLS_32({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expense-lines" },
});
for (const [line, index] of __VLS_getVForSourceType((__VLS_ctx.lines))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (line.id ?? index),
        ...{ class: "expense-line-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (index + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({
        ...{ class: (__VLS_ctx.typeFor(line)?.phase) },
    });
    (__VLS_ctx.typeFor(line)?.phase === 'pre_award' ? 'Pre-award' : 'Project cost');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.lines.splice(index, 1);
            } },
        type: "button",
        title: "Remove line",
    });
    const __VLS_35 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        size: (15),
    }));
    const __VLS_37 = __VLS_36({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-line-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (line.expenseTypeId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.optgroup, __VLS_intrinsicElements.optgroup)({
        label: "Pre-award costs",
    });
    for (const [type] of __VLS_getVForSourceType((__VLS_ctx.expenseTypes.filter((item) => item.active && item.phase === 'pre_award')))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (type.id),
            value: (type.id),
        });
        (type.name);
        (type.refundable ? ' · Refundable' : '');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.optgroup, __VLS_intrinsicElements.optgroup)({
        label: "Project costs",
    });
    for (const [type] of __VLS_getVForSourceType((__VLS_ctx.expenseTypes.filter((item) => item.active && item.phase === 'execution')))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (type.id),
            value: (type.id),
        });
        (type.name);
        (type.refundable ? ' · Refundable' : '');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0.00",
    });
    (line.amount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0.00",
    });
    (line.discount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_39 = {}.RotateCcw;
    /** @type {[typeof __VLS_components.RotateCcw, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: (16),
    }));
    const __VLS_41 = __VLS_40({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        placeholder: "0.00",
    });
    (line.returnedAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_43 = {}.CalendarDays;
    /** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        size: (16),
    }));
    const __VLS_45 = __VLS_44({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
    });
    (line.returnDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Optional details",
    });
    (line.notes);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.lineTotal(line)));
}
if (!__VLS_ctx.lines.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-lines-empty" },
    });
    const __VLS_47 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        size: (23),
    }));
    const __VLS_49 = __VLS_48({
        size: (23),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addLine) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    const __VLS_51 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        size: (16),
    }));
    const __VLS_53 = __VLS_52({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expense-total-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.grossTotal));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.returnedTotal));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "net" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.netTotal));
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error form-message" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.saved) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "save-success" },
    });
    const __VLS_55 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        size: (16),
    }));
    const __VLS_57 = __VLS_56({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "form-actions" },
});
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.deleteText = '';
                __VLS_ctx.deleteOpen = true;
            } },
        type: "button",
        ...{ class: "delete-project-button" },
    });
    const __VLS_59 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        size: (16),
    }));
    const __VLS_61 = __VLS_60({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
}
const __VLS_63 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    to: (__VLS_ctx.backRoute),
    ...{ class: "secondary-button" },
}));
const __VLS_65 = __VLS_64({
    to: (__VLS_ctx.backRoute),
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
__VLS_66.slots.default;
var __VLS_66;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_67 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    size: (17),
}));
const __VLS_69 = __VLS_68({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save changes' : 'Add expense');
if (__VLS_ctx.deleteOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "delete-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "modal-close" },
    });
    const __VLS_71 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        size: (18),
    }));
    const __VLS_73 = __VLS_72({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_75 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        size: (24),
    }));
    const __VLS_77 = __VLS_76({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "delete-confirm-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "DELETE",
    });
    (__VLS_ctx.deleteText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.removeExpense) },
        ...{ class: "danger-button" },
        disabled: (__VLS_ctx.deleteText !== 'DELETE' || __VLS_ctx.deleting),
    });
    const __VLS_79 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        size: (16),
    }));
    const __VLS_81 = __VLS_80({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    (__VLS_ctx.deleting ? 'Deleting…' : 'Delete voucher');
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-entry-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-lines-head']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-lines']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-card']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-lines-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-total-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['net']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['form-message']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-project-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-confirm-field']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertTriangle: AlertTriangle,
            ArrowLeft: ArrowLeft,
            CalendarDays: CalendarDays,
            Check: Check,
            FileText: FileText,
            Plus: Plus,
            ReceiptText: ReceiptText,
            RotateCcw: RotateCcw,
            Save: Save,
            Trash2: Trash2,
            X: X,
            ProjectSearchSelect: ProjectSearchSelect,
            editing: editing,
            requestedPhase: requestedPhase,
            backRoute: backRoute,
            projects: projects,
            expenseTypes: expenseTypes,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            deleteOpen: deleteOpen,
            deleting: deleting,
            deleteText: deleteText,
            form: form,
            lines: lines,
            addLine: addLine,
            typeFor: typeFor,
            lineTotal: lineTotal,
            grossTotal: grossTotal,
            returnedTotal: returnedTotal,
            netTotal: netTotal,
            money: money,
            save: save,
            removeExpense: removeExpense,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
