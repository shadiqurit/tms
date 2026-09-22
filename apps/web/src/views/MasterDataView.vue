<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { AlertTriangle, Boxes, Check, Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { materialOptions, supplierOptions, unitOptions } from '../data/sitePurchases';
import { corporateCategories, corporateProducts } from '../data/corporatePurchases';

type Status = 'active' | 'inactive';
type SupplierType = 'L' | 'C' | 'I' | 'O';
type MasterTab = 'suppliers' | 'units' | 'materials' | 'categories' | 'products';
interface BaseRecord { id: number; name: string; status: Status; usageCount: number }
interface SupplierRecord extends BaseRecord { code: string | null; address: string | null; contactPerson: string | null; phone: string | null; email: string | null; supplierType: string | null }
interface UnitRecord extends BaseRecord { code: string | null; description: string | null }
interface MaterialRecord extends BaseRecord { unitId: number | null; unitName: string | null; details: string | null; materialType: string | null }
interface CategoryRecord extends BaseRecord {}
interface ProductRecord extends BaseRecord { categoryId: number | null; categoryName: string | null; unitId: number | null; unitName: string | null; description: string | null; defaultPrice: number | null }
interface MasterResponse { suppliers: SupplierRecord[]; units: UnitRecord[]; materials: MaterialRecord[]; categories: CategoryRecord[]; products: ProductRecord[] }

const tabDefinitions: Array<{ key: MasterTab; label: string; singular: string; short: string }> = [
  { key: 'suppliers', label: 'Suppliers', singular: 'supplier', short: 'Supplier contacts and types' },
  { key: 'units', label: 'UOM', singular: 'UOM', short: 'Units of measurement' },
  { key: 'materials', label: 'Raw materials', singular: 'raw material', short: 'Site purchase materials' },
  { key: 'categories', label: 'Product categories', singular: 'product category', short: 'Corporate product groups' },
  { key: 'products', label: 'Corporate products', singular: 'corporate product', short: 'Corporate purchase catalogue' },
];
const supplierTypeOptions: Array<{ value: SupplierType; label: string }> = [
  { value: 'L', label: 'Local' },
  { value: 'C', label: 'Corporate' },
  { value: 'I', label: 'Import' },
  { value: 'O', label: 'Others' },
];

const suppliers = ref<SupplierRecord[]>(supplierOptions.map((item) => ({ id: item.id, code: item.code ?? null, name: item.name, address: item.address ?? null, contactPerson: null, phone: item.phone ?? null, email: null, supplierType: item.supplierType ?? null, status: 'active', usageCount: 0 })));
const units = ref<UnitRecord[]>(unitOptions.map((item) => ({ id: item.id, code: item.code ?? null, name: item.name, description: null, status: 'active', usageCount: 0 })));
const materials = ref<MaterialRecord[]>(materialOptions.map((item) => ({ id: item.id, name: item.name, unitId: item.unitId ?? null, unitName: item.unitName ?? null, details: null, materialType: null, status: 'active', usageCount: 0 })));
const categories = ref<CategoryRecord[]>(corporateCategories.map((item) => ({ id: item.id, name: item.name, status: 'active', usageCount: 0 })));
const products = ref<ProductRecord[]>(corporateProducts.map((item) => ({ id: item.id, categoryId: item.categoryId, categoryName: corporateCategories.find((category) => category.id === item.categoryId)?.name ?? null, unitId: item.unitId ?? null, unitName: item.unitName ?? null, name: item.name, description: item.description ?? null, defaultPrice: item.defaultPrice, status: 'active', usageCount: 0 })));

const tab = ref<MasterTab>('suppliers');
const search = ref(''); const loading = ref(false); const saving = ref(false); const error = ref(''); const saved = ref('');
const editingId = ref<number | null>(null);
const entryOpen = ref(false);
const supplierForm = reactive({ code: '', name: '', address: '', contactPerson: '', phone: '', email: '', supplierType: '' as SupplierType | '', status: 'active' as Status });
const unitForm = reactive({ name: '', code: '', description: '', status: 'active' as Status });
const materialForm = reactive({ name: '', unitId: null as number | null, details: '', materialType: '', status: 'active' as Status });
const categoryForm = reactive({ name: '', status: 'active' as Status });
const productForm = reactive({ categoryId: null as number | null, unitId: null as number | null, name: '', description: '', defaultPrice: null as number | null, status: 'active' as Status });
const deleteTarget = ref<{ id: number; name: string; kind: MasterTab; canDelete: boolean; references: number } | null>(null);
const deleteLoading = ref(false); const deleting = ref(false);

const currentDefinition = computed(() => tabDefinitions.find((item) => item.key === tab.value)!);
const currentItems = computed<BaseRecord[]>(() => ({ suppliers: suppliers.value, units: units.value, materials: materials.value, categories: categories.value, products: products.value })[tab.value]);
const filteredItems = computed(() => { const term = search.value.trim().toLowerCase(); return currentItems.value.filter((item) => !term || item.name.toLowerCase().includes(term) || metadata(item).toLowerCase().includes(term)); });
const activeCount = computed(() => currentItems.value.filter((item) => item.status === 'active').length);

function metadata(item: BaseRecord) {
  if (tab.value === 'suppliers') { const record = item as SupplierRecord; return [record.code, record.phone, supplierTypeOptions.find((option) => option.value === record.supplierType)?.label].filter(Boolean).join(' · ') || 'Supplier'; }
  if (tab.value === 'units') { const record = item as UnitRecord; return [record.code, record.description].filter(Boolean).join(' · ') || 'Unit of measurement'; }
  if (tab.value === 'materials') { const record = item as MaterialRecord; return [record.unitName, record.materialType].filter(Boolean).join(' · ') || 'Raw material'; }
  if (tab.value === 'products') { const record = item as ProductRecord; return [record.categoryName, record.unitName, record.defaultPrice == null ? '' : `BDT ${Number(record.defaultPrice).toLocaleString()}`].filter(Boolean).join(' · ') || 'Corporate product'; }
  return 'Corporate product category';
}

async function loadData(showLoading = true) {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  if (showLoading) loading.value = true;
  try {
    const result = await api<MasterResponse>('/master-data');
    suppliers.value = result.suppliers; units.value = result.units; materials.value = result.materials;
    categories.value = result.categories; products.value = result.products;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load master setup.'; }
  finally { if (showLoading) loading.value = false; }
}
function closeEntry() {
  if (saving.value) return;
  entryOpen.value = false;
  resetForm();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (deleteTarget.value) deleteTarget.value = null;
  else if (entryOpen.value) closeEntry();
}

onMounted(() => {
  loadData();
  window.addEventListener('keydown', handleEscape);
});
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape));

