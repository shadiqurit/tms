import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, ArrowLeftRight, Check, ChevronLeft, ChevronRight, MapPin, PackagePlus, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
import { unitOptions as demoUnits } from '../data/sitePurchases';
import { corporateCategories as demoCategories, corporateLines as demoPurchaseLines, corporateProducts as demoProducts, corporatePurchaseRecords as demoPurchases } from '../data/corporatePurchases';
import { corporateTransferLines, corporateTransferRecords, nextCorporateTransferId, nextCorporateTransferLineId } from '../data/corporateTransfers';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'corporate-transfer-edit');
const transferId = computed(() => Number(route.params.id));
const today = new Date().toISOString().slice(0, 10);
const projects = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const sites = ref(demoSites.map(({ id, projectId, name, address }) => ({ id, projectId, name, address })));
const categories = ref(demoCategories.filter((category) => demoProducts.some((product) => product.categoryId === category.id)));
const products = ref([...demoProducts]);
const units = ref([...demoUnits]);
const loading = ref(false);
const saving = ref(false);
const saved = ref('');
const error = ref('');
const lines = ref([]);
const lineSearch = ref('');
const linePage = ref(1);
const lineTotalRows = ref(0);
const pageSize = 20;
const lineFormOpen = ref(false);
const lineSaving = ref(false);
const productSearch = ref('');
const pendingLineDelete = ref(null);
const lineDeleting = ref(false);
const stockByProduct = ref({});
const stockLoading = ref(false);
const stockMessage = ref('');
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleteCheck = ref(null);
const deleteText = ref('');
const deleting = ref(false);
const summary = reactive({ itemCount: 0, totalAmount: 0 });
const form = reactive({ transferNo: '', fromProjectId: Number(route.query.projectId || 0), fromSiteId: null, receiveProjectId: 0, receiveSiteId: null, transferDate: today, notes: '', status: 'posted' });
const lineForm = reactive({ id: null, categoryId: null, productId: 0, unitId: null, destinationSiteId: null, quantity: 1, unitPrice: '', otherCost: '', otherExpense: '', transferDate: '', notes: '' });
const sourceSites = computed(() => sites.value.filter((site) => site.projectId === form.fromProjectId));
const receiveSites = computed(() => sites.value.filter((site) => site.projectId === form.receiveProjectId));
const availableProducts = computed(() => { const term = productSearch.value.trim().toLowerCase(); if (!lineForm.categoryId)
    return []; return products.value.filter((item) => item.categoryId === lineForm.categoryId && (!term || item.name.toLowerCase().includes(term))); });
const selectedStock = computed(() => lineForm.productId ? Number(stockByProduct.value[lineForm.productId] ?? 0) : null);
const lineTotal = computed(() => Number(lineForm.quantity || 0) * Number(lineForm.unitPrice || 0) + Number(lineForm.otherCost || 0) + Number(lineForm.otherExpense || 0));
const linePageCount = computed(() => Math.max(1, Math.ceil(lineTotalRows.value / pageSize)));
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(Number(value)); }
function dateValue(value) { return value ? String(value).slice(0, 10) : ''; }
function fillHeader(item) { form.transferNo = item.transferNo ?? ''; form.fromProjectId = Number(item.fromProjectId); form.fromSiteId = item.fromSiteId; form.receiveProjectId = Number(item.receiveProjectId); form.receiveSiteId = item.receiveSiteId; form.transferDate = dateValue(item.transferDate); form.notes = item.notes ?? ''; form.status = item.status; summary.itemCount = Number(item.itemCount); summary.totalAmount = Number(item.totalAmount); }
async function loadHeader() { if (!editing.value)
    return; if (import.meta.env.VITE_DEMO_MODE !== 'false') {
    const item = corporateTransferRecords.find((entry) => entry.id === transferId.value);
    if (item)
        fillHeader(item);
    return;
} const result = await api(`/corporate-transfers/${transferId.value}`); fillHeader(result.transfer); }
async function loadLines() { if (!editing.value)
    return; if (import.meta.env.VITE_DEMO_MODE !== 'false') {
    const term = lineSearch.value.trim().toLowerCase();
    const matches = corporateTransferLines.filter((item) => item.transferId === transferId.value && (!term || [item.productName, item.categoryName, item.destinationSiteName, item.notes].some((value) => value.toLowerCase().includes(term))));
    lineTotalRows.value = matches.length;
    lines.value = matches.slice((linePage.value - 1) * pageSize, linePage.value * pageSize).map((item) => ({ ...item }));
    return;
} const result = await api(`/corporate-transfers/${transferId.value}/lines?page=${linePage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`); lines.value = result.items; lineTotalRows.value = result.total; }
onMounted(async () => { loading.value = true; try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
        const options = await api('/corporate-transfers/options');
        projects.value = options.projects;
        sites.value = options.sites;
        categories.value = options.categories;
        products.value = options.products;
        units.value = options.units;
    }
    await loadHeader();
    await loadLines();
}
catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load corporate transfer.';
}
finally {
    loading.value = false;
} });
watch(() => form.fromProjectId, () => { if (form.fromSiteId && !sourceSites.value.some((site) => site.id === form.fromSiteId))
    form.fromSiteId = null; });
