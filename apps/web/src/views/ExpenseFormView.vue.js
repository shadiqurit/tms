import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, FileText, Pencil, Plus, ReceiptText, RotateCcw, Save, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { expenseRecords, expenseTypes as demoExpenseTypes, nextExpenseId, nextExpenseLineId } from '../data/expenses';
import { projects as demoProjects } from '../data/projects';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'expense-edit');
const expenseId = computed(() => Number(route.params.id));
const backRoute = '/expenses/project-costs';
const projects = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const expenseTypes = ref(demoExpenseTypes.map((item) => ({ ...item })));
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const lineModalOpen = ref(false);
const editingLineIndex = ref(null);
const lineError = ref('');
const form = reactive({ projectId: Number(route.query.projectId || 0), paymentNo: '', payTo: '', payeeAddress: '', paymentDate: new Date().toISOString().slice(0, 10), paymentType: '', referenceNo: '', referenceDate: '', notes: '', status: 'posted' });
const lines = ref([]);
const lineDraft = reactive({ costId: 0, returnable: false, amount: '', discount: '', returnedAmount: '', returnDate: '', notes: '' });
function dateValue(value) { return value ? String(value).slice(0, 10) : ''; }
function defaultLine() {
    const first = expenseTypes.value.find((item) => item.active);
    return { costId: first?.id ?? 0, returnable: first?.refundable ?? false, amount: first?.defaultAmount ?? '', discount: '', returnedAmount: first?.refundable ? (first.defaultReturnAmount ?? '') : '', returnDate: '', notes: '' };
}
function setLineDraft(line) {
    lineDraft.id = line.id;
    lineDraft.costId = line.costId;
    lineDraft.returnable = line.returnable;
    lineDraft.amount = line.amount;
    lineDraft.discount = line.discount;
    lineDraft.returnedAmount = line.returnedAmount;
    lineDraft.returnDate = line.returnDate;
    lineDraft.notes = line.notes;
}
function openNewLine() {
    if (!expenseTypes.value.some((item) => item.active)) {
        error.value = 'No active costs are available in EXPCOST.';
        return;
    }
    editingLineIndex.value = null;
    lineError.value = '';
    setLineDraft(defaultLine());
    lineModalOpen.value = true;
}
function openEditLine(index) {
    editingLineIndex.value = index;
    lineError.value = '';
    setLineDraft(lines.value[index]);
    lineModalOpen.value = true;
}
function closeLineModal() {
    lineModalOpen.value = false;
    lineError.value = '';
}
function saveLineDraft() {
    if (!lineDraft.costId || lineDraft.amount === '' || Number(lineDraft.amount) < 0) {
        lineError.value = 'Select a cost and enter a valid amount.';
        return;
    }
    const savedLine = { ...lineDraft };
    if (editingLineIndex.value === null)
        lines.value.push(savedLine);
    else
        lines.value.splice(editingLineIndex.value, 1, savedLine);
    closeLineModal();
}
function typeFor(line) { return expenseTypes.value.find((item) => item.id === line.costId); }
function typeChanged(line) { line.returnable = typeFor(line)?.refundable ?? false; if (!line.returnable) {
    line.returnedAmount = '';
    line.returnDate = '';
} }
function lineTotal(line) { return Math.max(0, Number(line.amount || 0) - Number(line.discount || 0) - (line.returnable ? Number(line.returnedAmount || 0) : 0)); }
const grossTotal = computed(() => lines.value.reduce((sum, line) => sum + Number(line.amount || 0), 0));
const returnedTotal = computed(() => lines.value.reduce((sum, line) => sum + (line.returnable ? Number(line.returnedAmount || 0) : 0), 0));
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
    lines.value = item.lines.filter((line) => line.costId).map((line) => ({ id: line.id, costId: line.costId, returnable: line.returnable, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: Number(line.returnedAmount || 0), returnDate: dateValue(line.returnDate), notes: line.notes ?? '' }));
}
onMounted(async () => {
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        const existing = expenseRecords.find((item) => item.id === expenseId.value);
        if (editing.value && existing)
            fillExpense(existing);
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
    if (!lines.value.length || lines.value.some((line) => !line.costId || Number(line.amount) < 0 || line.amount === '')) {
        error.value = 'Add at least one complete expense line.';
        return;
    }
    saving.value = true;
    try {
        const payload = { ...form, lines: lines.value.map((line) => ({ costId: line.costId, returnable: line.returnable, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: line.returnable ? Number(line.returnedAmount || 0) : 0, returnDate: line.returnable ? line.returnDate : '', notes: line.notes })) };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editing.value ? `/expenses/${expenseId.value}` : '/expenses', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const id = editing.value ? expenseId.value : nextExpenseId();
            const project = projects.value.find((item) => item.id === form.projectId);
            let lineSeed = nextExpenseLineId();
            const record = { id, ...form, projectCode: project.code, projectName: project.name, lines: lines.value.map((line) => { const type = typeFor(line); return { id: line.id ?? lineSeed++, costId: line.costId, costName: type.name, phase: type.phase, returnable: line.returnable, returnableSource: line.returnable ? 'YES' : 'NO', quantity: null, unitName: '', amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: line.returnable ? Number(line.returnedAmount || 0) : 0, totalAmount: lineTotal(line), returnDate: line.returnable ? line.returnDate : '', notes: line.notes }; }) };
            const index = expenseRecords.findIndex((item) => item.id === id);
            if (index >= 0)
                expenseRecords[index] = record;
            else
                expenseRecords.unshift(record);
        }
        saved.value = true;
        setTimeout(() => router.push(backRoute), 550);
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
        await router.push(backRoute);
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
(__VLS_ctx.editing ? 'Modify cost voucher' : 'Add cost voucher');
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
    ...{ onClick: (__VLS_ctx.openNewLine) },
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
if (__VLS_ctx.lines.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-lines-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table expense-lines-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [line, index] of __VLS_getVForSourceType((__VLS_ctx.lines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onDblclick: (...[$event]) => {
                    if (!(__VLS_ctx.lines.length))
                        return;
                    __VLS_ctx.openEditLine(index);
                } },
            key: (line.id ?? `new-${index}`),
            title: "Double-click to edit",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Line",
        });
        (index + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Cost name",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expense-line-name" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.typeFor(line)?.name ?? 'Unknown cost');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (line.costId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Stage",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expense-line-stage" },
            ...{ class: (__VLS_ctx.typeFor(line)?.phase) },
        });
        (__VLS_ctx.typeFor(line)?.phase === 'pre_award' ? 'Before' : 'Project');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Returnable",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expense-line-returnable" },
            ...{ class: (line.returnable ? 'yes' : 'no') },
        });
        (line.returnable ? 'YES' : 'NO');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Amount",
        });
        (__VLS_ctx.money(Number(line.amount || 0)));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Discount",
        });
        (__VLS_ctx.money(Number(line.discount || 0)));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Returned",
        });
        (line.returnable ? __VLS_ctx.money(Number(line.returnedAmount || 0)) : '—');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Net",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            ...{ class: "expense-amount" },
        });
        (__VLS_ctx.money(__VLS_ctx.lineTotal(line)));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Notes",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expense-line-notes" },
        });
        (line.notes || '—');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Actions",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "line-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.lines.length))
                        return;
                    __VLS_ctx.openEditLine(index);
                } },
            type: "button",
            title: "Edit line",
        });
        const __VLS_35 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            size: (14),
        }));
        const __VLS_37 = __VLS_36({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.lines.length))
                        return;
                    __VLS_ctx.lines.splice(index, 1);
                } },
            type: "button",
            ...{ class: "danger" },
            title: "Remove temporary line",
        });
        const __VLS_39 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            size: (14),
        }));
        const __VLS_41 = __VLS_40({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-lines-empty" },
    });
    const __VLS_43 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        size: (23),
    }));
    const __VLS_45 = __VLS_44({
        size: (23),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openNewLine) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    const __VLS_47 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        size: (16),
    }));
    const __VLS_49 = __VLS_48({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
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
    const __VLS_51 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        size: (16),
    }));
    const __VLS_53 = __VLS_52({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
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
    const __VLS_55 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        size: (16),
    }));
    const __VLS_57 = __VLS_56({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
}
const __VLS_59 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    to: (__VLS_ctx.backRoute),
    ...{ class: "secondary-button" },
}));
const __VLS_61 = __VLS_60({
    to: (__VLS_ctx.backRoute),
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
var __VLS_62;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_63 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    size: (17),
}));
const __VLS_65 = __VLS_64({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save changes' : 'Add expense');
if (__VLS_ctx.lineModalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeLineModal) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "expense-line-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineModal) },
        type: "button",
        ...{ class: "modal-close" },
    });
    const __VLS_67 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
        size: (18),
    }));
    const __VLS_69 = __VLS_68({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_68));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_71 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        size: (20),
    }));
    const __VLS_73 = __VLS_72({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.editingLineIndex === null ? 'Add expense line' : `Edit expense line ${__VLS_ctx.editingLineIndex + 1}`);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-line-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                if (!(__VLS_ctx.lineModalOpen))
                    return;
                __VLS_ctx.typeChanged(__VLS_ctx.lineDraft);
            } },
        value: (__VLS_ctx.lineDraft.costId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.optgroup, __VLS_intrinsicElements.optgroup)({
        label: "Before costs",
    });
    for (const [type] of __VLS_getVForSourceType((__VLS_ctx.expenseTypes.filter((item) => item.active && item.phase === 'pre_award')))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (type.id),
            value: (type.id),
        });
        (type.name);
        (type.id);
        (type.refundable ? ' · Returnable' : '');
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
        (type.id);
        (type.refundable ? ' · Returnable' : '');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expense-stage-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.typeFor(__VLS_ctx.lineDraft)?.phase === 'pre_award' ? 'Before cost' : 'Project cost');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.lineDraft.returnable),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (true),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (false),
    });
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
    (__VLS_ctx.lineDraft.amount);
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
    (__VLS_ctx.lineDraft.discount);
    if (__VLS_ctx.lineDraft.returnable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_75 = {}.RotateCcw;
        /** @type {[typeof __VLS_components.RotateCcw, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            size: (16),
        }));
        const __VLS_77 = __VLS_76({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            step: "0.01",
            placeholder: "0.00",
        });
        (__VLS_ctx.lineDraft.returnedAmount);
    }
    if (__VLS_ctx.lineDraft.returnable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_79 = {}.CalendarDays;
        /** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
        // @ts-ignore
        const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
            size: (16),
        }));
        const __VLS_81 = __VLS_80({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_80));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.lineDraft.returnDate);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Optional details",
    });
    (__VLS_ctx.lineDraft.notes);
    if (__VLS_ctx.lineError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error modal-error" },
        });
        (__VLS_ctx.lineError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.lineTotal(__VLS_ctx.lineDraft)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineModal) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveLineDraft) },
        type: "button",
        ...{ class: "primary-button" },
    });
    const __VLS_83 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        size: (16),
    }));
    const __VLS_85 = __VLS_84({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    (__VLS_ctx.editingLineIndex === null ? 'Add temporary line' : 'Update temporary line');
}
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
    const __VLS_87 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        size: (18),
    }));
    const __VLS_89 = __VLS_88({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_91 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        size: (24),
    }));
    const __VLS_93 = __VLS_92({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
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
    const __VLS_95 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
        size: (16),
    }));
    const __VLS_97 = __VLS_96({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
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
/** @type {__VLS_StyleScopedClasses['expense-lines-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-name']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-returnable']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-amount']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-notes']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
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
/** @type {__VLS_StyleScopedClasses['expense-line-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-stage-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-error']} */ ;
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
            Pencil: Pencil,
            Plus: Plus,
            ReceiptText: ReceiptText,
            RotateCcw: RotateCcw,
            Save: Save,
            Trash2: Trash2,
            X: X,
            ProjectSearchSelect: ProjectSearchSelect,
            editing: editing,
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
            lineModalOpen: lineModalOpen,
            editingLineIndex: editingLineIndex,
            lineError: lineError,
            form: form,
            lines: lines,
            lineDraft: lineDraft,
            openNewLine: openNewLine,
            openEditLine: openEditLine,
            closeLineModal: closeLineModal,
            saveLineDraft: saveLineDraft,
            typeFor: typeFor,
            typeChanged: typeChanged,
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