function resetForm() {
  editingId.value = null; error.value = ''; saved.value = '';
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

function editRecord(item: BaseRecord) {
  editingId.value = item.id; error.value = ''; saved.value = '';
  if (tab.value === 'suppliers') { const record = item as SupplierRecord; Object.assign(supplierForm, { ...record, code: record.code ?? '', address: record.address ?? '', contactPerson: record.contactPerson ?? '', phone: record.phone ?? '', email: record.email ?? '', supplierType: record.supplierType ?? '' }); }
  else if (tab.value === 'units') { const record = item as UnitRecord; Object.assign(unitForm, { ...record, code: record.code ?? '', description: record.description ?? '' }); }
  else if (tab.value === 'materials') { const record = item as MaterialRecord; Object.assign(materialForm, { ...record, details: record.details ?? '', materialType: record.materialType ?? '' }); }
  else if (tab.value === 'categories') Object.assign(categoryForm, item);
  else { const record = item as ProductRecord; Object.assign(productForm, { ...record, description: record.description ?? '', defaultPrice: record.defaultPrice == null ? null : Number(record.defaultPrice) }); }
  entryOpen.value = true;
}

function payload() {
  if (tab.value === 'suppliers') return { ...supplierForm };
  if (tab.value === 'units') return { ...unitForm };
  if (tab.value === 'materials') return { ...materialForm };
  if (tab.value === 'categories') return { ...categoryForm };
  return { ...productForm, defaultPrice: productForm.defaultPrice === null || productForm.defaultPrice === ('' as unknown as number) ? null : Number(productForm.defaultPrice) };
}

function demoRecord(id: number, data: Record<string, unknown>): BaseRecord {
  const base = { id, ...data, usageCount: currentItems.value.find((item) => item.id === id)?.usageCount ?? 0 } as BaseRecord;
  if (tab.value === 'materials') { const record = base as MaterialRecord; record.unitName = units.value.find((item) => item.id === record.unitId)?.name ?? null; }
  if (tab.value === 'products') { const record = base as ProductRecord; record.categoryName = categories.value.find((item) => item.id === record.categoryId)?.name ?? null; record.unitName = units.value.find((item) => item.id === record.unitId)?.name ?? null; }
  return base;
}

async function saveRecord() {
  error.value = ''; saved.value = '';
  const data = payload() as Record<string, unknown>;
  if (!String(data.name ?? '').trim()) { error.value = 'Enter the name.'; return; }
  if (tab.value === 'suppliers' && !supplierForm.supplierType) { error.value = 'Select the supplier type.'; return; }
  saving.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(editingId.value ? `/master-data/${tab.value}/${editingId.value}` : `/master-data/${tab.value}`, { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(data) });
      await loadData(false);
    } else {
      const id = editingId.value ?? Math.max(0, ...currentItems.value.map((item) => item.id)) + 1;
      const record = demoRecord(id, data); const list = currentItems.value; const index = list.findIndex((item) => item.id === id);
      if (index >= 0) list[index] = record; else list.unshift(record);
    }
    const message = editingId.value ? 'Master record updated.' : 'Master record added.';
    resetForm(); entryOpen.value = false; saved.value = message;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save the master record.'; }
  finally { saving.value = false; }
}