watch(() => form.receiveProjectId, () => { if (form.receiveSiteId && !receiveSites.value.some((site) => site.id === form.receiveSiteId))
    form.receiveSiteId = null; if (lineForm.destinationSiteId && !receiveSites.value.some((site) => site.id === lineForm.destinationSiteId))
    lineForm.destinationSiteId = null; });
function demoStock(productId, lineId) {
    const siteMatches = (siteId) => !form.fromSiteId || siteId === form.fromSiteId;
    const purchased = demoPurchaseLines.filter((line) => { const header = demoPurchases.find((item) => item.id === line.purchaseId); return line.productId === productId && header?.projectId === form.fromProjectId && header.status === 'posted' && siteMatches(line.siteId ?? header.siteId); }).reduce((sum, line) => sum + line.quantity, 0);
    const received = corporateTransferLines.filter((line) => { const header = corporateTransferRecords.find((item) => item.id === line.transferId); return line.productId === productId && header?.receiveProjectId === form.fromProjectId && header.status === 'posted' && siteMatches(line.destinationSiteId ?? header.receiveSiteId); }).reduce((sum, line) => sum + line.quantity, 0);
    const sent = corporateTransferLines.filter((line) => { const header = corporateTransferRecords.find((item) => item.id === line.transferId); return line.productId === productId && line.id !== lineId && header?.fromProjectId === form.fromProjectId && header.status === 'posted' && siteMatches(header.fromSiteId); }).reduce((sum, line) => sum + line.quantity, 0);
    return Math.max(0, purchased + received - sent);
}
async function loadStock() {
    stockByProduct.value = {};
    stockMessage.value = '';
    if (!lineForm.categoryId)
        return;
    stockLoading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const suffix = lineForm.id ? `&lineId=${lineForm.id}` : '';
            const result = await api(`/corporate-transfers/${transferId.value}/stock?categoryId=${lineForm.categoryId}${suffix}`);
            stockByProduct.value = Object.fromEntries(result.stock.map((item) => [item.productId, Number(item.availableStock)]));
        }
        else {
            stockByProduct.value = Object.fromEntries(availableProducts.value.map((item) => [item.id, demoStock(item.id, lineForm.id)]));
        }
    }
    catch (reason) {
        stockMessage.value = reason instanceof Error ? reason.message : 'Could not check source stock.';
    }
    finally {
        stockLoading.value = false;
    }
}
async function categoryChanged() { if (lineForm.productId && !products.value.some((item) => item.id === lineForm.productId && item.categoryId === lineForm.categoryId))
    lineForm.productId = 0; await loadStock(); }
function productChanged() { const product = products.value.find((item) => item.id === lineForm.productId); if (!product)
    return; lineForm.categoryId = product.categoryId; lineForm.unitId = product.unitId ?? null; if (product.defaultPrice !== null && product.defaultPrice !== undefined)
    lineForm.unitPrice = Number(product.defaultPrice); }
