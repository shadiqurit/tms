import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, PackagePlus, PackageSearch, Pencil, Plus, ReceiptText, Save, Search, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
import { employeeOptions as demoEmployees } from '../data/assignments';
import { demoExpenseLines, demoMaterialLines, employeeProjectOptions as demoEmployeeProjects, expenseHeadOptions as demoExpenseHeads, materialOptions as demoMaterials, nextMaterialLineId, nextSiteExpenseLineId, nextSitePurchaseId, sitePurchaseRecords, supplierOptions as demoSuppliers, unitOptions as demoUnits } from '../data/sitePurchases';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'site-purchase-edit');
const purchaseId = computed(() => Number(route.params.id));
const projects = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const employees = ref([...demoEmployees]);
const employeeProjects = ref([...demoEmployeeProjects]);
const suppliers = ref([...demoSuppliers]);
const materials = ref([...demoMaterials]);
const units = ref([...demoUnits]);
const expenseHeads = ref([...demoExpenseHeads]);
const sites = ref(demoSites.map(({ id, projectId, name, address }) => ({ id, projectId, name, address })));
const loading = ref(false);
const saving = ref(false);
const saved = ref('');
const error = ref('');
const activeTab = ref('materials');
const lineFormOpen = ref(false);
const lineSaving = ref(false);
const materialItems = ref([]);
const expenseItems = ref([]);
const materialPage = ref(1);
const expensePage = ref(1);
const pageSize = 20;
const materialTotalRows = ref(0);
const expenseTotalRows = ref(0);
const lineSearch = ref('');
const pendingLineDelete = ref(null);
const lineDeleting = ref(false);
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleteCheck = ref(null);
const deleting = ref(false);
const deleteText = ref('');
const counts = reactive({ materialCount: 0, materialTotal: 0, expenseCount: 0, expenseTotal: 0 });
const today = new Date().toISOString().slice(0, 10);
const form = reactive({ projectId: Number(route.query.projectId || 0), employeeId: 0, supplierId: null, purchaseNo: '', localSupplier: '', supplierAddress: '', purchaseDate: today, purchaseType: 'local', challanNo: '', challanDate: '', notes: '', status: 'posted' });
const materialForm = reactive({ id: null, materialId: 0, unitId: null, siteId: null, entryDate: today, quantity: 1, unitPrice: '', discount: '', notes: '' });
const expenseForm = reactive({ id: null, expenseHeadId: null, siteId: null, entryDate: today, amount: '', notes: '' });
const availableEmployees = computed(() => form.projectId ? employees.value.filter((employee) => employeeProjects.value.some((link) => link.employeeId === employee.id && link.projectId === form.projectId)) : employees.value);
const availableSites = computed(() => sites.value.filter((site) => site.projectId === form.projectId));
const materialPageCount = computed(() => Math.max(1, Math.ceil(materialTotalRows.value / pageSize)));
const expensePageCount = computed(() => Math.max(1, Math.ceil(expenseTotalRows.value / pageSize)));
const materialLineTotal = computed(() => Math.max(0, Number(materialForm.quantity || 0) * Number(materialForm.unitPrice || 0) - Number(materialForm.discount || 0)));
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function dateValue(value) { return value ? String(value).slice(0, 10) : ''; }
function fillHeader(item) {
    form.projectId = item.projectId;
    form.employeeId = item.employeeId;
    form.supplierId = item.supplierId;
    form.purchaseNo = item.purchaseNo ?? '';
    form.localSupplier = item.localSupplier ?? '';
    form.supplierAddress = item.supplierAddress ?? '';
    form.purchaseDate = dateValue(item.purchaseDate);
    form.purchaseType = item.purchaseType;
    form.challanNo = item.challanNo ?? '';
    form.challanDate = dateValue(item.challanDate);
    form.notes = item.notes ?? '';
    form.status = item.status;
    Object.assign(counts, { materialCount: Number(item.materialCount), materialTotal: Number(item.materialTotal), expenseCount: Number(item.expenseCount), expenseTotal: Number(item.expenseTotal) });
}
async function loadHeader() {
    if (!editing.value)
        return;
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        const item = sitePurchaseRecords.find((entry) => entry.id === purchaseId.value);
        if (item)
            fillHeader(item);
        return;
    }
    const result = await api(`/site-purchases/${purchaseId.value}`);
    fillHeader(result.purchase);
}
async function loadLines() {
    if (!editing.value)
        return;
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        materialItems.value = demoMaterialLines.filter((item) => item.purchaseId === purchaseId.value).map((item) => ({ ...item }));
        expenseItems.value = demoExpenseLines.filter((item) => item.purchaseId === purchaseId.value).map((item) => ({ ...item }));
        materialTotalRows.value = materialItems.value.length;
        expenseTotalRows.value = expenseItems.value.length;
        return;
    }
    if (activeTab.value === 'materials') {
        const result = await api(`/site-purchases/${purchaseId.value}/materials?page=${materialPage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
        materialItems.value = result.items;
        materialTotalRows.value = result.total;
    }
    else {
        const result = await api(`/site-purchases/${purchaseId.value}/expenses?page=${expensePage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
        expenseItems.value = result.items;
        expenseTotalRows.value = result.total;
    }
}
onMounted(async () => {
    loading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const options = await api('/site-purchases/options');
            projects.value = options.projects;
            employees.value = options.employees;
            employeeProjects.value = options.employeeProjects;
            suppliers.value = options.suppliers;
            materials.value = options.materials;
            units.value = options.units;
            expenseHeads.value = options.expenseHeads;
            sites.value = options.sites;
        }
        await loadHeader();
        await loadLines();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load site purchase information.';
    }
    finally {
        loading.value = false;
    }
});
watch(() => form.projectId, () => {
    if (form.employeeId && !availableEmployees.value.some((employee) => employee.id === form.employeeId))
        form.employeeId = 0;
    if (materialForm.siteId && !availableSites.value.some((site) => site.id === materialForm.siteId))
        materialForm.siteId = null;
    if (expenseForm.siteId && !availableSites.value.some((site) => site.id === expenseForm.siteId))
        expenseForm.siteId = null;
});
watch(activeTab, () => { lineSearch.value = ''; lineFormOpen.value = false; loadLines(); });
function supplierChanged() { const supplier = suppliers.value.find((item) => item.id === form.supplierId); if (supplier)
    form.supplierAddress = supplier.address ?? ''; }