async function requestDelete(item: BaseRecord) {
  deleteTarget.value = { id: item.id, name: item.name, kind: tab.value, canDelete: false, references: 0 }; deleteLoading.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const result = await api<{ canDelete: boolean; totalReferences: number }>(`/master-data/${tab.value}/${item.id}/delete-check`);
      if (deleteTarget.value) { deleteTarget.value.canDelete = result.canDelete; deleteTarget.value.references = result.totalReferences; }
    } else if (deleteTarget.value) { deleteTarget.value.canDelete = item.usageCount === 0; deleteTarget.value.references = item.usageCount; }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not check references.'; deleteTarget.value = null; }
  finally { deleteLoading.value = false; }
}
async function confirmDelete() {
  if (!deleteTarget.value?.canDelete) return; deleting.value = true;
  try {
    const target = deleteTarget.value;
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/master-data/${target.kind}/${target.id}`, { method: 'DELETE' });
    const list = currentItems.value; const index = list.findIndex((item) => item.id === target.id); if (index >= 0) list.splice(index, 1);
    deleteTarget.value = null; resetForm();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the master record.'; deleteTarget.value = null; }
  finally { deleting.value = false; }
}
</script>

<template>
  <section class="master-data-page">
    <div class="welcome-row projects-tools master-data-intro"><div><h2>Master setup</h2><p>Maintain the shared records used by site-engineer and corporate purchases.</p></div><button class="secondary-button" @click="openNewRecord"><Plus :size="17" /> New {{ currentDefinition.singular }}</button></div>
    <div class="master-tabs">
      <button v-for="item in tabDefinitions" :key="item.key" :class="{ active: tab === item.key }" @click="tab = item.key"><strong>{{ item.label }}</strong><small>{{ ({ suppliers: suppliers.length, units: units.length, materials: materials.length, categories: categories.length, products: products.length } as Record<MasterTab, number>)[item.key] }} records</small></button>
    </div>
    <div class="master-summary"><span><Boxes :size="17" /><b>{{ currentItems.length }}</b> total</span><span><Check :size="17" /><b>{{ activeCount }}</b> active</span><p>{{ currentDefinition.short }}</p></div>
    <p v-if="saved" class="save-success master-save-success"><Check :size="16" />{{ saved }}</p>
    <div class="master-data-layout">
      <div v-if="entryOpen" class="modal-backdrop" @click.self="closeEntry">
      <form class="master-entry-modal" role="dialog" aria-modal="true" :aria-label="`${editingId ? 'Modify' : 'Add'} ${currentDefinition.singular}`" @submit.prevent="saveRecord">
        <button type="button" class="modal-close" aria-label="Close entry form" @click="closeEntry"><X :size="18" /></button>
        <div class="panel-heading"><div><h2>{{ editingId ? 'Modify' : 'Add' }} {{ currentDefinition.singular }}</h2><p>Changes become available in purchase-entry selections immediately.</p></div></div>

        <div v-if="tab === 'suppliers'" class="master-form-fields">
          <div class="form-grid"><label class="form-field"><span>Supplier code</span><div><input v-model="supplierForm.code" placeholder="Supplier code" /></div></label><label class="form-field"><span>Supplier type <b>*</b></span><select v-model="supplierForm.supplierType"><option value="" disabled>Select supplier type</option><option v-for="option in supplierTypeOptions" :key="option.value" :value="option.value">{{ option.label }} ({{ option.value }})</option></select></label></div>
          <label class="form-field"><span>Supplier name <b>*</b></span><div><Truck :size="16" /><input v-model="supplierForm.name" placeholder="Supplier name" /></div></label>
          <label class="form-field"><span>Address</span><div><input v-model="supplierForm.address" placeholder="Supplier address" /></div></label>
          <div class="form-grid"><label class="form-field"><span>Contact person</span><div><input v-model="supplierForm.contactPerson" placeholder="Contact person" /></div></label><label class="form-field"><span>Phone</span><div><input v-model="supplierForm.phone" placeholder="Phone number" /></div></label></div>
          <label class="form-field"><span>Email</span><div><input v-model="supplierForm.email" type="email" placeholder="supplier@example.com" /></div></label>
          <label class="form-field"><span>Status</span><select v-model="supplierForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>

        <div v-else-if="tab === 'units'" class="master-form-fields">
          <label class="form-field"><span>UOM name <b>*</b></span><div><input v-model="unitForm.name" placeholder="Bag, KG, CFT…" /></div></label>
          <div class="form-grid"><label class="form-field"><span>Short code</span><div><input v-model="unitForm.code" placeholder="KG" /></div></label><label class="form-field"><span>Status</span><select v-model="unitForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
          <label class="form-field"><span>Description</span><div><input v-model="unitForm.description" placeholder="Optional description" /></div></label>
        </div>

        <div v-else-if="tab === 'materials'" class="master-form-fields">
          <label class="form-field"><span>Raw material name <b>*</b></span><div><input v-model="materialForm.name" placeholder="Material name" /></div></label>
          <div class="form-grid"><label class="form-field"><span>Default UOM</span><select v-model="materialForm.unitId"><option :value="null">No unit</option><option v-for="item in units" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="form-field"><span>Material type</span><div><input v-model="materialForm.materialType" placeholder="Material type" /></div></label></div>
          <label class="form-field"><span>Details</span><div><input v-model="materialForm.details" placeholder="Optional material details" /></div></label>
          <label class="form-field"><span>Status</span><select v-model="materialForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>

        <div v-else-if="tab === 'categories'" class="master-form-fields">
          <label class="form-field"><span>Category name <b>*</b></span><div><input v-model="categoryForm.name" placeholder="Corporate product category" /></div></label>
          <label class="form-field"><span>Status</span><select v-model="categoryForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>

        <div v-else class="master-form-fields">
          <label class="form-field"><span>Corporate product name <b>*</b></span><div><input v-model="productForm.name" placeholder="Product name" /></div></label>
          <div class="form-grid"><label class="form-field"><span>Category</span><select v-model="productForm.categoryId"><option :value="null">No category</option><option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="form-field"><span>Default UOM</span><select v-model="productForm.unitId"><option :value="null">No unit</option><option v-for="item in units" :key="item.id" :value="item.id">{{ item.name }}</option></select></label></div>
          <label class="form-field"><span>Default price</span><div><input v-model.number="productForm.defaultPrice" type="number" min="0" step="0.01" placeholder="0.00" /></div></label>
          <label class="form-field"><span>Description</span><div><input v-model="productForm.description" placeholder="Optional product details" /></div></label>
          <label class="form-field"><span>Status</span><select v-model="productForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="setup-form-actions"><button type="button" class="secondary-button" @click="closeEntry">Cancel</button><button class="primary-button" :disabled="saving"><Check :size="16" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Add record' }}</button></div>
      </form>
      </div>

      <section class="panel master-list-panel">
        <header class="master-list-toolbar"><label class="table-search"><Search :size="16" /><input v-model="search" :placeholder="`Search ${currentDefinition.label.toLowerCase()}…`" /></label><span>{{ filteredItems.length }} shown</span></header>
        <div v-if="loading" class="table-loading">Loading master setup…</div>
        <div v-else class="master-record-list">
          <article v-for="item in filteredItems" :key="item.id"><span class="master-record-icon">{{ item.name.slice(0, 2).toUpperCase() }}</span><div><strong>{{ item.name }}</strong><small>{{ metadata(item) }}</small><span><em :class="item.status">{{ item.status }}</em><i>{{ item.usageCount }} references</i></span></div><button class="card-edit" title="Edit" @click="editRecord(item)"><Pencil :size="15" /></button><button class="card-edit danger" title="Delete" @click="requestDelete(item)"><Trash2 :size="15" /></button></article>
          <div v-if="!filteredItems.length" class="site-empty"><Search :size="22" /><strong>No matching master records</strong><span>Try another search or add a new record.</span></div>
        </div>
      </section>
    </div>

    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null"><section class="delete-modal"><button class="modal-close" @click="deleteTarget = null"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete “{{ deleteTarget.name }}”?</h2><p v-if="deleteLoading">Checking purchase and master-data references…</p><template v-else-if="!deleteTarget.canDelete"><div class="delete-blocked"><AlertTriangle :size="18" /><span><strong>Deletion prevented</strong><small>{{ deleteTarget.references }} records reference this master item. Set it inactive instead.</small></span></div><button class="secondary-button modal-done" @click="deleteTarget = null">Close</button></template><template v-else><p>No referenced records were found.</p><div class="modal-actions"><button class="secondary-button" @click="deleteTarget = null">Cancel</button><button class="danger-button" :disabled="deleting" @click="confirmDelete"><Trash2 :size="16" />{{ deleting ? 'Deleting…' : 'Delete record' }}</button></div></template></section></div>
  </section>
</template>