function resetLineForm() { Object.assign(lineForm, { id: null, categoryId: null, productId: 0, unitId: null, destinationSiteId: form.receiveSiteId, quantity: 1, unitPrice: '', otherCost: '', otherExpense: '', transferDate: form.transferDate, notes: '' }); productSearch.value = ''; }
function addLine() { error.value = ''; resetLineForm(); stockByProduct.value = {}; stockMessage.value = ''; lineFormOpen.value = true; }
function closeLineForm() { lineFormOpen.value = false; error.value = ''; }
async function editLine(item) { error.value = ''; Object.assign(lineForm, { id: item.id, categoryId: item.categoryId, productId: item.productId ?? 0, unitId: item.unitId, destinationSiteId: item.destinationSiteId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), otherCost: Number(item.otherCost), otherExpense: Number(item.otherExpense), transferDate: dateValue(item.transferDate), notes: item.notes ?? '' }); productSearch.value = ''; lineFormOpen.value = true; await loadStock(); }
async function saveHeader() {
    if (!form.fromProjectId || !form.receiveProjectId || !form.transferDate) {
        error.value = 'Source project, receiving project, and transfer date are required.';
        return;
    }
    if (form.fromProjectId === form.receiveProjectId && form.fromSiteId && form.fromSiteId === form.receiveSiteId) {
        error.value = 'For a site-to-site transfer, source and receiving sites must be different.';
        return;
    }
    saving.value = true;
    error.value = '';
    saved.value = '';
    try {
        let id = transferId.value;
        const payload = { ...form, fromSiteId: form.fromSiteId || null, receiveSiteId: form.receiveSiteId || null };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const result = await api(editing.value ? `/corporate-transfers/${id}` : '/corporate-transfers', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            id = result.id;
        }
        else {
            const fromProject = projects.value.find((item) => item.id === form.fromProjectId);
            const receiveProject = projects.value.find((item) => item.id === form.receiveProjectId);
            const fromSite = sites.value.find((item) => item.id === form.fromSiteId);
            const receiveSite = sites.value.find((item) => item.id === form.receiveSiteId);
            if (!editing.value)
                id = nextCorporateTransferId();
            const record = { id, transferNo: form.transferNo, transferDate: form.transferDate, notes: form.notes, fromProjectId: form.fromProjectId, fromProjectName: fromProject.name, fromProjectCode: fromProject.code, fromSiteId: form.fromSiteId, fromSiteName: fromSite?.name ?? '', receiveProjectId: form.receiveProjectId, receiveProjectName: receiveProject.name, receiveProjectCode: receiveProject.code, receiveSiteId: form.receiveSiteId, receiveSiteName: receiveSite?.name ?? '', status: form.status, itemCount: summary.itemCount, totalQuantity: 0, totalAmount: summary.totalAmount };
            const index = corporateTransferRecords.findIndex((item) => item.id === id);
            if (index >= 0)
                corporateTransferRecords[index] = record;
            else
                corporateTransferRecords.unshift(record);
        }
        saved.value = editing.value ? 'Corporate transfer updated.' : 'Corporate transfer created. Add material lines below.';
        if (!editing.value)
            await router.replace(`/purchases/transfers/${id}/edit`);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the corporate transfer.';
    }
    finally {
        saving.value = false;
    }
}
async function saveLine() {
    if (!lineForm.categoryId || !lineForm.productId || Number(lineForm.quantity) <= 0 || lineForm.unitPrice === '') {
        error.value = 'Select a category and corporate product, then enter a valid quantity and price.';
        return;
    }
    if (selectedStock.value !== null && Number(lineForm.quantity) > selectedStock.value + 0.00005) {
        error.value = `Insufficient source stock. Available: ${selectedStock.value.toLocaleString()} ${units.value.find((item) => item.id === lineForm.unitId)?.name ?? ''}.`;
        return;
    }
    lineSaving.value = true;
    error.value = '';
    try {
        const payload = { categoryId: lineForm.categoryId, productId: lineForm.productId, unitId: lineForm.unitId, destinationSiteId: lineForm.destinationSiteId, quantity: Number(lineForm.quantity), unitPrice: Number(lineForm.unitPrice), otherCost: Number(lineForm.otherCost || 0), otherExpense: Number(lineForm.otherExpense || 0), transferDate: lineForm.transferDate, notes: lineForm.notes };
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await api(lineForm.id ? `/corporate-transfers/${transferId.value}/lines/${lineForm.id}` : `/corporate-transfers/${transferId.value}/lines`, { method: lineForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        else {
            const product = products.value.find((item) => item.id === payload.productId);
            const category = categories.value.find((item) => item.id === payload.categoryId);
            const unit = units.value.find((item) => item.id === payload.unitId);
            const site = sites.value.find((item) => item.id === payload.destinationSiteId);
            const record = { id: lineForm.id ?? nextCorporateTransferLineId(), transferId: transferId.value, categoryId: payload.categoryId, categoryName: category?.name ?? '', productId: product.id, productName: product.name, unitId: payload.unitId, unitName: unit?.name ?? '', destinationSiteId: payload.destinationSiteId, destinationSiteName: site?.name ?? '', quantity: payload.quantity, unitPrice: payload.unitPrice, otherCost: payload.otherCost, otherExpense: payload.otherExpense, totalAmount: lineTotal.value, notes: payload.notes, transferDate: payload.transferDate };
            const index = corporateTransferLines.findIndex((item) => item.id === record.id);
            if (index >= 0)
                corporateTransferLines[index] = record;
            else
                corporateTransferLines.unshift(record);
            const transfer = corporateTransferRecords.find((item) => item.id === transferId.value);
            const allLines = corporateTransferLines.filter((item) => item.transferId === transferId.value);
            if (transfer) {
                transfer.itemCount = allLines.length;
                transfer.totalQuantity = allLines.reduce((sum, item) => sum + item.quantity, 0);
                transfer.totalAmount = allLines.reduce((sum, item) => sum + item.totalAmount, 0);
                fillHeader(transfer);
            }
        }
        lineFormOpen.value = false;
        resetLineForm();
        await loadLines();
        if (import.meta.env.VITE_DEMO_MODE === 'false')
            await loadHeader();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the transfer line.';
    }
    finally {
        lineSaving.value = false;
    }
}
async function confirmLineDelete() { if (!pendingLineDelete.value)
    return; lineDeleting.value = true; try {
    if (import.meta.env.VITE_DEMO_MODE === 'false')
        await api(`/corporate-transfers/${transferId.value}/lines/${pendingLineDelete.value}`, { method: 'DELETE' });
    else {
        const index = corporateTransferLines.findIndex((item) => item.id === pendingLineDelete.value);
        if (index >= 0)
            corporateTransferLines.splice(index, 1);
    }
    pendingLineDelete.value = null;
    await loadLines();
    await loadHeader();
}
catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not delete the transfer line.';
    pendingLineDelete.value = null;
}
finally {
    lineDeleting.value = false;
} }
async function checkDelete() { deleteOpen.value = true; deleteText.value = ''; deleteCheck.value = null; deleteLoading.value = true; try {
    deleteCheck.value = import.meta.env.VITE_DEMO_MODE === 'false' ? await api(`/corporate-transfers/${transferId.value}/delete-check`) : { canDelete: summary.itemCount === 0, references: { productLines: summary.itemCount } };
}
catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not check transfer references.';
    deleteOpen.value = false;
}
finally {
    deleteLoading.value = false;
} }
async function removeTransfer() { if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE')
    return; deleting.value = true; try {
    if (import.meta.env.VITE_DEMO_MODE === 'false')
        await api(`/corporate-transfers/${transferId.value}`, { method: 'DELETE' });
    else {
        const index = corporateTransferRecords.findIndex((item) => item.id === transferId.value);
        if (index >= 0)
            corporateTransferRecords.splice(index, 1);
    }
    await router.push('/purchases/transfers');
}
catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not delete the corporate transfer.';
    deleteOpen.value = false;
}
finally {
    deleting.value = false;
} }
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "project-form-page corporate-transfer-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/purchases/transfers",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/purchases/transfers",
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
const __VLS_8 = {}.ArrowLeftRight;
/** @type {[typeof __VLS_components.ArrowLeftRight, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Corporate transfer' : 'New corporate transfer');
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
    ...{ class: "form-grid transfer-route-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Transfer reference",
});
(__VLS_ctx.form.transferNo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.transferDate);
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
    ...{ class: "transfer-endpoint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_12 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    size: (15),
}));
const __VLS_14 = __VLS_13({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
/** @type {[typeof ProjectSearchSelect, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(ProjectSearchSelect, new ProjectSearchSelect({
    modelValue: (__VLS_ctx.form.fromProjectId),
    projects: (__VLS_ctx.projects),
}));
const __VLS_17 = __VLS_16({
    modelValue: (__VLS_ctx.form.fromProjectId),
    projects: (__VLS_ctx.projects),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.fromSiteId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
for (const [site] of __VLS_getVForSourceType((__VLS_ctx.sourceSites))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (site.id),
        value: (site.id),
    });
    (site.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transfer-arrow" },
});
const __VLS_19 = {}.ArrowLeftRight;
/** @type {[typeof __VLS_components.ArrowLeftRight, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    size: (24),
}));
const __VLS_21 = __VLS_20({
    size: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transfer-endpoint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_23 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    size: (15),
}));
const __VLS_25 = __VLS_24({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
/** @type {[typeof ProjectSearchSelect, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(ProjectSearchSelect, new ProjectSearchSelect({
    modelValue: (__VLS_ctx.form.receiveProjectId),
    projects: (__VLS_ctx.projects),
}));
const __VLS_28 = __VLS_27({
    modelValue: (__VLS_ctx.form.receiveProjectId),
    projects: (__VLS_ctx.projects),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.receiveSiteId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
for (const [site] of __VLS_getVForSourceType((__VLS_ctx.receiveSites))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (site.id),
        value: (site.id),
    });
    (site.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Transfer or receiving notes",
});
(__VLS_ctx.form.notes);
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
    const __VLS_30 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        size: (16),
    }));
    const __VLS_32 = __VLS_31({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
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
    const __VLS_34 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        size: (16),
    }));
    const __VLS_36 = __VLS_35({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
}
const __VLS_38 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    to: "/purchases/transfers",
    ...{ class: "secondary-button" },
}));
const __VLS_40 = __VLS_39({
    to: "/purchases/transfers",
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
var __VLS_41;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_42 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    size: (17),
}));
const __VLS_44 = __VLS_43({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save transfer' : 'Create transfer');
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
    const __VLS_46 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
        size: (17),
    }));
    const __VLS_48 = __VLS_47({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
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
    const __VLS_50 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        size: (16),
    }));
    const __VLS_52 = __VLS_51({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeyup: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.linePage = 1;
                __VLS_ctx.loadLines();
            } },
        placeholder: "Search product, category, or destination…",
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
    const __VLS_54 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
        size: (15),
    }));
    const __VLS_56 = __VLS_55({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addLine) },
        type: "button",
        ...{ class: "primary-button" },
    });
    const __VLS_58 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        size: (16),
    }));
    const __VLS_60 = __VLS_59({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "purchase-lines-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table purchase-lines-table transfer-lines-table" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.lines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Product",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.productName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.notes);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Category",
        });
        (item.categoryName || '—');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Destination",
        });
        (item.destinationSiteName || (__VLS_ctx.form.receiveSiteId ? 'Header receiving site' : 'Receiving project'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Quantity",
        });
        (Number(item.quantity).toLocaleString());
        (item.unitName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Unit price",
        });
        (__VLS_ctx.money(item.unitPrice));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Other cost",
        });
        (__VLS_ctx.money(item.otherCost));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Other expense",
        });
        (__VLS_ctx.money(item.otherExpense));
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
                    __VLS_ctx.editLine(item);
                } },
            type: "button",
        });
        const __VLS_62 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
            size: (14),
        }));
        const __VLS_64 = __VLS_63({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_63));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editing))
                        return;
                    __VLS_ctx.pendingLineDelete = item.id;
                } },
            type: "button",
            ...{ class: "danger" },
        });
        const __VLS_66 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
            size: (14),
        }));
        const __VLS_68 = __VLS_67({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    }
    if (!__VLS_ctx.lines.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "9",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_70 = {}.PackagePlus;
        /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
            size: (22),
        }));
        const __VLS_72 = __VLS_71({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
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
    const __VLS_74 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        size: (16),
    }));
    const __VLS_76 = __VLS_75({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
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
    const __VLS_78 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
        size: (16),
    }));
    const __VLS_80 = __VLS_79({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_79));
}
if (__VLS_ctx.lineFormOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveLine) },
        ...{ class: "purchase-line-form purchase-line-modal corporate-line-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_82 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        size: (18),
    }));
    const __VLS_84 = __VLS_83({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.lineForm.id ? 'Modify transfer line' : 'Add transferred product');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
    });
    const __VLS_86 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
        size: (17),
    }));
    const __VLS_88 = __VLS_87({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid three" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.categoryChanged) },
        value: (__VLS_ctx.lineForm.categoryId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
        disabled: true,
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_90 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        size: (15),
    }));
    const __VLS_92 = __VLS_91({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        disabled: (!__VLS_ctx.lineForm.categoryId),
        placeholder: "Type product name…",
    });
    (__VLS_ctx.productSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.productChanged) },
        value: (__VLS_ctx.lineForm.productId),
        disabled: (!__VLS_ctx.lineForm.categoryId || __VLS_ctx.stockLoading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
        disabled: true,
    });
    (!__VLS_ctx.lineForm.categoryId ? 'Select category first' : __VLS_ctx.stockLoading ? 'Checking source stock…' : `Select product (${__VLS_ctx.availableProducts.length} in category)`);
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.availableProducts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
            disabled: (Number(__VLS_ctx.stockByProduct[item.id] ?? 0) <= 0),
        });
        (item.name);
        (item.unitName ? ` — ${item.unitName}` : '');
        (Number(__VLS_ctx.stockByProduct[item.id] ?? 0).toLocaleString());
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stock-check full" },
        ...{ class: ({ unavailable: __VLS_ctx.selectedStock !== null && __VLS_ctx.selectedStock <= 0 }) },
    });
    const __VLS_94 = {}.PackagePlus;
    /** @type {[typeof __VLS_components.PackagePlus, ]} */ ;
    // @ts-ignore
    const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
        size: (17),
    }));
    const __VLS_96 = __VLS_95({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    if (__VLS_ctx.stockLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else if (__VLS_ctx.stockMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.stockMessage);
    }
    else if (__VLS_ctx.selectedStock !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedStock.toLocaleString());
        (__VLS_ctx.units.find((item) => item.id === __VLS_ctx.lineForm.unitId)?.name ?? '');
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.lineForm.destinationSiteId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [site] of __VLS_getVForSourceType((__VLS_ctx.receiveSites))) {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
    });
    (__VLS_ctx.lineForm.transferDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0.0001",
        max: (__VLS_ctx.selectedStock ?? undefined),
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
    (__VLS_ctx.lineForm.otherCost);
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
    (__VLS_ctx.lineForm.otherExpense);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Optional line notes",
    });
    (__VLS_ctx.lineForm.notes);
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error modal-error" },
        });
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.lineTotal));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeLineForm) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.lineSaving || __VLS_ctx.stockLoading || __VLS_ctx.selectedStock === null || __VLS_ctx.selectedStock <= 0),
    });
    const __VLS_98 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
        size: (15),
    }));
    const __VLS_100 = __VLS_99({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_99));
    (__VLS_ctx.lineSaving ? 'Saving…' : __VLS_ctx.lineForm.id ? 'Update product' : 'Add product');
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
    const __VLS_102 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        size: (18),
    }));
    const __VLS_104 = __VLS_103({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_106 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
        size: (24),
    }));
    const __VLS_108 = __VLS_107({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_107));
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
    const __VLS_110 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        size: (16),
    }));
    const __VLS_112 = __VLS_111({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
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
    const __VLS_114 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        size: (18),
    }));
    const __VLS_116 = __VLS_115({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_118 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        size: (24),
    }));
    const __VLS_120 = __VLS_119({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_122 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
            size: (18),
        }));
        const __VLS_124 = __VLS_123({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_123));
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
            ...{ onClick: (__VLS_ctx.removeTransfer) },
            ...{ class: "danger-button" },
            disabled: (__VLS_ctx.deleteText !== 'DELETE' || __VLS_ctx.deleting),
        });
        const __VLS_126 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
            size: (16),
        }));
        const __VLS_128 = __VLS_127({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete transfer');
    }
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['corporate-transfer-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-header-form']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transfer-route-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['transfer-endpoint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['transfer-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transfer-endpoint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
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
/** @type {__VLS_StyleScopedClasses['purchase-lines-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transfer-lines-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-line-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['corporate-line-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['three']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-check']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
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
            ArrowLeftRight: ArrowLeftRight,
            Check: Check,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            MapPin: MapPin,
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
            categories: categories,
            units: units,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            lines: lines,
            lineSearch: lineSearch,
            linePage: linePage,
            lineTotalRows: lineTotalRows,
            lineFormOpen: lineFormOpen,
            lineSaving: lineSaving,
            productSearch: productSearch,
            pendingLineDelete: pendingLineDelete,
            lineDeleting: lineDeleting,
            stockByProduct: stockByProduct,
            stockLoading: stockLoading,
            stockMessage: stockMessage,
            deleteOpen: deleteOpen,
            deleteLoading: deleteLoading,
            deleteCheck: deleteCheck,
            deleteText: deleteText,
            deleting: deleting,
            summary: summary,
            form: form,
            lineForm: lineForm,
            sourceSites: sourceSites,
            receiveSites: receiveSites,
            availableProducts: availableProducts,
            selectedStock: selectedStock,
            lineTotal: lineTotal,
            linePageCount: linePageCount,
            money: money,
            loadLines: loadLines,
            categoryChanged: categoryChanged,
            productChanged: productChanged,
            addLine: addLine,
            closeLineForm: closeLineForm,
            editLine: editLine,
            saveHeader: saveHeader,
            saveLine: saveLine,
            confirmLineDelete: confirmLineDelete,
            checkDelete: checkDelete,
            removeTransfer: removeTransfer,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