function materialChanged() { const material = materials.value.find((item) => item.id === materialForm.materialId); materialForm.unitId = material?.unitId ?? null; }
function resetMaterialForm() { Object.assign(materialForm, { id: null, materialId: 0, unitId: null, siteId: null, entryDate: form.purchaseDate || today, quantity: 1, unitPrice: '', discount: '', notes: '' }); }
function resetExpenseForm() { Object.assign(expenseForm, { id: null, expenseHeadId: null, siteId: null, entryDate: form.purchaseDate || today, amount: '', notes: '' }); }
function closeLineForm() { lineFormOpen.value = false; error.value = ''; }
function addEntry() { error.value = ''; activeTab.value === 'materials' ? resetMaterialForm() : resetExpenseForm(); lineFormOpen.value = true; }
function editMaterial(item) { error.value = ''; Object.assign(materialForm, { id: item.id, materialId: item.materialId, unitId: item.unitId, siteId: item.siteId, entryDate: dateValue(item.entryDate), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount || 0), notes: item.notes ?? '' }); lineFormOpen.value = true; }
function editExpense(item) { error.value = ''; Object.assign(expenseForm, { id: item.id, expenseHeadId: item.expenseHeadId, siteId: item.siteId, entryDate: dateValue(item.entryDate), amount: Number(item.amount), notes: item.notes ?? '' }); lineFormOpen.value = true; }
async function saveHeader() {
    error.value = '';
    saved.value = '';
    if (!form.projectId || !form.employeeId || !form.purchaseDate) {
        error.value = 'Select a project, assigned employee, and purchase date.';
        return;
    }
    saving.value = true;
    try {
        let id = purchaseId.value;
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const result = await api(editing.value ? `/site-purchases/${purchaseId.value}` : '/site-purchases', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(form) });
            id = result.id;
        }
        else {
            id = editing.value ? purchaseId.value : nextSitePurchaseId();
            const project = projects.value.find((item) => item.id === form.projectId);
            const employee = employees.value.find((item) => item.id === form.employeeId);
            const supplier = suppliers.value.find((item) => item.id === form.supplierId);
            const current = sitePurchaseRecords.find((item) => item.id === id);
            const record = { id, ...form, projectCode: project.code, projectName: project.name, employeeName: employee.name, employeeCode: employee.employeeCode, supplierName: supplier?.name ?? (form.localSupplier || 'Local supplier'), materialCount: current?.materialCount ?? 0, materialTotal: current?.materialTotal ?? 0, expenseCount: current?.expenseCount ?? 0, expenseTotal: current?.expenseTotal ?? 0 };
            const index = sitePurchaseRecords.findIndex((item) => item.id === id);
            if (index >= 0)
                sitePurchaseRecords[index] = record;
            else
                sitePurchaseRecords.unshift(record);
        }
        saved.value = editing.value ? 'Purchase header updated.' : 'Purchase created. Add material and expense entries below.';
        if (!editing.value)
            await router.replace(`/purchases/site-engineer/${id}/edit`);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the purchase header.';
    }
    finally {
        saving.value = false;
    }
}
async function saveMaterial() {
    if (!materialForm.materialId || !materialForm.entryDate || Number(materialForm.quantity) <= 0 || materialForm.unitPrice === '') {
        error.value = 'Complete the material, date, quantity, and price.';
        return;
    }
    lineSaving.value = true;
    error.value = '';
    try {
        const payload = { materialId: materialForm.materialId, unitId: materialForm.unitId, siteId: materialForm.siteId, entryDate: materialForm.entryDate, quantity: Number(materialForm.quantity), unitPrice: Number(materialForm.unitPrice), discount: Number(materialForm.discount || 0), notes: materialForm.notes };
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(materialForm.id ? `/site-purchases/${purchaseId.value}/materials/${materialForm.id}` : `/site-purchases/${purchaseId.value}/materials`, { method: materialForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        else {
            const material = materials.value.find((item) => item.id === payload.materialId);
            const unit = units.value.find((item) => item.id === payload.unitId);
            const site = sites.value.find((item) => item.id === payload.siteId);
            const record = { id: materialForm.id ?? nextMaterialLineId(), purchaseId: purchaseId.value, materialId: material.id, materialName: material.name, unitId: payload.unitId, unitName: unit?.name ?? '', siteId: payload.siteId, siteName: site?.name ?? '', entryDate: payload.entryDate, quantity: payload.quantity, unitPrice: payload.unitPrice, discount: payload.discount, totalAmount: materialLineTotal.value, notes: payload.notes };
            const index = demoMaterialLines.findIndex((item) => item.id === record.id);
            if (index >= 0)
                demoMaterialLines[index] = record;
            else
                demoMaterialLines.unshift(record);
        }
        lineFormOpen.value = false;
        resetMaterialForm();
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save material entry.';
    }
    finally {
        lineSaving.value = false;
    }
}
async function saveExpense() {
    if (!expenseForm.entryDate || expenseForm.amount === '' || Number(expenseForm.amount) < 0) {
        error.value = 'Complete the expense date and amount.';
        return;
    }
    lineSaving.value = true;
    error.value = '';
    try {
        const payload = { expenseHeadId: expenseForm.expenseHeadId, siteId: expenseForm.siteId, entryDate: expenseForm.entryDate, amount: Number(expenseForm.amount), notes: expenseForm.notes };
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(expenseForm.id ? `/site-purchases/${purchaseId.value}/expenses/${expenseForm.id}` : `/site-purchases/${purchaseId.value}/expenses`, { method: expenseForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        else {
            const head = expenseHeads.value.find((item) => item.id === payload.expenseHeadId);
            const site = sites.value.find((item) => item.id === payload.siteId);
            const record = { id: expenseForm.id ?? nextSiteExpenseLineId(), purchaseId: purchaseId.value, expenseHeadId: payload.expenseHeadId, expenseHeadName: head?.name ?? 'Unspecified expense', siteId: payload.siteId, siteName: site?.name ?? '', entryDate: payload.entryDate, amount: payload.amount, notes: payload.notes };
            const index = demoExpenseLines.findIndex((item) => item.id === record.id);
            if (index >= 0)
                demoExpenseLines[index] = record;
            else
                demoExpenseLines.unshift(record);
        }
        lineFormOpen.value = false;
        resetExpenseForm();
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save site expense.';
    }
    finally {
        lineSaving.value = false;
    }
}
async function confirmLineDelete() {
    if (!pendingLineDelete.value)
        return;
    lineDeleting.value = true;
    try {
        const target = pendingLineDelete.value;
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(`/site-purchases/${purchaseId.value}/${target.kind}/${target.id}`, { method: 'DELETE' });
        else {
            const list = target.kind === 'materials' ? demoMaterialLines : demoExpenseLines;
            const index = list.findIndex((item) => item.id === target.id);
            if (index >= 0)
                list.splice(index, 1);
        }
        pendingLineDelete.value = null;
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the entry.';
        pendingLineDelete.value = null;
    }
    finally {
        lineDeleting.value = false;
    }
}
async function checkDelete() {
    deleteOpen.value = true;
    deleteText.value = '';
    deleteCheck.value = null;
    deleteLoading.value = true;
    try {
        deleteCheck.value = import.meta.env.VITE_DEMO_MODE === 'false' ? await api(`/site-purchases/${purchaseId.value}/delete-check`) : { canDelete: counts.materialCount + counts.expenseCount === 0, references: { materials: counts.materialCount, expenses: counts.expenseCount } };
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not check purchase references.';
        deleteOpen.value = false;
    }
    finally {
        deleteLoading.value = false;
    }
}
async function removePurchase() {
    if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE')
        return;
    deleting.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(`/site-purchases/${purchaseId.value}`, { method: 'DELETE' });
        else {
            const index = sitePurchaseRecords.findIndex((item) => item.id === purchaseId.value);
            if (index >= 0)
                sitePurchaseRecords.splice(index, 1);
        }
        await router.push('/purchases/site-engineer');
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the purchase.';
        deleteOpen.value = false;
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
    ...{ class: "project-form-page site-purchase-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/purchases/site-engineer",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/purchases/site-engineer",
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
const __VLS_8 = {}.PackageSearch;
/** @type {[typeof __VLS_components.PackageSearch, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Site purchase ledger' : 'New site purchase ledger');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.saveHeader) },
    ...{ class: "project-form panel purchase-header-form" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.employeeId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (0),
    disabled: true,
});
for (const [employee] of __VLS_getVForSourceType((__VLS_ctx.availableEmployees))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (employee.id),
        value: (employee.id),
    });
    (employee.employeeCode);
    (employee.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_15 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    size: (16),
}));
const __VLS_17 = __VLS_16({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.purchaseDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Purchase / ledger number",
});
(__VLS_ctx.form.purchaseNo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.purchaseType),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "local",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "corporate",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.supplierChanged) },
    value: (__VLS_ctx.form.supplierId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
for (const [supplier] of __VLS_getVForSourceType((__VLS_ctx.suppliers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (supplier.id),
        value: (supplier.id),
    });
    (supplier.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Optional supplier name",
});
(__VLS_ctx.form.localSupplier);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Supplier address",
});
(__VLS_ctx.form.supplierAddress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Challan / invoice",
});
(__VLS_ctx.form.challanNo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_19 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    size: (16),
}));
const __VLS_21 = __VLS_20({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.challanDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Purchase notes",
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
    const __VLS_23 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        size: (16),
    }));
    const __VLS_25 = __VLS_24({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    (__VLS_ctx.saved);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "form-actions" },
});
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.checkDelete) },
        type: "button",
        ...{ class: "delete-project-button" },
    });
    const __VLS_27 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        size: (16),
    }));
    const __VLS_29 = __VLS_28({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
}
const __VLS_31 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    to: "/purchases/site-engineer",
    ...{ class: "secondary-button" },
}));
const __VLS_33 = __VLS_32({
    to: "/purchases/site-engineer",
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_34.slots.default;
var __VLS_34;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_35 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    size: (17),
}));
const __VLS_37 = __VLS_36({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save header' : 'Create ledger');
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "purchase-entries panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "purchase-entry-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.activeTab = 'materials';
            } },
        ...{ class: ({ active: __VLS_ctx.activeTab === 'materials' }) },
    });
    const __VLS_39 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: (17),
    }));
    const __VLS_41 = __VLS_40({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.counts.materialCount);
    (__VLS_ctx.money(__VLS_ctx.counts.materialTotal));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.activeTab = 'expenses';
            } },
        ...{ class: ({ active: __VLS_ctx.activeTab === 'expenses' }) },
    });
    const __VLS_43 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        size: (17),
    }));
    const __VLS_45 = __VLS_44({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.counts.expenseCount);
    (__VLS_ctx.money(__VLS_ctx.counts.expenseTotal));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.counts.materialTotal + __VLS_ctx.counts.expenseTotal));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "purchase-entry-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "table-search" },
    });
    const __VLS_47 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        size: (16),
    }));
    const __VLS_49 = __VLS_48({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeyup: (__VLS_ctx.loadLines) },
        placeholder: (__VLS_ctx.activeTab === 'materials' ? 'Search materials or sites…' : 'Search expense heads or sites…'),
    });
    (__VLS_ctx.lineSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadLines) },
        ...{ class: "secondary-button" },
    });
    const __VLS_51 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        size: (15),
    }));
    const __VLS_53 = __VLS_52({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addEntry) },
        ...{ class: "primary-button" },
    });
    const __VLS_55 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        size: (16),
    }));
    const __VLS_57 = __VLS_56({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    (__VLS_ctx.activeTab === 'materials' ? 'Add material' : 'Add expense');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "purchase-lines-table-wrap" },
    });
    if (__VLS_ctx.activeTab === 'materials') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "site-table purchase-lines-table" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sr-only" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.materialItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Date",
            });
            (__VLS_ctx.dateValue(item.entryDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Material",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.materialName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.notes);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Site",
            });
            (item.siteName || 'General project');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Quantity",
            });
            (item.quantity);
            (item.unitName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Price",
            });
            (__VLS_ctx.money(item.unitPrice));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Total",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.money(item.totalAmount));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Actions",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "line-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.editing))
                            return;
                        if (!(__VLS_ctx.activeTab === 'materials'))
                            return;
                        __VLS_ctx.editMaterial(item);
                    } },
                type: "button",
            });
            const __VLS_59 = {}.Pencil;
            /** @type {[typeof __VLS_components.Pencil, ]} */ ;
            // @ts-ignore
            const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
                size: (14),
            }));
            const __VLS_61 = __VLS_60({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_60));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.editing))
                            return;
                        if (!(__VLS_ctx.activeTab === 'materials'))
                            return;
                        __VLS_ctx.pendingLineDelete = { kind: 'materials', id: item.id };
                    } },
                type: "button",
                ...{ class: "danger" },
            });
            const __VLS_63 = {}.Trash2;
            /** @type {[typeof __VLS_components.Trash2, ]} */ ;
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
                size: (14),
            }));
            const __VLS_65 = __VLS_64({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        }
        if (!__VLS_ctx.materialItems.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "7",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "site-empty" },
            });
            const __VLS_67 = {}.PackagePlus;
            /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
            // @ts-ignore
            const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
                size: (22),
            }));
            const __VLS_69 = __VLS_68({
                size: (22),
            }, ...__VLS_functionalComponentArgsRest(__VLS_68));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "site-table purchase-lines-table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sr-only" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.expenseItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Date",
            });
            (__VLS_ctx.dateValue(item.entryDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Expense head",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.expenseHeadName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Site",
            });
            (item.siteName || 'General project');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Notes",
            });
            (item.notes || '—');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Amount",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.money(item.amount));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                'data-label': "Actions",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "line-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.editing))
                            return;
                        if (!!(__VLS_ctx.activeTab === 'materials'))
                            return;
                        __VLS_ctx.editExpense(item);
                    } },
                type: "button",
            });
            const __VLS_71 = {}.Pencil;
            /** @type {[typeof __VLS_components.Pencil, ]} */ ;
            // @ts-ignore
            const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
                size: (14),
            }));
            const __VLS_73 = __VLS_72({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_72));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.editing))
                            return;
                        if (!!(__VLS_ctx.activeTab === 'materials'))
                            return;
                        __VLS_ctx.pendingLineDelete = { kind: 'expenses', id: item.id };
                    } },
                type: "button",
                ...{ class: "danger" },
            });
            const __VLS_75 = {}.Trash2;
            /** @type {[typeof __VLS_components.Trash2, ]} */ ;
            // @ts-ignore
            const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
                size: (14),
            }));
            const __VLS_77 = __VLS_76({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        }
        if (!__VLS_ctx.expenseItems.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "6",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "site-empty" },
            });
            const __VLS_79 = {}.ReceiptText;
            /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
            // @ts-ignore
            const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
                size: (22),
            }));
            const __VLS_81 = __VLS_80({
                size: (22),
            }, ...__VLS_functionalComponentArgsRest(__VLS_80));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "table-pagination purchase-line-pagination" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.activeTab === 'materials' ? __VLS_ctx.materialTotalRows : __VLS_ctx.expenseTotalRows);
    if (__VLS_ctx.activeTab === 'materials') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!(__VLS_ctx.activeTab === 'materials'))
                        return;
                    __VLS_ctx.materialPage--;
                    __VLS_ctx.loadLines();
                } },
            disabled: (__VLS_ctx.materialPage === 1),
        });
        const __VLS_83 = {}.ChevronLeft;
        /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
            size: (16),
        }));
        const __VLS_85 = __VLS_84({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.materialPage);
        (__VLS_ctx.materialPageCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!(__VLS_ctx.activeTab === 'materials'))
                        return;
                    __VLS_ctx.materialPage++;
                    __VLS_ctx.loadLines();
                } },
            disabled: (__VLS_ctx.materialPage === __VLS_ctx.materialPageCount),
        });
        const __VLS_87 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
            size: (16),
        }));
        const __VLS_89 = __VLS_88({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!!(__VLS_ctx.activeTab === 'materials'))
                        return;
                    __VLS_ctx.expensePage--;
                    __VLS_ctx.loadLines();
                } },
            disabled: (__VLS_ctx.expensePage === 1),
        });
        const __VLS_91 = {}.ChevronLeft;
        /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            size: (16),
        }));
        const __VLS_93 = __VLS_92({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.expensePage);
        (__VLS_ctx.expensePageCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!!(__VLS_ctx.activeTab === 'materials'))
                        return;
                    __VLS_ctx.expensePage++;
                    __VLS_ctx.loadLines();
                } },
            disabled: (__VLS_ctx.expensePage === __VLS_ctx.expensePageCount),
        });
        const __VLS_95 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
            size: (16),
        }));
        const __VLS_97 = __VLS_96({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    }
}
if (__VLS_ctx.lineFormOpen && __VLS_ctx.activeTab === 'materials') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveMaterial) },
        ...{ class: "purchase-line-form purchase-line-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_99 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        size: (18),
    }));
    const __VLS_101 = __VLS_100({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.materialForm.id ? 'Modify material entry' : 'Add material purchase');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
    });
    const __VLS_103 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
        size: (17),
    }));
    const __VLS_105 = __VLS_104({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid three" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.materialChanged) },
        value: (__VLS_ctx.materialForm.materialId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
        disabled: true,
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.materials))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (item.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
    });
    (__VLS_ctx.materialForm.entryDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.materialForm.siteId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [site] of __VLS_getVForSourceType((__VLS_ctx.availableSites))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (site.id),
            value: (site.id),
        });
        (site.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.materialForm.unitId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [unit] of __VLS_getVForSourceType((__VLS_ctx.units))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (unit.id),
            value: (unit.id),
        });
        (unit.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0.0001",
        step: "0.0001",
    });
    (__VLS_ctx.materialForm.quantity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.0001",
    });
    (__VLS_ctx.materialForm.unitPrice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
    });
    (__VLS_ctx.materialForm.discount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Optional material notes",
    });
    (__VLS_ctx.materialForm.notes);
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error modal-error" },
        });
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.materialLineTotal));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.lineSaving),
    });
    const __VLS_107 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
        size: (15),
    }));
    const __VLS_109 = __VLS_108({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    (__VLS_ctx.lineSaving ? 'Saving…' : __VLS_ctx.materialForm.id ? 'Update material' : 'Add material');
}
if (__VLS_ctx.lineFormOpen && __VLS_ctx.activeTab === 'expenses') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveExpense) },
        ...{ class: "purchase-line-form purchase-line-modal purchase-expense-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_111 = {}.ReceiptText;
    /** @type {[typeof __VLS_components.ReceiptText, ]} */ ;
    // @ts-ignore
    const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
        size: (18),
    }));
    const __VLS_113 = __VLS_112({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_112));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.expenseForm.id ? 'Modify site expense' : 'Add other site expense');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
    });
    const __VLS_115 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
        size: (17),
    }));
    const __VLS_117 = __VLS_116({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.expenseForm.expenseHeadId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [head] of __VLS_getVForSourceType((__VLS_ctx.expenseHeads))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (head.id),
            value: (head.id),
        });
        (head.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
    });
    (__VLS_ctx.expenseForm.entryDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.expenseForm.siteId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [site] of __VLS_getVForSourceType((__VLS_ctx.availableSites))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (site.id),
            value: (site.id),
        });
        (site.name);
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
    });
    (__VLS_ctx.expenseForm.amount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Expense details",
    });
    (__VLS_ctx.expenseForm.notes);
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error modal-error" },
        });
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(Number(__VLS_ctx.expenseForm.amount || 0)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.lineSaving),
    });
    const __VLS_119 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        size: (15),
    }));
    const __VLS_121 = __VLS_120({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    (__VLS_ctx.lineSaving ? 'Saving…' : __VLS_ctx.expenseForm.id ? 'Update expense' : 'Add expense');
}
if (__VLS_ctx.pendingLineDelete) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingLineDelete))
                    return;
                __VLS_ctx.pendingLineDelete = null;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "delete-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingLineDelete))
                    return;
                __VLS_ctx.pendingLineDelete = null;
            } },
        ...{ class: "modal-close" },
    });
    const __VLS_123 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
        size: (18),
    }));
    const __VLS_125 = __VLS_124({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_127 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
        size: (24),
    }));
    const __VLS_129 = __VLS_128({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_128));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.pendingLineDelete.kind === 'materials' ? 'material purchase' : 'site expense');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingLineDelete))
                    return;
                __VLS_ctx.pendingLineDelete = null;
            } },
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmLineDelete) },
        ...{ class: "danger-button" },
        disabled: (__VLS_ctx.lineDeleting),
    });
    const __VLS_131 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
        size: (16),
    }));
    const __VLS_133 = __VLS_132({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_132));
    (__VLS_ctx.lineDeleting ? 'Deleting…' : 'Delete entry');
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
    const __VLS_135 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
        size: (18),
    }));
    const __VLS_137 = __VLS_136({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_139 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
        size: (24),
    }));
    const __VLS_141 = __VLS_140({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_140));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_143 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
            size: (18),
        }));
        const __VLS_145 = __VLS_144({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_144));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reference-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.materials);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.expenses);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.deleteOpen))
                        return;
                    if (!!(__VLS_ctx.deleteLoading))
                        return;
                    if (!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                        return;
                    __VLS_ctx.deleteOpen = false;
                } },
            ...{ class: "secondary-button modal-done" },
        });
    }
    else if (__VLS_ctx.deleteCheck) {
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
                    if (!!(__VLS_ctx.deleteLoading))
                        return;
                    if (!!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                        return;
                    if (!(__VLS_ctx.deleteCheck))
                        return;
                    __VLS_ctx.deleteOpen = false;
                } },
            ...{ class: "secondary-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.removePurchase) },
            ...{ class: "danger-button" },
            disabled: (__VLS_ctx.deleteText !== 'DELETE' || __VLS_ctx.deleting),
        });
        const __VLS_147 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
            size: (16),
        }));
        const __VLS_149 = __VLS_148({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_148));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete ledger');
    }
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['site-purchase-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-header-form']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['form-message']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-project-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-entries']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-entry-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-entry-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['three']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-error']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-expense-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
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
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-blocked']} */ ;
/** @type {__VLS_StyleScopedClasses['reference-list']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-done']} */ ;
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
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            PackagePlus: PackagePlus,
            PackageSearch: PackageSearch,
            Pencil: Pencil,
            Plus: Plus,
            ReceiptText: ReceiptText,
            Save: Save,
            Search: Search,
            Trash2: Trash2,
            X: X,
            ProjectSearchSelect: ProjectSearchSelect,
            editing: editing,
            projects: projects,
            suppliers: suppliers,
            materials: materials,
            units: units,
            expenseHeads: expenseHeads,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            activeTab: activeTab,
            lineFormOpen: lineFormOpen,
            lineSaving: lineSaving,
            materialItems: materialItems,
            expenseItems: expenseItems,
            materialPage: materialPage,
            expensePage: expensePage,
            materialTotalRows: materialTotalRows,
            expenseTotalRows: expenseTotalRows,
            lineSearch: lineSearch,
            pendingLineDelete: pendingLineDelete,
            lineDeleting: lineDeleting,
            deleteOpen: deleteOpen,
            deleteLoading: deleteLoading,
            deleteCheck: deleteCheck,
            deleting: deleting,
            deleteText: deleteText,
            counts: counts,
            form: form,
            materialForm: materialForm,
            expenseForm: expenseForm,
            availableEmployees: availableEmployees,
            availableSites: availableSites,
            materialPageCount: materialPageCount,
            expensePageCount: expensePageCount,
            materialLineTotal: materialLineTotal,
            money: money,
            dateValue: dateValue,
            loadLines: loadLines,
            supplierChanged: supplierChanged,
            materialChanged: materialChanged,
            closeLineForm: closeLineForm,
            addEntry: addEntry,
            editMaterial: editMaterial,
            editExpense: editExpense,
            saveHeader: saveHeader,
            saveMaterial: saveMaterial,
            saveExpense: saveExpense,
            confirmLineDelete: confirmLineDelete,
            checkDelete: checkDelete,
            removePurchase: removePurchase,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
