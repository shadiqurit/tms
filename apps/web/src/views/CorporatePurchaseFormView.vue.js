import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, Check, ChevronLeft, ChevronRight, PackagePlus, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
import { supplierOptions as demoSuppliers, unitOptions as demoUnits } from '../data/sitePurchases';
import { corporateCategories as demoCategories, corporateLines, corporateProducts as demoProducts, corporatePurchaseRecords, corporateSubcategories as demoSubcategories, nextCorporateLineId, nextCorporatePurchaseId } from '../data/corporatePurchases';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'corporate-purchase-edit');
const purchaseId = computed(() => Number(route.params.id));
const today = new Date().toISOString().slice(0, 10);
const projects = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const sites = ref(demoSites.map(({ id, projectId, name, address }) => ({ id, projectId, name, address })));
const suppliers = ref([...demoSuppliers]);
const categories = ref([...demoCategories]);
const subcategories = ref([...demoSubcategories]);
const products = ref([...demoProducts]);
const units = ref([...demoUnits]);
const loading = ref(false);
const saving = ref(false);
const saved = ref('');
const error = ref('');
const lineFormOpen = ref(false);
const lineSaving = ref(false);
const lineSearch = ref('');
const productSearch = ref('');
const lines = ref([]);
const linePage = ref(1);
const lineTotalRows = ref(0);
const pageSize = 20;
const pendingLineDelete = ref(null);
const lineDeleting = ref(false);
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleteCheck = ref(null);
const deleteText = ref('');
const deleting = ref(false);
const summary = reactive({ itemCount: 0, totalAmount: 0 });
const form = reactive({ projectId: Number(route.query.projectId || 0), siteId: null, supplierId: null, purchaseNo: '', localSupplier: '', supplierAddress: '', purchaseDate: today, purchaseType: 'corporate', challanNo: '', challanDate: '', notes: '', status: 'posted' });
const lineForm = reactive({ id: null, categoryId: null, subcategoryId: null, productId: 0, unitId: null, siteId: null, quantity: 1, unitPrice: '', discount: '', notes: '' });
const availableSites = computed(() => sites.value.filter((site) => site.projectId === form.projectId));
const availableSubcategories = computed(() => subcategories.value.filter((item) => !lineForm.categoryId || item.categoryId === lineForm.categoryId));
const availableProducts = computed(() => {
    const term = productSearch.value.trim().toLowerCase();
    return products.value.filter((item) => (!lineForm.categoryId || item.categoryId === lineForm.categoryId) && (!term || item.name.toLowerCase().includes(term)));
});
const lineTotal = computed(() => Math.max(0, Number(lineForm.quantity || 0) * Number(lineForm.unitPrice || 0) - Number(lineForm.discount || 0)));
const linePageCount = computed(() => Math.max(1, Math.ceil(lineTotalRows.value / pageSize)));
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function dateValue(value) { return value ? String(value).slice(0, 10) : ''; }
function fillHeader(item) {
    form.projectId = item.projectId;
    form.siteId = item.siteId;
    form.supplierId = item.supplierId;
    form.purchaseNo = item.purchaseNo ?? '';
    form.localSupplier = item.localSupplier ?? '';
    form.supplierAddress = item.supplierAddress ?? '';
    form.purchaseDate = dateValue(item.purchaseDate);
    form.purchaseType = item.purchaseType || 'corporate';
    form.challanNo = item.challanNo ?? '';
    form.challanDate = dateValue(item.challanDate);
    form.notes = item.notes ?? '';
    form.status = item.status;
    summary.itemCount = Number(item.itemCount);
    summary.totalAmount = Number(item.totalAmount);
}
async function loadHeader() {
    if (!editing.value)
        return;
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        const item = corporatePurchaseRecords.find((entry) => entry.id === purchaseId.value);
        if (item)
            fillHeader(item);
        return;
    }
    const result = await api(`/corporate-purchases/${purchaseId.value}`);
    fillHeader(result.purchase);
}
async function loadLines() {
    if (!editing.value)
        return;
    if (import.meta.env.VITE_DEMO_MODE !== 'false') {
        const term = lineSearch.value.trim().toLowerCase();
        const matches = corporateLines.filter((item) => item.purchaseId === purchaseId.value && (!term || [item.productName, item.categoryName, item.siteName, item.notes].some((value) => value.toLowerCase().includes(term))));
        lineTotalRows.value = matches.length;
        lines.value = matches.slice((linePage.value - 1) * pageSize, linePage.value * pageSize).map((item) => ({ ...item }));
        return;
    }
    const result = await api(`/corporate-purchases/${purchaseId.value}/lines?page=${linePage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
    lines.value = result.items;
    lineTotalRows.value = result.total;
}
onMounted(async () => {
    loading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const options = await api('/corporate-purchases/options');
            projects.value = options.projects;
            sites.value = options.sites;
            suppliers.value = options.suppliers;
            categories.value = options.categories;
            subcategories.value = options.subcategories;
            products.value = options.products;
            units.value = options.units;
        }
        await loadHeader();
        await loadLines();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load corporate purchase information.';
    }
    finally {
        loading.value = false;
    }
});
watch(() => form.projectId, () => {
    if (form.siteId && !availableSites.value.some((site) => site.id === form.siteId))
        form.siteId = null;
    if (lineForm.siteId && !availableSites.value.some((site) => site.id === lineForm.siteId))
        lineForm.siteId = null;
});
function supplierChanged() { const supplier = suppliers.value.find((item) => item.id === form.supplierId); if (supplier)
    form.supplierAddress = supplier.address ?? ''; }
function categoryChanged() {
    if (lineForm.productId && !products.value.some((item) => item.id === lineForm.productId && item.categoryId === lineForm.categoryId))
        lineForm.productId = 0;
    if (lineForm.subcategoryId && !availableSubcategories.value.some((item) => item.id === lineForm.subcategoryId))
        lineForm.subcategoryId = null;
}
function productChanged() {
    const product = products.value.find((item) => item.id === lineForm.productId);
    if (!product)
        return;
    lineForm.categoryId = product.categoryId;
    lineForm.unitId = product.unitId ?? null;
    if (product.defaultPrice !== null && product.defaultPrice !== undefined)
        lineForm.unitPrice = Number(product.defaultPrice);
}
function resetLineForm() { Object.assign(lineForm, { id: null, categoryId: null, subcategoryId: null, productId: 0, unitId: null, siteId: form.siteId, quantity: 1, unitPrice: '', discount: '', notes: '' }); productSearch.value = ''; }
function addLine() { resetLineForm(); lineFormOpen.value = true; }
function editLine(item) { Object.assign(lineForm, { id: item.id, categoryId: item.categoryId, subcategoryId: item.subcategoryId, productId: item.productId ?? 0, unitId: item.unitId, siteId: item.siteId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount), notes: item.notes ?? '' }); productSearch.value = ''; lineFormOpen.value = true; }
async function saveHeader() {
    if (!form.projectId || !form.purchaseDate) {
        error.value = 'Project and purchase date are required.';
        return;
    }
    saving.value = true;
    error.value = '';
    saved.value = '';
    try {
        const payload = { ...form, siteId: form.siteId || null, supplierId: form.supplierId || null };
        let id = purchaseId.value;
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const result = await api(editing.value ? `/corporate-purchases/${id}` : '/corporate-purchases', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            id = result.id;
        }
        else {
            const project = projects.value.find((item) => item.id === form.projectId);
            const site = sites.value.find((item) => item.id === form.siteId);
            const supplier = suppliers.value.find((item) => item.id === form.supplierId);
            if (!editing.value)
                id = nextCorporatePurchaseId();
            const record = { id, projectId: form.projectId, projectCode: project.code, projectName: project.name, siteId: form.siteId, siteName: site?.name ?? '', supplierId: form.supplierId, supplierName: (supplier?.name ?? form.localSupplier) || 'Unspecified supplier', purchaseNo: form.purchaseNo, localSupplier: form.localSupplier, supplierAddress: form.supplierAddress, purchaseDate: form.purchaseDate, purchaseType: form.purchaseType, challanNo: form.challanNo, challanDate: form.challanDate, notes: form.notes, status: form.status, itemCount: summary.itemCount, totalQuantity: 0, totalAmount: summary.totalAmount };
            const index = corporatePurchaseRecords.findIndex((item) => item.id === id);
            if (index >= 0)
                corporatePurchaseRecords[index] = record;
            else
                corporatePurchaseRecords.unshift(record);
        }
        saved.value = editing.value ? 'Corporate purchase updated.' : 'Corporate purchase created. Add product lines below.';
        if (!editing.value)
            await router.replace(`/purchases/corporate/${id}/edit`);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the corporate purchase.';
    }
    finally {
        saving.value = false;
    }
}
async function saveLine() {
    if (!lineForm.productId || Number(lineForm.quantity) <= 0 || lineForm.unitPrice === '') {
        error.value = 'Select a product and enter a valid quantity and price.';
        return;
    }
    lineSaving.value = true;
    error.value = '';
    try {
        const payload = { categoryId: lineForm.categoryId, subcategoryId: lineForm.subcategoryId, productId: lineForm.productId, unitId: lineForm.unitId, siteId: lineForm.siteId, quantity: Number(lineForm.quantity), unitPrice: Number(lineForm.unitPrice), discount: Number(lineForm.discount || 0), notes: lineForm.notes };
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(lineForm.id ? `/corporate-purchases/${purchaseId.value}/lines/${lineForm.id}` : `/corporate-purchases/${purchaseId.value}/lines`, { method: lineForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        else {
            const product = products.value.find((item) => item.id === payload.productId);
            const category = categories.value.find((item) => item.id === payload.categoryId);
            const subcategory = subcategories.value.find((item) => item.id === payload.subcategoryId);
            const unit = units.value.find((item) => item.id === payload.unitId);
            const site = sites.value.find((item) => item.id === payload.siteId);
            const record = { id: lineForm.id ?? nextCorporateLineId(), purchaseId: purchaseId.value, categoryId: payload.categoryId, categoryName: category?.name ?? '', subcategoryId: payload.subcategoryId, subcategoryName: subcategory?.name ?? '', productId: product.id, productName: product.name, unitId: payload.unitId, unitName: unit?.name ?? '', siteId: payload.siteId, siteName: site?.name ?? '', quantity: payload.quantity, unitPrice: payload.unitPrice, discount: payload.discount, totalAmount: lineTotal.value, notes: payload.notes };
            const index = corporateLines.findIndex((item) => item.id === record.id);
            if (index >= 0)
                corporateLines[index] = record;
            else
                corporateLines.unshift(record);
            const purchase = corporatePurchaseRecords.find((item) => item.id === purchaseId.value);
            const purchaseLines = corporateLines.filter((item) => item.purchaseId === purchaseId.value);
            if (purchase) {
                purchase.itemCount = purchaseLines.length;
                purchase.totalQuantity = purchaseLines.reduce((sum, item) => sum + item.quantity, 0);
                purchase.totalAmount = purchaseLines.reduce((sum, item) => sum + item.totalAmount, 0);
                fillHeader(purchase);
            }
        }
        lineFormOpen.value = false;
        resetLineForm();
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the product line.';
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
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(`/corporate-purchases/${purchaseId.value}/lines/${pendingLineDelete.value}`, { method: 'DELETE' });
        else {
            const index = corporateLines.findIndex((item) => item.id === pendingLineDelete.value);
            if (index >= 0)
                corporateLines.splice(index, 1);
            const purchase = corporatePurchaseRecords.find((item) => item.id === purchaseId.value);
            const purchaseLines = corporateLines.filter((item) => item.purchaseId === purchaseId.value);
            if (purchase) {
                purchase.itemCount = purchaseLines.length;
                purchase.totalAmount = purchaseLines.reduce((sum, item) => sum + item.totalAmount, 0);
                fillHeader(purchase);
            }
        }
        pendingLineDelete.value = null;
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the product line.';
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
        deleteCheck.value = import.meta.env.VITE_DEMO_MODE === 'false' ? await api(`/corporate-purchases/${purchaseId.value}/delete-check`) : { canDelete: summary.itemCount === 0, references: { productLines: summary.itemCount } };
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
            await api(`/corporate-purchases/${purchaseId.value}`, { method: 'DELETE' });
        else {
            const index = corporatePurchaseRecords.findIndex((item) => item.id === purchaseId.value);
            if (index >= 0)
                corporatePurchaseRecords.splice(index, 1);
        }
        await router.push('/purchases/corporate');
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the corporate purchase.';
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
    ...{ class: "project-form-page corporate-purchase-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/purchases/corporate",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/purchases/corporate",
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
const __VLS_8 = {}.Building2;
/** @type {[typeof __VLS_components.Building2, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Corporate purchase' : 'New corporate purchase');
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.siteId),
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
    type: "date",
});
(__VLS_ctx.form.purchaseDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Corporate purchase number",
});
(__VLS_ctx.form.purchaseNo);
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
    placeholder: "Purchase or delivery notes",
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
    const __VLS_15 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        size: (16),
    }));
    const __VLS_17 = __VLS_16({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
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
    const __VLS_19 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        size: (16),
    }));
    const __VLS_21 = __VLS_20({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
}
const __VLS_23 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    to: "/purchases/corporate",
    ...{ class: "secondary-button" },
}));
const __VLS_25 = __VLS_24({
    to: "/purchases/corporate",
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
__VLS_26.slots.default;
var __VLS_26;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_27 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    size: (17),
}));
const __VLS_29 = __VLS_28({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save purchase' : 'Create purchase');
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "purchase-entries panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "purchase-entry-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "active" },
    });
    const __VLS_31 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        size: (17),
    }));
    const __VLS_33 = __VLS_32({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.summary.itemCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.summary.totalAmount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "purchase-entry-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "table-search" },
    });
    const __VLS_35 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        size: (16),
    }));
    const __VLS_37 = __VLS_36({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeyup: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.linePage = 1;
                __VLS_ctx.loadLines();
            } },
        placeholder: "Search product, category, or site…",
    });
    (__VLS_ctx.lineSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.linePage = 1;
                __VLS_ctx.loadLines();
            } },
        type: "button",
        ...{ class: "secondary-button" },
    });
    const __VLS_39 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: (15),
    }));
    const __VLS_41 = __VLS_40({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addLine) },
        type: "button",
        ...{ class: "primary-button" },
    });
    const __VLS_43 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        size: (16),
    }));
    const __VLS_45 = __VLS_44({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    if (__VLS_ctx.lineFormOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveLine) },
            ...{ class: "purchase-line-form corporate-line-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_47 = {}.PackagePlus;
        /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            size: (18),
        }));
        const __VLS_49 = __VLS_48({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lineForm.id ? 'Modify product line' : 'Add corporate product');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!(__VLS_ctx.lineFormOpen))
                        return;
                    __VLS_ctx.lineFormOpen = false;
                } },
            type: "button",
        });
        const __VLS_51 = {}.X;
        /** @type {[typeof __VLS_components.X, ]} */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            size: (17),
        }));
        const __VLS_53 = __VLS_52({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid three" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.categoryChanged) },
            value: (__VLS_ctx.lineForm.categoryId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (null),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.lineForm.subcategoryId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (null),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.availableSubcategories))) {
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_55 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
            size: (15),
        }));
        const __VLS_57 = __VLS_56({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Type product name…",
        });
        (__VLS_ctx.productSearch);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field full" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.productChanged) },
            value: (__VLS_ctx.lineForm.productId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
            disabled: true,
        });
        (__VLS_ctx.availableProducts.length);
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.availableProducts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (item.id),
                value: (item.id),
            });
            (item.name);
            (item.unitName ? ` — ${item.unitName}` : '');
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.lineForm.siteId),
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
            value: (__VLS_ctx.lineForm.unitId),
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
        (__VLS_ctx.lineForm.quantity);
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
        (__VLS_ctx.lineForm.unitPrice);
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
        (__VLS_ctx.lineForm.discount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field full" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Optional product notes",
        });
        (__VLS_ctx.lineForm.notes);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.money(__VLS_ctx.lineTotal));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    if (!(__VLS_ctx.lineFormOpen))
                        return;
                    __VLS_ctx.lineFormOpen = false;
                } },
            type: "button",
            ...{ class: "secondary-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "primary-button" },
            disabled: (__VLS_ctx.lineSaving),
        });
        const __VLS_59 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            size: (15),
        }));
        const __VLS_61 = __VLS_60({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        (__VLS_ctx.lineSaving ? 'Saving…' : 'Save product');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "purchase-lines-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table purchase-lines-table corporate-lines-table" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.lines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.productName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.subcategoryName || item.notes);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.categoryName || '—');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.siteName || 'General project');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(item.quantity).toLocaleString());
        (item.unitName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.money(item.unitPrice));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.money(item.discount));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.money(item.totalAmount));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "line-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    __VLS_ctx.editLine(item);
                } },
            type: "button",
        });
        const __VLS_63 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
            size: (14),
        }));
        const __VLS_65 = __VLS_64({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    __VLS_ctx.pendingLineDelete = item.id;
                } },
            type: "button",
            ...{ class: "danger" },
        });
        const __VLS_67 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            size: (14),
        }));
        const __VLS_69 = __VLS_68({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
    }
    if (!__VLS_ctx.lines.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_71 = {}.PackagePlus;
        /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
            size: (22),
        }));
        const __VLS_73 = __VLS_72({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "table-pagination purchase-line-pagination" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.lineTotalRows);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.linePage--;
                __VLS_ctx.loadLines();
            } },
        type: "button",
        disabled: (__VLS_ctx.linePage === 1),
    });
    const __VLS_75 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        size: (16),
    }));
    const __VLS_77 = __VLS_76({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.linePage);
    (__VLS_ctx.linePageCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.linePage++;
                __VLS_ctx.loadLines();
            } },
        type: "button",
        disabled: (__VLS_ctx.linePage === __VLS_ctx.linePageCount),
    });
    const __VLS_79 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        size: (16),
    }));
    const __VLS_81 = __VLS_80({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
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
    const __VLS_83 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        size: (18),
    }));
    const __VLS_85 = __VLS_84({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_87 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        size: (24),
    }));
    const __VLS_89 = __VLS_88({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
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
    const __VLS_91 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        size: (16),
    }));
    const __VLS_93 = __VLS_92({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    (__VLS_ctx.lineDeleting ? 'Deleting…' : 'Delete line');
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
    const __VLS_95 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
        size: (18),
    }));
    const __VLS_97 = __VLS_96({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_99 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        size: (24),
    }));
    const __VLS_101 = __VLS_100({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_103 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
            size: (18),
        }));
        const __VLS_105 = __VLS_104({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_104));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reference-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.productLines);
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
        const __VLS_107 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
            size: (16),
        }));
        const __VLS_109 = __VLS_108({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete purchase');
    }
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['corporate-purchase-form-page']} */ ;
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
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-entry-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['corporate-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['three']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['corporate-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-pagination']} */ ;
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
            Building2: Building2,
            Check: Check,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            PackagePlus: PackagePlus,
            Pencil: Pencil,
            Plus: Plus,
            Save: Save,
            Search: Search,
            Trash2: Trash2,
            X: X,
            ProjectSearchSelect: ProjectSearchSelect,
            editing: editing,
            projects: projects,
            suppliers: suppliers,
            categories: categories,
            units: units,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            lineFormOpen: lineFormOpen,
            lineSaving: lineSaving,
            lineSearch: lineSearch,
            productSearch: productSearch,
            lines: lines,
            linePage: linePage,
            lineTotalRows: lineTotalRows,
            pendingLineDelete: pendingLineDelete,
            lineDeleting: lineDeleting,
            deleteOpen: deleteOpen,
            deleteLoading: deleteLoading,
            deleteCheck: deleteCheck,
            deleteText: deleteText,
            deleting: deleting,
            summary: summary,
            form: form,
            lineForm: lineForm,
            availableSites: availableSites,
            availableSubcategories: availableSubcategories,
            availableProducts: availableProducts,
            lineTotal: lineTotal,
            linePageCount: linePageCount,
            money: money,
            loadLines: loadLines,
            supplierChanged: supplierChanged,
            categoryChanged: categoryChanged,
            productChanged: productChanged,
            addLine: addLine,
            editLine: editLine,
            saveHeader: saveHeader,
            saveLine: saveLine,
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
