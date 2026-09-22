<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, Check, ChevronLeft, ChevronRight, PackagePlus, Pencil, Plus, Save, Search, Trash2, Truck, X } from 'lucide-vue-next';
import { api } from '../services/api';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
import { supplierOptions as demoSuppliers, unitOptions as demoUnits, type PurchaseLinePage, type PurchaseOption } from '../data/sitePurchases';
import { corporateCategories as demoCategories, corporateLines, corporateProducts as demoProducts, corporatePurchaseRecords, nextCorporateLineId, nextCorporatePurchaseId, type CorporateCategoryOption, type CorporateLineRecord, type CorporateProductOption, type CorporatePurchaseRecord } from '../data/corporatePurchases';

interface ProjectOption { id: number; code: string; name: string; tenderId: string; location: string }
interface SiteOption { id: number; projectId: number; name: string; address: string }
interface CorporateOptions { projects: ProjectOption[]; sites: SiteOption[]; suppliers: PurchaseOption[]; categories: CorporateCategoryOption[]; products: CorporateProductOption[]; units: PurchaseOption[] }

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'corporate-purchase-edit');
const purchaseId = computed(() => Number(route.params.id));
const today = new Date().toISOString().slice(0, 10);
const projects = ref<ProjectOption[]>(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const sites = ref<SiteOption[]>(demoSites.map(({ id, projectId, name, address }) => ({ id, projectId, name, address })));
const suppliers = ref<PurchaseOption[]>([...demoSuppliers]);
const categories = ref<CorporateCategoryOption[]>([...demoCategories]);
const products = ref<CorporateProductOption[]>([...demoProducts]);
const units = ref<PurchaseOption[]>([...demoUnits]);
const loading = ref(false); const saving = ref(false); const saved = ref(''); const error = ref('');
const lineFormOpen = ref(false); const lineSaving = ref(false); const lineSearch = ref(''); const productSearch = ref('');
const lines = ref<CorporateLineRecord[]>([]); const linePage = ref(1); const lineTotalRows = ref(0); const pageSize = 20;
const pendingLineDelete = ref<number | null>(null); const lineDeleting = ref(false);
const deleteOpen = ref(false); const deleteLoading = ref(false); const deleteCheck = ref<{ canDelete: boolean; references: { productLines: number } } | null>(null); const deleteText = ref(''); const deleting = ref(false);
const summary = reactive({ itemCount: 0, totalAmount: 0 });
const form = reactive({ projectId: Number(route.query.projectId || 0), siteId: null as number | null, supplierId: null as number | null, purchaseNo: '', localSupplier: '', supplierAddress: '', purchaseDate: today, purchaseType: 'corporate', challanNo: '', challanDate: '', notes: '', status: 'posted' as 'draft' | 'posted' | 'cancelled' });
const lineForm = reactive({ id: null as number | null, categoryId: null as number | null, productId: 0, unitId: null as number | null, siteId: null as number | null, quantity: 1 as number | '', unitPrice: '' as number | '', discount: '' as number | '', notes: '' });

const availableSites = computed(() => sites.value.filter((site) => site.projectId === form.projectId));
const availableProducts = computed(() => {
  const term = productSearch.value.trim().toLowerCase();
  return products.value.filter((item) => (!lineForm.categoryId || item.categoryId === lineForm.categoryId) && (!term || item.name.toLowerCase().includes(term)));
});
const lineTotal = computed(() => Math.max(0, Number(lineForm.quantity || 0) * Number(lineForm.unitPrice || 0) - Number(lineForm.discount || 0)));
const linePageCount = computed(() => Math.max(1, Math.ceil(lineTotalRows.value / pageSize)));
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function dateValue(value: unknown) { return value ? String(value).slice(0, 10) : ''; }

function fillHeader(item: CorporatePurchaseRecord) {
  form.projectId = item.projectId; form.siteId = item.siteId; form.supplierId = item.supplierId;
  form.purchaseNo = item.purchaseNo ?? ''; form.localSupplier = item.localSupplier ?? ''; form.supplierAddress = item.supplierAddress ?? '';
  form.purchaseDate = dateValue(item.purchaseDate); form.purchaseType = item.purchaseType || 'corporate'; form.challanNo = item.challanNo ?? '';
  form.challanDate = dateValue(item.challanDate); form.notes = item.notes ?? ''; form.status = item.status;
  summary.itemCount = Number(item.itemCount); summary.totalAmount = Number(item.totalAmount);
}
async function loadHeader() {
  if (!editing.value) return;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') { const item = corporatePurchaseRecords.find((entry) => entry.id === purchaseId.value); if (item) fillHeader(item); return; }
  const result = await api<{ purchase: CorporatePurchaseRecord }>(`/corporate-purchases/${purchaseId.value}`); fillHeader(result.purchase);
}
async function loadLines() {
  if (!editing.value) return;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') {
    const term = lineSearch.value.trim().toLowerCase();
    const matches = corporateLines.filter((item) => item.purchaseId === purchaseId.value && (!term || [item.productName, item.categoryName, item.siteName, item.notes].some((value) => value.toLowerCase().includes(term))));
    lineTotalRows.value = matches.length; lines.value = matches.slice((linePage.value - 1) * pageSize, linePage.value * pageSize).map((item) => ({ ...item })); return;
  }
  const result = await api<PurchaseLinePage<CorporateLineRecord>>(`/corporate-purchases/${purchaseId.value}/lines?page=${linePage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
  lines.value = result.items; lineTotalRows.value = result.total;
}
onMounted(async () => {
  loading.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const options = await api<CorporateOptions>('/corporate-purchases/options');
      projects.value = options.projects; sites.value = options.sites; suppliers.value = options.suppliers;
      categories.value = options.categories; products.value = options.products; units.value = options.units;
    }
    await loadHeader(); await loadLines();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load corporate purchase information.'; }
  finally { loading.value = false; }
});
watch(() => form.projectId, () => {
  if (form.siteId && !availableSites.value.some((site) => site.id === form.siteId)) form.siteId = null;
  if (lineForm.siteId && !availableSites.value.some((site) => site.id === lineForm.siteId)) lineForm.siteId = null;
});

function supplierChanged() { const supplier = suppliers.value.find((item) => item.id === form.supplierId); if (supplier) form.supplierAddress = supplier.address ?? ''; }
function categoryChanged() {
  if (lineForm.productId && !products.value.some((item) => item.id === lineForm.productId && item.categoryId === lineForm.categoryId)) lineForm.productId = 0;
}
function productChanged() {
  const product = products.value.find((item) => item.id === lineForm.productId);
  if (!product) return;
  lineForm.categoryId = product.categoryId; lineForm.unitId = product.unitId ?? null;
  if (product.defaultPrice !== null && product.defaultPrice !== undefined) lineForm.unitPrice = Number(product.defaultPrice);
}
function resetLineForm() { Object.assign(lineForm, { id: null, categoryId: null, productId: 0, unitId: null, siteId: form.siteId, quantity: 1, unitPrice: '', discount: '', notes: '' }); productSearch.value = ''; }
function closeLineForm() { lineFormOpen.value = false; error.value = ''; }
function addLine() { error.value = ''; resetLineForm(); lineFormOpen.value = true; }
function editLine(item: CorporateLineRecord) { error.value = ''; Object.assign(lineForm, { id: item.id, categoryId: item.categoryId, productId: item.productId ?? 0, unitId: item.unitId, siteId: item.siteId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount), notes: item.notes ?? '' }); productSearch.value = ''; lineFormOpen.value = true; }

async function saveHeader() {
  if (!form.projectId || !form.purchaseDate) { error.value = 'Project and purchase date are required.'; return; }
  saving.value = true; error.value = ''; saved.value = '';
  try {
    const payload = { ...form, siteId: form.siteId || null, supplierId: form.supplierId || null };
    let id = purchaseId.value;
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const result = await api<{ id: number }>(editing.value ? `/corporate-purchases/${id}` : '/corporate-purchases', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) }); id = result.id;
    } else {
      const project = projects.value.find((item) => item.id === form.projectId)!; const site = sites.value.find((item) => item.id === form.siteId); const supplier = suppliers.value.find((item) => item.id === form.supplierId);
      if (!editing.value) id = nextCorporatePurchaseId();
      const record: CorporatePurchaseRecord = { id, projectId: form.projectId, projectCode: project.code, projectName: project.name, siteId: form.siteId, siteName: site?.name ?? '', supplierId: form.supplierId, supplierName: (supplier?.name ?? form.localSupplier) || 'Unspecified supplier', purchaseNo: form.purchaseNo, localSupplier: form.localSupplier, supplierAddress: form.supplierAddress, purchaseDate: form.purchaseDate, purchaseType: form.purchaseType, challanNo: form.challanNo, challanDate: form.challanDate, notes: form.notes, status: form.status, itemCount: summary.itemCount, totalQuantity: 0, totalAmount: summary.totalAmount };
      const index = corporatePurchaseRecords.findIndex((item) => item.id === id); if (index >= 0) corporatePurchaseRecords[index] = record; else corporatePurchaseRecords.unshift(record);
    }
    saved.value = editing.value ? 'Corporate purchase updated.' : 'Corporate purchase created. Add product lines below.';
    if (!editing.value) await router.replace(`/purchases/corporate/${id}/edit`);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save the corporate purchase.'; }
  finally { saving.value = false; }
}

async function saveLine() {
  if (!lineForm.productId || Number(lineForm.quantity) <= 0 || lineForm.unitPrice === '') { error.value = 'Select a product and enter a valid quantity and price.'; return; }
  lineSaving.value = true; error.value = '';
  try {
    const payload = { categoryId: lineForm.categoryId, productId: lineForm.productId, unitId: lineForm.unitId, siteId: lineForm.siteId, quantity: Number(lineForm.quantity), unitPrice: Number(lineForm.unitPrice), discount: Number(lineForm.discount || 0), notes: lineForm.notes };
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(lineForm.id ? `/corporate-purchases/${purchaseId.value}/lines/${lineForm.id}` : `/corporate-purchases/${purchaseId.value}/lines`, { method: lineForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    else {
      const product = products.value.find((item) => item.id === payload.productId)!; const category = categories.value.find((item) => item.id === payload.categoryId); const unit = units.value.find((item) => item.id === payload.unitId); const site = sites.value.find((item) => item.id === payload.siteId);
      const record: CorporateLineRecord = { id: lineForm.id ?? nextCorporateLineId(), purchaseId: purchaseId.value, categoryId: payload.categoryId, categoryName: category?.name ?? '', productId: product.id, productName: product.name, unitId: payload.unitId, unitName: unit?.name ?? '', siteId: payload.siteId, siteName: site?.name ?? '', quantity: payload.quantity, unitPrice: payload.unitPrice, discount: payload.discount, totalAmount: lineTotal.value, notes: payload.notes };
      const index = corporateLines.findIndex((item) => item.id === record.id); if (index >= 0) corporateLines[index] = record; else corporateLines.unshift(record);
      const purchase = corporatePurchaseRecords.find((item) => item.id === purchaseId.value); const purchaseLines = corporateLines.filter((item) => item.purchaseId === purchaseId.value); if (purchase) { purchase.itemCount = purchaseLines.length; purchase.totalQuantity = purchaseLines.reduce((sum, item) => sum + item.quantity, 0); purchase.totalAmount = purchaseLines.reduce((sum, item) => sum + item.totalAmount, 0); fillHeader(purchase); }
    }
    lineFormOpen.value = false; resetLineForm(); await loadLines(); if (import.meta.env.VITE_DEMO_MODE === 'false') await loadHeader();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save the product line.'; }
  finally { lineSaving.value = false; }
}
async function confirmLineDelete() {
  if (!pendingLineDelete.value) return; lineDeleting.value = true;
  try { if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/corporate-purchases/${purchaseId.value}/lines/${pendingLineDelete.value}`, { method: 'DELETE' }); else { const index = corporateLines.findIndex((item) => item.id === pendingLineDelete.value); if (index >= 0) corporateLines.splice(index, 1); const purchase = corporatePurchaseRecords.find((item) => item.id === purchaseId.value); const purchaseLines = corporateLines.filter((item) => item.purchaseId === purchaseId.value); if (purchase) { purchase.itemCount = purchaseLines.length; purchase.totalAmount = purchaseLines.reduce((sum, item) => sum + item.totalAmount, 0); fillHeader(purchase); } } pendingLineDelete.value = null; await loadLines(); if (import.meta.env.VITE_DEMO_MODE === 'false') await loadHeader(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the product line.'; pendingLineDelete.value = null; }
  finally { lineDeleting.value = false; }
}
async function checkDelete() {
  deleteOpen.value = true; deleteText.value = ''; deleteCheck.value = null; deleteLoading.value = true;
  try { deleteCheck.value = import.meta.env.VITE_DEMO_MODE === 'false' ? await api(`/corporate-purchases/${purchaseId.value}/delete-check`) : { canDelete: summary.itemCount === 0, references: { productLines: summary.itemCount } }; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not check purchase references.'; deleteOpen.value = false; }
  finally { deleteLoading.value = false; }
}
async function removePurchase() {
  if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE') return; deleting.value = true;
  try { if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/corporate-purchases/${purchaseId.value}`, { method: 'DELETE' }); else { const index = corporatePurchaseRecords.findIndex((item) => item.id === purchaseId.value); if (index >= 0) corporatePurchaseRecords.splice(index, 1); } await router.push('/purchases/corporate'); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the corporate purchase.'; deleteOpen.value = false; }
  finally { deleting.value = false; }
}
</script>

<template>
  <section class="project-form-page corporate-purchase-form-page">
    <div class="form-page-head"><RouterLink to="/purchases/corporate" class="back-link"><ArrowLeft :size="16" /> All corporate purchases</RouterLink><div><span class="form-heading-icon"><Building2 :size="21" /></span><span><h2>{{ editing ? 'Corporate purchase' : 'New corporate purchase' }}</h2><p>Save the purchase header first, then add its product lines.</p></span></div></div>
    <form class="project-form panel purchase-header-form" @submit.prevent="saveHeader"><div v-if="loading" class="site-form-loading">Loading corporate purchase…</div><div class="form-section-title"><span>01</span><div><h3>Purchase header</h3><p>Project, supplier, delivery site, challan, and purchase date.</p></div></div><div class="form-grid">
      <label class="form-field full"><span>Project <b>*</b></span><ProjectSearchSelect v-model="form.projectId" :projects="projects" /></label>
      <label class="form-field"><span>Delivery site</span><select v-model="form.siteId"><option :value="null">General project delivery</option><option v-for="site in availableSites" :key="site.id" :value="site.id">{{ site.name }}</option></select></label>
      <label class="form-field"><span>Purchase date <b>*</b></span><div><input v-model="form.purchaseDate" type="date" /></div></label>
      <label class="form-field"><span>Purchase number</span><div><input v-model="form.purchaseNo" placeholder="Corporate purchase number" /></div></label>
      <label class="form-field"><span>Registered supplier</span><select v-model="form.supplierId" @change="supplierChanged"><option :value="null">Local / unregistered supplier</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label>
      <label class="form-field"><span>Local supplier name</span><div><input v-model="form.localSupplier" placeholder="Optional supplier name" /></div></label>
      <label class="form-field full"><span>Supplier address</span><div><input v-model="form.supplierAddress" placeholder="Supplier address" /></div></label>
      <label class="form-field"><span>Challan number</span><div><input v-model="form.challanNo" placeholder="Challan / invoice" /></div></label><label class="form-field"><span>Challan date</span><div><input v-model="form.challanDate" type="date" /></div></label>
      <label class="form-field full"><span>Notes</span><div><input v-model="form.notes" placeholder="Purchase or delivery notes" /></div></label><label class="form-field"><span>Status</span><select v-model="form.status"><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label>
    </div><p v-if="error" class="form-error form-message">{{ error }}</p><p v-if="saved" class="save-success"><Check :size="16" />{{ saved }}</p><footer class="form-actions"><button v-if="editing" type="button" class="delete-project-button" @click="checkDelete"><Trash2 :size="16" /> Delete purchase</button><RouterLink to="/purchases/corporate" class="secondary-button">Cancel</RouterLink><button class="primary-button" :disabled="saving"><Save :size="17" />{{ saving ? 'Saving…' : editing ? 'Save purchase' : 'Create purchase' }}</button></footer></form>

    <section v-if="editing" class="purchase-entries panel"><header class="purchase-entry-summary"><div><button class="active"><PackagePlus :size="17" /><span><strong>Corporate products</strong><small>{{ summary.itemCount }} lines</small></span></button></div><strong>{{ money(summary.totalAmount) }} total</strong></header>
      <div class="purchase-entry-toolbar"><label class="table-search"><Search :size="16" /><input v-model="lineSearch" placeholder="Search product, category, or site…" @keyup.enter="linePage = 1; loadLines()" /></label><button type="button" class="secondary-button" @click="linePage = 1; loadLines()"><Search :size="15" /> Search</button><button type="button" class="primary-button" @click="addLine"><Plus :size="16" /> Add product</button></div>
      <div class="purchase-lines-table-wrap"><table class="site-table purchase-lines-table corporate-lines-table"><thead><tr><th>Product</th><th>Category</th><th>Site</th><th>Quantity</th><th>Unit price</th><th>Discount</th><th>Total</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody><tr v-for="item in lines" :key="item.id"><td data-label="Product"><strong>{{ item.productName }}</strong><small>{{ item.notes }}</small></td><td data-label="Category">{{ item.categoryName || '—' }}</td><td data-label="Site">{{ item.siteName || 'General project' }}</td><td data-label="Quantity">{{ Number(item.quantity).toLocaleString() }} {{ item.unitName }}</td><td data-label="Unit price">{{ money(item.unitPrice) }}</td><td data-label="Discount">{{ money(item.discount) }}</td><td data-label="Total"><strong>{{ money(item.totalAmount) }}</strong></td><td data-label="Actions"><div class="line-actions"><button type="button" @click="editLine(item)"><Pencil :size="14" /></button><button type="button" class="danger" @click="pendingLineDelete = item.id"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!lines.length"><td colspan="8"><div class="site-empty"><PackagePlus :size="22" /><strong>No corporate product lines found</strong><span>Add the first product to this purchase.</span></div></td></tr></tbody></table></div>
      <footer class="table-pagination purchase-line-pagination"><span>{{ lineTotalRows }} matching product lines</span><div><button type="button" :disabled="linePage === 1" @click="linePage--; loadLines()"><ChevronLeft :size="16" /></button><span>Page {{ linePage }} of {{ linePageCount }}</span><button type="button" :disabled="linePage === linePageCount" @click="linePage++; loadLines()"><ChevronRight :size="16" /></button></div></footer>
    </section>

    <div v-if="lineFormOpen" class="modal-backdrop" @click.self="closeLineForm"><form class="purchase-line-form purchase-line-modal corporate-line-form" @submit.prevent="saveLine"><header><div><PackagePlus :size="18" /><span><strong>{{ lineForm.id ? 'Modify product line' : 'Add corporate product' }}</strong><small>Total is calculated from quantity × price − discount.</small></span></div><button type="button" @click="closeLineForm"><X :size="17" /></button></header><div class="form-grid three"><label class="form-field"><span>Category</span><select v-model="lineForm.categoryId" @change="categoryChanged"><option :value="null">All categories</option><option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="form-field"><span>Find product</span><div><Search :size="15" /><input v-model="productSearch" placeholder="Type product name…" /></div></label><label class="form-field"><span>Corporate product <b>*</b></span><select v-model.number="lineForm.productId" @change="productChanged"><option :value="0" disabled>Select product ({{ availableProducts.length }} available)</option><option v-for="item in availableProducts" :key="item.id" :value="item.id">{{ item.name }}{{ item.unitName ? ` — ${item.unitName}` : '' }}</option></select></label><label class="form-field"><span>Delivery site</span><select v-model="lineForm.siteId"><option :value="null">Use purchase / general site</option><option v-for="site in availableSites" :key="site.id" :value="site.id">{{ site.name }}</option></select></label><label class="form-field"><span>Unit</span><select v-model="lineForm.unitId"><option :value="null">No unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></label><label class="form-field"><span>Quantity <b>*</b></span><div><input v-model.number="lineForm.quantity" type="number" min="0.0001" step="0.0001" /></div></label><label class="form-field"><span>Unit price <b>*</b></span><div><input v-model.number="lineForm.unitPrice" type="number" min="0" step="0.0001" /></div></label><label class="form-field"><span>Discount</span><div><input v-model.number="lineForm.discount" type="number" min="0" step="0.01" /></div></label><label class="form-field full"><span>Notes</span><div><input v-model="lineForm.notes" placeholder="Optional product notes" /></div></label></div><p v-if="error" class="form-error modal-error">{{ error }}</p><footer><span>Calculated total <strong>{{ money(lineTotal) }}</strong></span><button type="button" class="secondary-button" @click="closeLineForm">Cancel</button><button class="primary-button" :disabled="lineSaving"><Check :size="15" />{{ lineSaving ? 'Saving…' : lineForm.id ? 'Update product' : 'Add product' }}</button></footer></form></div>
    <div v-if="pendingLineDelete" class="modal-backdrop" @click.self="pendingLineDelete = null"><section class="delete-modal"><button class="modal-close" @click="pendingLineDelete = null"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete this product line?</h2><p>This removes only the selected item from the corporate purchase.</p><div class="modal-actions"><button class="secondary-button" @click="pendingLineDelete = null">Cancel</button><button class="danger-button" :disabled="lineDeleting" @click="confirmLineDelete"><Trash2 :size="16" />{{ lineDeleting ? 'Deleting…' : 'Delete line' }}</button></div></section></div>
    <div v-if="deleteOpen" class="modal-backdrop" @click.self="deleteOpen = false"><section class="delete-modal"><button class="modal-close" @click="deleteOpen = false"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete this corporate purchase?</h2><p v-if="deleteLoading">Checking referenced product lines…</p><template v-else-if="deleteCheck && !deleteCheck.canDelete"><div class="delete-blocked"><AlertTriangle :size="18" /><span><strong>Deletion prevented</strong><small>Remove all product lines before deleting the purchase header.</small></span></div><div class="reference-list"><div><span>Product lines</span><strong>{{ deleteCheck.references.productLines }}</strong></div></div><button class="secondary-button modal-done" @click="deleteOpen = false">Close</button></template><template v-else-if="deleteCheck"><p>No referenced product lines were found. Type DELETE to confirm.</p><label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="deleteText" placeholder="DELETE" /></label><div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="deleteText !== 'DELETE' || deleting" @click="removePurchase"><Trash2 :size="16" />{{ deleting ? 'Deleting…' : 'Delete purchase' }}</button></div></template></section></div>
  </section>
</template>
