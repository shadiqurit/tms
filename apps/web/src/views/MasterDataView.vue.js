import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { AlertTriangle, Boxes, Check, Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { materialOptions, supplierOptions, unitOptions } from '../data/sitePurchases';
import { corporateCategories, corporateProducts } from '../data/corporatePurchases';
const tabDefinitions = [
    { key: 'suppliers', label: 'Suppliers', singular: 'supplier', short: 'Supplier contacts and types' },
    { key: 'units', label: 'UOM', singular: 'UOM', short: 'Units of measurement' },
    { key: 'materials', label: 'Raw materials', singular: 'raw material', short: 'Site purchase materials' },
    { key: 'categories', label: 'Product categories', singular: 'product category', short: 'Corporate product groups' },
    { key: 'products', label: 'Corporate products', singular: 'corporate product', short: 'Corporate purchase catalogue' },
];
const supplierTypeOptions = [
    { value: 'L', label: 'Local' },
    { value: 'C', label: 'Corporate' },
    { value: 'I', label: 'Import' },
    { value: 'O', label: 'Others' },
];
const suppliers = ref(supplierOptions.map((item) => ({ id: item.id, code: item.code ?? null, name: item.name, address: item.address ?? null, contactPerson: null, phone: item.phone ?? null, email: null, supplierType: item.supplierType ?? null, status: 'active', usageCount: 0 })));
const units = ref(unitOptions.map((item) => ({ id: item.id, code: item.code ?? null, name: item.name, description: null, status: 'active', usageCount: 0 })));
const materials = ref(materialOptions.map((item) => ({ id: item.id, name: item.name, unitId: item.unitId ?? null, unitName: item.unitName ?? null, details: null, materialType: null, status: 'active', usageCount: 0 })));
const categories = ref(corporateCategories.map((item) => ({ id: item.id, name: item.name, status: 'active', usageCount: 0 })));
const products = ref(corporateProducts.map((item) => ({ id: item.id, categoryId: item.categoryId, categoryName: corporateCategories.find((category) => category.id === item.categoryId)?.name ?? null, unitId: item.unitId ?? null, unitName: item.unitName ?? null, name: item.name, description: item.description ?? null, defaultPrice: item.defaultPrice, status: 'active', usageCount: 0 })));
const tab = ref('suppliers');
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saved = ref('');
const editingId = ref(null);
const entryOpen = ref(false);
const supplierForm = reactive({ code: '', name: '', address: '', contactPerson: '', phone: '', email: '', supplierType: '', status: 'active' });
const unitForm = reactive({ name: '', code: '', description: '', status: 'active' });
const materialForm = reactive({ name: '', unitId: null, details: '', materialType: '', status: 'active' });
const categoryForm = reactive({ name: '', status: 'active' });
const productForm = reactive({ categoryId: null, unitId: null, name: '', description: '', defaultPrice: null, status: 'active' });
const deleteTarget = ref(null);
const deleteLoading = ref(false);
const deleting = ref(false);
const currentDefinition = computed(() => tabDefinitions.find((item) => item.key === tab.value));
const currentItems = computed(() => ({ suppliers: suppliers.value, units: units.value, materials: materials.value, categories: categories.value, products: products.value })[tab.value]);
const filteredItems = computed(() => { const term = search.value.trim().toLowerCase(); return currentItems.value.filter((item) => !term || item.name.toLowerCase().includes(term) || metadata(item).toLowerCase().includes(term)); });
const activeCount = computed(() => currentItems.value.filter((item) => item.status === 'active').length);
function metadata(item) {
    if (tab.value === 'suppliers') {
        const record = item;
        return [record.code, record.phone, supplierTypeOptions.find((option) => option.value === record.supplierType)?.label].filter(Boolean).join(' · ') || 'Supplier';
    }
    if (tab.value === 'units') {
        const record = item;
        return [record.code, record.description].filter(Boolean).join(' · ') || 'Unit of measurement';
    }
    if (tab.value === 'materials') {
        const record = item;
        return [record.unitName, record.materialType].filter(Boolean).join(' · ') || 'Raw material';
    }
    if (tab.value === 'products') {
        const record = item;
        return [record.categoryName, record.unitName, record.defaultPrice == null ? '' : `BDT ${Number(record.defaultPrice).toLocaleString()}`].filter(Boolean).join(' · ') || 'Corporate product';
    }
    return 'Corporate product category';
}
async function loadData(showLoading = true) {
    if (import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    if (showLoading)
        loading.value = true;
    try {
        const result = await api('/master-data');
        suppliers.value = result.suppliers;
        units.value = result.units;
        materials.value = result.materials;
        categories.value = result.categories;
        products.value = result.products;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load master setup.';
    }
    finally {
        if (showLoading)
            loading.value = false;
    }
}
function closeEntry() {
    if (saving.value)
        return;
    entryOpen.value = false;
    resetForm();
}
function handleEscape(event) {
    if (event.key !== 'Escape')
        return;
    if (deleteTarget.value)
        deleteTarget.value = null;
    else if (entryOpen.value)
        closeEntry();
}
onMounted(() => {
    loadData();
    window.addEventListener('keydown', handleEscape);
});
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape));
function resetForm() {
    editingId.value = null;
    error.value = '';
    saved.value = '';
    Object.assign(supplierForm, { code: '', name: '', address: '', contactPerson: '', phone: '', email: '', supplierType: '', status: 'active' });
    Object.assign(unitForm, { name: '', code: '', description: '', status: 'active' });
    Object.assign(materialForm, { name: '', unitId: null, details: '', materialType: '', status: 'active' });
    Object.assign(categoryForm, { name: '', status: 'active' });
    Object.assign(productForm, { categoryId: null, unitId: null, name: '', description: '', defaultPrice: null, status: 'active' });
}
function openNewRecord() {
    resetForm();
    entryOpen.value = true;
}
watch(tab, () => { search.value = ''; entryOpen.value = false; resetForm(); });
function editRecord(item) {
    editingId.value = item.id;
    error.value = '';
    saved.value = '';
    if (tab.value === 'suppliers') {
        const record = item;
        Object.assign(supplierForm, { ...record, code: record.code ?? '', address: record.address ?? '', contactPerson: record.contactPerson ?? '', phone: record.phone ?? '', email: record.email ?? '', supplierType: record.supplierType ?? '' });
    }
    else if (tab.value === 'units') {
        const record = item;
        Object.assign(unitForm, { ...record, code: record.code ?? '', description: record.description ?? '' });
    }
    else if (tab.value === 'materials') {
        const record = item;
        Object.assign(materialForm, { ...record, details: record.details ?? '', materialType: record.materialType ?? '' });
    }
    else if (tab.value === 'categories')
        Object.assign(categoryForm, item);
    else {
        const record = item;
        Object.assign(productForm, { ...record, description: record.description ?? '', defaultPrice: record.defaultPrice == null ? null : Number(record.defaultPrice) });
    }
    entryOpen.value = true;
}
function payload() {
    if (tab.value === 'suppliers')
        return { ...supplierForm };
    if (tab.value === 'units')
        return { ...unitForm };
    if (tab.value === 'materials')
        return { ...materialForm };
    if (tab.value === 'categories')
        return { ...categoryForm };
    return { ...productForm, defaultPrice: productForm.defaultPrice === null || productForm.defaultPrice === '' ? null : Number(productForm.defaultPrice) };
}
function demoRecord(id, data) {
    const base = { id, ...data, usageCount: currentItems.value.find((item) => item.id === id)?.usageCount ?? 0 };
    if (tab.value === 'materials') {
        const record = base;
        record.unitName = units.value.find((item) => item.id === record.unitId)?.name ?? null;
    }
    if (tab.value === 'products') {
        const record = base;
        record.categoryName = categories.value.find((item) => item.id === record.categoryId)?.name ?? null;
        record.unitName = units.value.find((item) => item.id === record.unitId)?.name ?? null;
    }
    return base;
}
async function saveRecord() {
    error.value = '';
    saved.value = '';
    const data = payload();
    if (!String(data.name ?? '').trim()) {
        error.value = 'Enter the name.';
        return;
    }
    if (tab.value === 'suppliers' && !supplierForm.supplierType) {
        error.value = 'Select the supplier type.';
        return;
    }
    saving.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editingId.value ? `/master-data/${tab.value}/${editingId.value}` : `/master-data/${tab.value}`, { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(data) });
            await loadData(false);
        }
        else {
            const id = editingId.value ?? Math.max(0, ...currentItems.value.map((item) => item.id)) + 1;
            const record = demoRecord(id, data);
            const list = currentItems.value;
            const index = list.findIndex((item) => item.id === id);
            if (index >= 0)
                list[index] = record;
            else
                list.unshift(record);
        }
        const message = editingId.value ? 'Master record updated.' : 'Master record added.';
        resetForm();
        entryOpen.value = false;
        saved.value = message;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the master record.';
    }
    finally {
        saving.value = false;
    }
}
async function requestDelete(item) {
    deleteTarget.value = { id: item.id, name: item.name, kind: tab.value, canDelete: false, references: 0 };
    deleteLoading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            const result = await api(`/master-data/${tab.value}/${item.id}/delete-check`);
            if (deleteTarget.value) {
                deleteTarget.value.canDelete = result.canDelete;
                deleteTarget.value.references = result.totalReferences;
            }
        }
        else if (deleteTarget.value) {
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
            await api(`/master-data/${target.kind}/${target.id}`, { method: 'DELETE' });
        const list = currentItems.value;
        const index = list.findIndex((item) => item.id === target.id);
        if (index >= 0)
            list.splice(index, 1);
        deleteTarget.value = null;
        resetForm();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the master record.';
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
    ...{ class: "master-data-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row projects-tools master-data-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openNewRecord) },
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
(__VLS_ctx.currentDefinition.singular);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "master-tabs" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.tabDefinitions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.tab = item.key;
            } },
        key: (item.key),
        ...{ class: ({ active: __VLS_ctx.tab === item.key }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    ({ suppliers: __VLS_ctx.suppliers.length, units: __VLS_ctx.units.length, materials: __VLS_ctx.materials.length, categories: __VLS_ctx.categories.length, products: __VLS_ctx.products.length }[item.key]);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "master-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_4 = {}.Boxes;
/** @type {[typeof __VLS_components.Boxes, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (17),
}));
const __VLS_6 = __VLS_5({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.currentItems.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_8 = {}.Check;
/** @type {[typeof __VLS_components.Check, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (17),
}));
const __VLS_10 = __VLS_9({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.activeCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.currentDefinition.short);
if (__VLS_ctx.saved) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "save-success master-save-success" },
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
    ...{ class: "master-data-layout" },
});
if (__VLS_ctx.entryOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeEntry) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveRecord) },
        ...{ class: "master-entry-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-label': (`${__VLS_ctx.editingId ? 'Modify' : 'Add'} ${__VLS_ctx.currentDefinition.singular}`),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEntry) },
        type: "button",
        ...{ class: "modal-close" },
        'aria-label': "Close entry form",
    });
    const __VLS_16 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (18),
    }));
    const __VLS_18 = __VLS_17({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.editingId ? 'Modify' : 'Add');
    (__VLS_ctx.currentDefinition.singular);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    if (__VLS_ctx.tab === 'suppliers') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "master-form-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Supplier code",
        });
        (__VLS_ctx.supplierForm.code);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.supplierForm.supplierType),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
            disabled: true,
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.supplierTypeOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
            (option.value);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_20 = {}.Truck;
        /** @type {[typeof __VLS_components.Truck, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (16),
        }));
        const __VLS_22 = __VLS_21({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Supplier name",
        });
        (__VLS_ctx.supplierForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Supplier address",
        });
        (__VLS_ctx.supplierForm.address);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Contact person",
        });
        (__VLS_ctx.supplierForm.contactPerson);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Phone number",
        });
        (__VLS_ctx.supplierForm.phone);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "email",
            placeholder: "supplier@example.com",
        });
        (__VLS_ctx.supplierForm.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.supplierForm.status),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "active",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "inactive",
        });
    }
    else if (__VLS_ctx.tab === 'units') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "master-form-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Bag, KG, CFT…",
        });
        (__VLS_ctx.unitForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "KG",
        });
        (__VLS_ctx.unitForm.code);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.unitForm.status),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "active",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "inactive",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Optional description",
        });
        (__VLS_ctx.unitForm.description);
    }
    else if (__VLS_ctx.tab === 'materials') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "master-form-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Material name",
        });
        (__VLS_ctx.materialForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
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
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.units))) {
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Material type",
        });
        (__VLS_ctx.materialForm.materialType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Optional material details",
        });
        (__VLS_ctx.materialForm.details);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.materialForm.status),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "active",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "inactive",
        });
    }
    else if (__VLS_ctx.tab === 'categories') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "master-form-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Corporate product category",
        });
        (__VLS_ctx.categoryForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.categoryForm.status),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "active",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "inactive",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "master-form-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Product name",
        });
        (__VLS_ctx.productForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.productForm.categoryId),
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
            value: (__VLS_ctx.productForm.unitId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (null),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.units))) {
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            step: "0.01",
            placeholder: "0.00",
        });
        (__VLS_ctx.productForm.defaultPrice);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Optional product details",
        });
        (__VLS_ctx.productForm.description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.productForm.status),
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setup-form-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEntry) },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.saving),
    });
    const __VLS_24 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (16),
    }));
    const __VLS_26 = __VLS_25({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    (__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editingId ? 'Save changes' : 'Add record');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel master-list-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "master-list-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "table-search" },
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
    placeholder: (`Search ${__VLS_ctx.currentDefinition.label.toLowerCase()}…`),
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.filteredItems.length);
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "master-record-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "master-record-icon" },
        });
        (item.name.slice(0, 2).toUpperCase());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.metadata(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({
            ...{ class: (item.status) },
        });
        (item.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
        (item.usageCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.editRecord(item);
                } },
            ...{ class: "card-edit" },
            title: "Edit",
        });
        const __VLS_32 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            size: (15),
        }));
        const __VLS_34 = __VLS_33({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.requestDelete(item);
                } },
            ...{ class: "card-edit danger" },
            title: "Delete",
        });
        const __VLS_36 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            size: (15),
        }));
        const __VLS_38 = __VLS_37({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    if (!__VLS_ctx.filteredItems.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_40 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            size: (22),
        }));
        const __VLS_42 = __VLS_41({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
    const __VLS_44 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (18),
    }));
    const __VLS_46 = __VLS_45({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_48 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        size: (24),
    }));
    const __VLS_50 = __VLS_49({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.deleteTarget.name);
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.deleteTarget.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_52 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            size: (18),
        }));
        const __VLS_54 = __VLS_53({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
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
        const __VLS_56 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: (16),
        }));
        const __VLS_58 = __VLS_57({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete record');
    }
}
/** @type {__VLS_StyleScopedClasses['master-data-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['projects-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['master-data-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['master-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['master-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['master-save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['master-data-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['master-entry-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['master-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['master-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['master-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['master-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['master-form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['master-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['master-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['master-record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['master-record-icon']} */ ;
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
            Boxes: Boxes,
            Check: Check,
            Pencil: Pencil,
            Plus: Plus,
            Search: Search,
            Trash2: Trash2,
            Truck: Truck,
            X: X,
            tabDefinitions: tabDefinitions,
            supplierTypeOptions: supplierTypeOptions,
            suppliers: suppliers,
            units: units,
            materials: materials,
            categories: categories,
            products: products,
            tab: tab,
            search: search,
            loading: loading,
            saving: saving,
            error: error,
            saved: saved,
            editingId: editingId,
            entryOpen: entryOpen,
            supplierForm: supplierForm,
            unitForm: unitForm,
            materialForm: materialForm,
            categoryForm: categoryForm,
            productForm: productForm,
            deleteTarget: deleteTarget,
            deleteLoading: deleteLoading,
            deleting: deleting,
            currentDefinition: currentDefinition,
            currentItems: currentItems,
            filteredItems: filteredItems,
            activeCount: activeCount,
            metadata: metadata,
            closeEntry: closeEntry,
            openNewRecord: openNewRecord,
            editRecord: editRecord,
            saveRecord: saveRecord,
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
