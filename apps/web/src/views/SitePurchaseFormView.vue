<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, PackagePlus, PackageSearch, Pencil, Plus, ReceiptText, Save, Search, Trash2, UserRoundCog, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
import { employeeOptions as demoEmployees, type EmployeeOption } from '../data/assignments';
import { demoExpenseLines, demoMaterialLines, employeeProjectOptions as demoEmployeeProjects, expenseHeadOptions as demoExpenseHeads, materialOptions as demoMaterials, nextMaterialLineId, nextSiteExpenseLineId, nextSitePurchaseId, sitePurchaseRecords, supplierOptions as demoSuppliers, unitOptions as demoUnits, type EmployeeProjectOption, type MaterialLineRecord, type PurchaseLinePage, type PurchaseOption, type SiteExpenseLineRecord, type SitePurchaseRecord } from '../data/sitePurchases';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';

interface ProjectOption { id: number; code: string; name: string; tenderId: string; location: string }
interface SiteOption { id: number; projectId: number; name: string; address: string }
interface PurchaseOptions { projects: ProjectOption[]; employees: EmployeeOption[]; employeeProjects: EmployeeProjectOption[]; suppliers: PurchaseOption[]; materials: PurchaseOption[]; units: PurchaseOption[]; expenseHeads: PurchaseOption[]; sites: SiteOption[] }
type EntryTab = 'materials' | 'expenses';

const route = useRoute(); const router = useRouter();
const editing = computed(() => route.name === 'site-purchase-edit');
const purchaseId = computed(() => Number(route.params.id));
const projects = ref<ProjectOption[]>(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const employees = ref<EmployeeOption[]>([...demoEmployees]);
const employeeProjects = ref<EmployeeProjectOption[]>([...demoEmployeeProjects]);
const suppliers = ref<PurchaseOption[]>([...demoSuppliers]);
const materials = ref<PurchaseOption[]>([...demoMaterials]);
const units = ref<PurchaseOption[]>([...demoUnits]);
const expenseHeads = ref<PurchaseOption[]>([...demoExpenseHeads]);
const sites = ref<SiteOption[]>(demoSites.map(({ id, projectId, name, address }) => ({ id, projectId, name, address })));
const loading = ref(false); const saving = ref(false); const saved = ref(''); const error = ref('');
const activeTab = ref<EntryTab>('materials'); const lineFormOpen = ref(false); const lineSaving = ref(false);
const materialItems = ref<MaterialLineRecord[]>([]); const expenseItems = ref<SiteExpenseLineRecord[]>([]);
const materialPage = ref(1); const expensePage = ref(1); const pageSize = 20; const materialTotalRows = ref(0); const expenseTotalRows = ref(0);
const lineSearch = ref(''); const pendingLineDelete = ref<{ kind: EntryTab; id: number } | null>(null); const lineDeleting = ref(false);
const deleteOpen = ref(false); const deleteLoading = ref(false); const deleteCheck = ref<{ canDelete: boolean; references: { materials: number; expenses: number } } | null>(null); const deleting = ref(false); const deleteText = ref('');
const counts = reactive({ materialCount: 0, materialTotal: 0, expenseCount: 0, expenseTotal: 0 });
const today = new Date().toISOString().slice(0, 10);
const form = reactive({ projectId: Number(route.query.projectId || 0), employeeId: 0, supplierId: null as number | null, purchaseNo: '', localSupplier: '', supplierAddress: '', purchaseDate: today, purchaseType: 'local' as 'local' | 'corporate', challanNo: '', challanDate: '', notes: '', status: 'posted' as 'draft' | 'posted' | 'cancelled' });
const materialForm = reactive({ id: null as number | null, materialId: 0, unitId: null as number | null, siteId: null as number | null, entryDate: today, quantity: 1 as number | '', unitPrice: '' as number | '', discount: '' as number | '', notes: '' });
const expenseForm = reactive({ id: null as number | null, expenseHeadId: null as number | null, siteId: null as number | null, entryDate: today, amount: '' as number | '', notes: '' });

const availableEmployees = computed(() => form.projectId ? employees.value.filter((employee) => employeeProjects.value.some((link) => link.employeeId === employee.id && link.projectId === form.projectId)) : employees.value);
const availableSites = computed(() => sites.value.filter((site) => site.projectId === form.projectId));
const materialPageCount = computed(() => Math.max(1, Math.ceil(materialTotalRows.value / pageSize)));
const expensePageCount = computed(() => Math.max(1, Math.ceil(expenseTotalRows.value / pageSize)));
const materialLineTotal = computed(() => Math.max(0, Number(materialForm.quantity || 0) * Number(materialForm.unitPrice || 0) - Number(materialForm.discount || 0)));
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function dateValue(value: unknown) { return value ? String(value).slice(0, 10) : ''; }

function fillHeader(item: SitePurchaseRecord) {
  form.projectId = item.projectId; form.employeeId = item.employeeId; form.supplierId = item.supplierId;
  form.purchaseNo = item.purchaseNo ?? ''; form.localSupplier = item.localSupplier ?? ''; form.supplierAddress = item.supplierAddress ?? '';
  form.purchaseDate = dateValue(item.purchaseDate); form.purchaseType = item.purchaseType; form.challanNo = item.challanNo ?? '';
  form.challanDate = dateValue(item.challanDate); form.notes = item.notes ?? ''; form.status = item.status;
  Object.assign(counts, { materialCount: Number(item.materialCount), materialTotal: Number(item.materialTotal), expenseCount: Number(item.expenseCount), expenseTotal: Number(item.expenseTotal) });
}

async function loadHeader() {
  if (!editing.value) return;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') { const item = sitePurchaseRecords.find((entry) => entry.id === purchaseId.value); if (item) fillHeader(item); return; }
  const result = await api<{ purchase: SitePurchaseRecord }>(`/site-purchases/${purchaseId.value}`); fillHeader(result.purchase);
}
async function loadLines() {
  if (!editing.value) return;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') {
    materialItems.value = demoMaterialLines.filter((item) => item.purchaseId === purchaseId.value).map((item) => ({ ...item }));
    expenseItems.value = demoExpenseLines.filter((item) => item.purchaseId === purchaseId.value).map((item) => ({ ...item }));
    materialTotalRows.value = materialItems.value.length; expenseTotalRows.value = expenseItems.value.length; return;
  }
  if (activeTab.value === 'materials') {
    const result = await api<PurchaseLinePage<MaterialLineRecord>>(`/site-purchases/${purchaseId.value}/materials?page=${materialPage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
    materialItems.value = result.items; materialTotalRows.value = result.total;
  } else {
    const result = await api<PurchaseLinePage<SiteExpenseLineRecord>>(`/site-purchases/${purchaseId.value}/expenses?page=${expensePage.value}&pageSize=${pageSize}&search=${encodeURIComponent(lineSearch.value)}`);
    expenseItems.value = result.items; expenseTotalRows.value = result.total;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const options = await api<PurchaseOptions>('/site-purchases/options');
      projects.value = options.projects; employees.value = options.employees; employeeProjects.value = options.employeeProjects;
      suppliers.value = options.suppliers; materials.value = options.materials; units.value = options.units;
      expenseHeads.value = options.expenseHeads; sites.value = options.sites;
    }
    await loadHeader(); await loadLines();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load site purchase information.'; }
  finally { loading.value = false; }
});
watch(() => form.projectId, () => {
  if (form.employeeId && !availableEmployees.value.some((employee) => employee.id === form.employeeId)) form.employeeId = 0;
  if (materialForm.siteId && !availableSites.value.some((site) => site.id === materialForm.siteId)) materialForm.siteId = null;
  if (expenseForm.siteId && !availableSites.value.some((site) => site.id === expenseForm.siteId)) expenseForm.siteId = null;
});
watch(activeTab, () => { lineSearch.value = ''; lineFormOpen.value = false; loadLines(); });

function supplierChanged() { const supplier = suppliers.value.find((item) => item.id === form.supplierId); if (supplier) form.supplierAddress = supplier.address ?? ''; }
function materialChanged() { const material = materials.value.find((item) => item.id === materialForm.materialId); materialForm.unitId = material?.unitId ?? null; }
function resetMaterialForm() { Object.assign(materialForm, { id: null, materialId: 0, unitId: null, siteId: null, entryDate: form.purchaseDate || today, quantity: 1, unitPrice: '', discount: '', notes: '' }); }
function resetExpenseForm() { Object.assign(expenseForm, { id: null, expenseHeadId: null, siteId: null, entryDate: form.purchaseDate || today, amount: '', notes: '' }); }
function closeLineForm() { lineFormOpen.value = false; error.value = ''; }
function addEntry() { error.value = ''; activeTab.value === 'materials' ? resetMaterialForm() : resetExpenseForm(); lineFormOpen.value = true; }
function editMaterial(item: MaterialLineRecord) { error.value = ''; Object.assign(materialForm, { id: item.id, materialId: item.materialId, unitId: item.unitId, siteId: item.siteId, entryDate: dateValue(item.entryDate), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount || 0), notes: item.notes ?? '' }); lineFormOpen.value = true; }
function editExpense(item: SiteExpenseLineRecord) { error.value = ''; Object.assign(expenseForm, { id: item.id, expenseHeadId: item.expenseHeadId, siteId: item.siteId, entryDate: dateValue(item.entryDate), amount: Number(item.amount), notes: item.notes ?? '' }); lineFormOpen.value = true; }

async function saveHeader() {
  error.value = ''; saved.value = '';
  if (!form.projectId || !form.employeeId || !form.purchaseDate) { error.value = 'Select a project, assigned employee, and purchase date.'; return; }
  saving.value = true;
  try {
    let id = purchaseId.value;
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const result = await api<{ id: number }>(editing.value ? `/site-purchases/${purchaseId.value}` : '/site-purchases', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(form) }); id = result.id;
    } else {
      id = editing.value ? purchaseId.value : nextSitePurchaseId(); const project = projects.value.find((item) => item.id === form.projectId)!; const employee = employees.value.find((item) => item.id === form.employeeId)!; const supplier = suppliers.value.find((item) => item.id === form.supplierId);
      const current = sitePurchaseRecords.find((item) => item.id === id); const record: SitePurchaseRecord = { id, ...form, projectCode: project.code, projectName: project.name, employeeName: employee.name, employeeCode: employee.employeeCode, supplierName: supplier?.name ?? (form.localSupplier || 'Local supplier'), materialCount: current?.materialCount ?? 0, materialTotal: current?.materialTotal ?? 0, expenseCount: current?.expenseCount ?? 0, expenseTotal: current?.expenseTotal ?? 0 };
      const index = sitePurchaseRecords.findIndex((item) => item.id === id); if (index >= 0) sitePurchaseRecords[index] = record; else sitePurchaseRecords.unshift(record);
    }
    saved.value = editing.value ? 'Purchase header updated.' : 'Purchase created. Add material and expense entries below.';
    if (!editing.value) await router.replace(`/purchases/site-engineer/${id}/edit`);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save the purchase header.'; }
  finally { saving.value = false; }
}

async function saveMaterial() {
  if (!materialForm.materialId || !materialForm.entryDate || Number(materialForm.quantity) <= 0 || materialForm.unitPrice === '') { error.value = 'Complete the material, date, quantity, and price.'; return; }
  lineSaving.value = true; error.value = '';
  try {
    const payload = { materialId: materialForm.materialId, unitId: materialForm.unitId, siteId: materialForm.siteId, entryDate: materialForm.entryDate, quantity: Number(materialForm.quantity), unitPrice: Number(materialForm.unitPrice), discount: Number(materialForm.discount || 0), notes: materialForm.notes };
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(materialForm.id ? `/site-purchases/${purchaseId.value}/materials/${materialForm.id}` : `/site-purchases/${purchaseId.value}/materials`, { method: materialForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    else { const material = materials.value.find((item) => item.id === payload.materialId)!; const unit = units.value.find((item) => item.id === payload.unitId); const site = sites.value.find((item) => item.id === payload.siteId); const record: MaterialLineRecord = { id: materialForm.id ?? nextMaterialLineId(), purchaseId: purchaseId.value, materialId: material.id, materialName: material.name, unitId: payload.unitId, unitName: unit?.name ?? '', siteId: payload.siteId, siteName: site?.name ?? '', entryDate: payload.entryDate, quantity: payload.quantity, unitPrice: payload.unitPrice, discount: payload.discount, totalAmount: materialLineTotal.value, notes: payload.notes }; const index = demoMaterialLines.findIndex((item) => item.id === record.id); if (index >= 0) demoMaterialLines[index] = record; else demoMaterialLines.unshift(record); }
    lineFormOpen.value = false; resetMaterialForm(); await loadLines(); if (import.meta.env.VITE_DEMO_MODE === 'false') await loadHeader();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save material entry.'; }
  finally { lineSaving.value = false; }
}
async function saveExpense() {
  if (!expenseForm.entryDate || expenseForm.amount === '' || Number(expenseForm.amount) < 0) { error.value = 'Complete the expense date and amount.'; return; }
  lineSaving.value = true; error.value = '';
  try {
    const payload = { expenseHeadId: expenseForm.expenseHeadId, siteId: expenseForm.siteId, entryDate: expenseForm.entryDate, amount: Number(expenseForm.amount), notes: expenseForm.notes };
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(expenseForm.id ? `/site-purchases/${purchaseId.value}/expenses/${expenseForm.id}` : `/site-purchases/${purchaseId.value}/expenses`, { method: expenseForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    else { const head = expenseHeads.value.find((item) => item.id === payload.expenseHeadId); const site = sites.value.find((item) => item.id === payload.siteId); const record: SiteExpenseLineRecord = { id: expenseForm.id ?? nextSiteExpenseLineId(), purchaseId: purchaseId.value, expenseHeadId: payload.expenseHeadId, expenseHeadName: head?.name ?? 'Unspecified expense', siteId: payload.siteId, siteName: site?.name ?? '', entryDate: payload.entryDate, amount: payload.amount, notes: payload.notes }; const index = demoExpenseLines.findIndex((item) => item.id === record.id); if (index >= 0) demoExpenseLines[index] = record; else demoExpenseLines.unshift(record); }
    lineFormOpen.value = false; resetExpenseForm(); await loadLines(); if (import.meta.env.VITE_DEMO_MODE === 'false') await loadHeader();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save site expense.'; }
  finally { lineSaving.value = false; }
}

async function confirmLineDelete() {
  if (!pendingLineDelete.value) return; lineDeleting.value = true;
  try { const target = pendingLineDelete.value; if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/site-purchases/${purchaseId.value}/${target.kind}/${target.id}`, { method: 'DELETE' }); else { const list = target.kind === 'materials' ? demoMaterialLines : demoExpenseLines; const index = list.findIndex((item) => item.id === target.id); if (index >= 0) list.splice(index, 1); } pendingLineDelete.value = null; await loadLines(); if (import.meta.env.VITE_DEMO_MODE === 'false') await loadHeader(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the entry.'; pendingLineDelete.value = null; }
  finally { lineDeleting.value = false; }
}
async function checkDelete() {
  deleteOpen.value = true; deleteText.value = ''; deleteCheck.value = null; deleteLoading.value = true;
  try { deleteCheck.value = import.meta.env.VITE_DEMO_MODE === 'false' ? await api(`/site-purchases/${purchaseId.value}/delete-check`) : { canDelete: counts.materialCount + counts.expenseCount === 0, references: { materials: counts.materialCount, expenses: counts.expenseCount } }; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not check purchase references.'; deleteOpen.value = false; }
  finally { deleteLoading.value = false; }
}
async function removePurchase() {
  if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE') return; deleting.value = true;
  try { if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/site-purchases/${purchaseId.value}`, { method: 'DELETE' }); else { const index = sitePurchaseRecords.findIndex((item) => item.id === purchaseId.value); if (index >= 0) sitePurchaseRecords.splice(index, 1); } await router.push('/purchases/site-engineer'); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the purchase.'; deleteOpen.value = false; }
  finally { deleting.value = false; }
}
</script>

<template>
  <section class="project-form-page site-purchase-form-page">
    <div class="form-page-head"><RouterLink to="/purchases/site-engineer" class="back-link"><ArrowLeft :size="16" /> All site purchases</RouterLink><div><span class="form-heading-icon"><PackageSearch :size="21" /></span><span><h2>{{ editing ? 'Site purchase ledger' : 'New site purchase ledger' }}</h2><p>Save the project and employee first, then enter materials and other site expenses.</p></span></div></div>
    <form class="project-form panel purchase-header-form" @submit.prevent="saveHeader"><div v-if="loading" class="site-form-loading">Loading purchase information…</div><div class="form-section-title"><span>01</span><div><h3>Purchase header</h3><p>The employee must already be assigned to the selected project.</p></div></div><div class="form-grid">
      <label class="form-field full"><span>Project <b>*</b></span><ProjectSearchSelect v-model="form.projectId" :projects="projects" /></label>
      <label class="form-field"><span>Site engineer / employee <b>*</b></span><select v-model.number="form.employeeId"><option :value="0" disabled>Select assigned employee</option><option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">{{ employee.employeeCode }} — {{ employee.name }}</option></select></label>
      <label class="form-field"><span>Purchase date <b>*</b></span><div><CalendarDays :size="16" /><input v-model="form.purchaseDate" type="date" /></div></label>
      <label class="form-field"><span>Purchase number</span><div><input v-model="form.purchaseNo" placeholder="Purchase / ledger number" /></div></label>
      <label class="form-field"><span>Purchase type</span><select v-model="form.purchaseType"><option value="local">Local</option><option value="corporate">Corporate</option></select></label>
      <label class="form-field"><span>Registered supplier</span><select v-model="form.supplierId" @change="supplierChanged"><option :value="null">Local / unregistered supplier</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label>
      <label class="form-field"><span>Local supplier name</span><div><input v-model="form.localSupplier" placeholder="Optional supplier name" /></div></label>
      <label class="form-field full"><span>Supplier address</span><div><input v-model="form.supplierAddress" placeholder="Supplier address" /></div></label>
      <label class="form-field"><span>Challan number</span><div><input v-model="form.challanNo" placeholder="Challan / invoice" /></div></label><label class="form-field"><span>Challan date</span><div><CalendarDays :size="16" /><input v-model="form.challanDate" type="date" /></div></label>
      <label class="form-field full"><span>Notes</span><div><input v-model="form.notes" placeholder="Purchase notes" /></div></label><label class="form-field"><span>Status</span><select v-model="form.status"><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label>
    </div><p v-if="error" class="form-error form-message">{{ error }}</p><p v-if="saved" class="save-success"><Check :size="16" />{{ saved }}</p><footer class="form-actions"><button v-if="editing" type="button" class="delete-project-button" @click="checkDelete"><Trash2 :size="16" /> Delete ledger</button><RouterLink to="/purchases/site-engineer" class="secondary-button">Cancel</RouterLink><button class="primary-button" :disabled="saving"><Save :size="17" />{{ saving ? 'Saving…' : editing ? 'Save header' : 'Create ledger' }}</button></footer></form>

    <section v-if="editing" class="purchase-entries panel"><header class="purchase-entry-summary"><div><button :class="{ active: activeTab === 'materials' }" @click="activeTab = 'materials'"><PackagePlus :size="17" /><span><strong>Material purchases</strong><small>{{ counts.materialCount }} entries · {{ money(counts.materialTotal) }}</small></span></button><button :class="{ active: activeTab === 'expenses' }" @click="activeTab = 'expenses'"><ReceiptText :size="17" /><span><strong>Other site expenses</strong><small>{{ counts.expenseCount }} entries · {{ money(counts.expenseTotal) }}</small></span></button></div><strong>{{ money(counts.materialTotal + counts.expenseTotal) }} total</strong></header>
      <div class="purchase-entry-toolbar"><label class="table-search"><Search :size="16" /><input v-model="lineSearch" :placeholder="activeTab === 'materials' ? 'Search materials or sites…' : 'Search expense heads or sites…'" @keyup.enter="loadLines" /></label><button class="secondary-button" @click="loadLines"><Search :size="15" /> Search</button><button class="primary-button" @click="addEntry"><Plus :size="16" />{{ activeTab === 'materials' ? 'Add material' : 'Add expense' }}</button></div>
      <div class="purchase-lines-table-wrap"><table v-if="activeTab === 'materials'" class="site-table purchase-lines-table"><thead><tr><th>Date</th><th>Material</th><th>Site</th><th>Quantity</th><th>Price</th><th>Total</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody><tr v-for="item in materialItems" :key="item.id"><td data-label="Date">{{ dateValue(item.entryDate) }}</td><td data-label="Material"><strong>{{ item.materialName }}</strong><small>{{ item.notes }}</small></td><td data-label="Site">{{ item.siteName || 'General project' }}</td><td data-label="Quantity">{{ item.quantity }} {{ item.unitName }}</td><td data-label="Price">{{ money(item.unitPrice) }}</td><td data-label="Total"><strong>{{ money(item.totalAmount) }}</strong></td><td data-label="Actions"><div class="line-actions"><button type="button" @click="editMaterial(item)"><Pencil :size="14" /></button><button type="button" class="danger" @click="pendingLineDelete = { kind: 'materials', id: item.id }"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!materialItems.length"><td colspan="7"><div class="site-empty"><PackagePlus :size="22" /><strong>No material entries found</strong></div></td></tr></tbody></table>
      <table v-else class="site-table purchase-lines-table"><thead><tr><th>Date</th><th>Expense head</th><th>Site</th><th>Notes</th><th>Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody><tr v-for="item in expenseItems" :key="item.id"><td data-label="Date">{{ dateValue(item.entryDate) }}</td><td data-label="Expense head"><strong>{{ item.expenseHeadName }}</strong></td><td data-label="Site">{{ item.siteName || 'General project' }}</td><td data-label="Notes">{{ item.notes || '—' }}</td><td data-label="Amount"><strong>{{ money(item.amount) }}</strong></td><td data-label="Actions"><div class="line-actions"><button type="button" @click="editExpense(item)"><Pencil :size="14" /></button><button type="button" class="danger" @click="pendingLineDelete = { kind: 'expenses', id: item.id }"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!expenseItems.length"><td colspan="6"><div class="site-empty"><ReceiptText :size="22" /><strong>No expense entries found</strong></div></td></tr></tbody></table></div>
      <footer class="table-pagination purchase-line-pagination"><span>{{ activeTab === 'materials' ? materialTotalRows : expenseTotalRows }} matching entries</span><div v-if="activeTab === 'materials'"><button :disabled="materialPage === 1" @click="materialPage--; loadLines()"><ChevronLeft :size="16" /></button><span>Page {{ materialPage }} of {{ materialPageCount }}</span><button :disabled="materialPage === materialPageCount" @click="materialPage++; loadLines()"><ChevronRight :size="16" /></button></div><div v-else><button :disabled="expensePage === 1" @click="expensePage--; loadLines()"><ChevronLeft :size="16" /></button><span>Page {{ expensePage }} of {{ expensePageCount }}</span><button :disabled="expensePage === expensePageCount" @click="expensePage++; loadLines()"><ChevronRight :size="16" /></button></div></footer>
    </section>

    <div v-if="lineFormOpen && activeTab === 'materials'" class="modal-backdrop" @click.self="closeLineForm"><form class="purchase-line-form purchase-line-modal" @submit.prevent="saveMaterial"><header><div><PackagePlus :size="18" /><span><strong>{{ materialForm.id ? 'Modify material entry' : 'Add material purchase' }}</strong><small>Total is calculated from quantity × price − discount.</small></span></div><button type="button" @click="closeLineForm"><X :size="17" /></button></header><div class="form-grid three"><label class="form-field full"><span>Material <b>*</b></span><select v-model.number="materialForm.materialId" @change="materialChanged"><option :value="0" disabled>Select material</option><option v-for="item in materials" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="form-field"><span>Entry date <b>*</b></span><div><input v-model="materialForm.entryDate" type="date" /></div></label><label class="form-field"><span>Project site</span><select v-model="materialForm.siteId"><option :value="null">General project purchase</option><option v-for="site in availableSites" :key="site.id" :value="site.id">{{ site.name }}</option></select></label><label class="form-field"><span>Unit</span><select v-model="materialForm.unitId"><option :value="null">No unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></label><label class="form-field"><span>Quantity <b>*</b></span><div><input v-model.number="materialForm.quantity" type="number" min="0.0001" step="0.0001" /></div></label><label class="form-field"><span>Unit price <b>*</b></span><div><input v-model.number="materialForm.unitPrice" type="number" min="0" step="0.0001" /></div></label><label class="form-field"><span>Discount</span><div><input v-model.number="materialForm.discount" type="number" min="0" step="0.01" /></div></label><label class="form-field full"><span>Notes</span><div><input v-model="materialForm.notes" placeholder="Optional material notes" /></div></label></div><p v-if="error" class="form-error modal-error">{{ error }}</p><footer><span>Calculated total <strong>{{ money(materialLineTotal) }}</strong></span><button type="button" class="secondary-button" @click="closeLineForm">Cancel</button><button class="primary-button" :disabled="lineSaving"><Check :size="15" />{{ lineSaving ? 'Saving…' : materialForm.id ? 'Update material' : 'Add material' }}</button></footer></form></div>
    <div v-if="lineFormOpen && activeTab === 'expenses'" class="modal-backdrop" @click.self="closeLineForm"><form class="purchase-line-form purchase-line-modal purchase-expense-modal" @submit.prevent="saveExpense"><header><div><ReceiptText :size="18" /><span><strong>{{ expenseForm.id ? 'Modify site expense' : 'Add other site expense' }}</strong><small>Uses the expense heads imported from ENG_EXPHEAD.</small></span></div><button type="button" @click="closeLineForm"><X :size="17" /></button></header><div class="form-grid"><label class="form-field full"><span>Expense head</span><select v-model="expenseForm.expenseHeadId"><option :value="null">Unspecified expense</option><option v-for="head in expenseHeads" :key="head.id" :value="head.id">{{ head.name }}</option></select></label><label class="form-field"><span>Entry date <b>*</b></span><div><input v-model="expenseForm.entryDate" type="date" /></div></label><label class="form-field"><span>Project site</span><select v-model="expenseForm.siteId"><option :value="null">General project expense</option><option v-for="site in availableSites" :key="site.id" :value="site.id">{{ site.name }}</option></select></label><label class="form-field"><span>Amount <b>*</b></span><div><input v-model.number="expenseForm.amount" type="number" min="0" step="0.01" /></div></label><label class="form-field full"><span>Notes</span><div><input v-model="expenseForm.notes" placeholder="Expense details" /></div></label></div><p v-if="error" class="form-error modal-error">{{ error }}</p><footer><span>Expense amount <strong>{{ money(Number(expenseForm.amount || 0)) }}</strong></span><button type="button" class="secondary-button" @click="closeLineForm">Cancel</button><button class="primary-button" :disabled="lineSaving"><Check :size="15" />{{ lineSaving ? 'Saving…' : expenseForm.id ? 'Update expense' : 'Add expense' }}</button></footer></form></div>
    <div v-if="pendingLineDelete" class="modal-backdrop" @click.self="pendingLineDelete = null"><section class="delete-modal"><button class="modal-close" @click="pendingLineDelete = null"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete this entry?</h2><p>This removes only the selected {{ pendingLineDelete.kind === 'materials' ? 'material purchase' : 'site expense' }} line.</p><div class="modal-actions"><button class="secondary-button" @click="pendingLineDelete = null">Cancel</button><button class="danger-button" :disabled="lineDeleting" @click="confirmLineDelete"><Trash2 :size="16" />{{ lineDeleting ? 'Deleting…' : 'Delete entry' }}</button></div></section></div>
    <div v-if="deleteOpen" class="modal-backdrop" @click.self="deleteOpen = false"><section class="delete-modal"><button class="modal-close" @click="deleteOpen = false"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete this purchase ledger?</h2><p v-if="deleteLoading">Checking material and expense entries…</p><template v-else-if="deleteCheck && !deleteCheck.canDelete"><div class="delete-blocked"><AlertTriangle :size="18" /><span><strong>Deletion prevented</strong><small>Remove all ledger entries before deleting the header.</small></span></div><div class="reference-list"><div><span>Material entries</span><strong>{{ deleteCheck.references.materials }}</strong></div><div><span>Other expense entries</span><strong>{{ deleteCheck.references.expenses }}</strong></div></div><button class="secondary-button modal-done" @click="deleteOpen = false">Close</button></template><template v-else-if="deleteCheck"><p>No referenced entries were found. Type DELETE to confirm.</p><label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="deleteText" placeholder="DELETE" /></label><div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="deleteText !== 'DELETE' || deleting" @click="removePurchase"><Trash2 :size="16" />{{ deleting ? 'Deleting…' : 'Delete ledger' }}</button></div></template></section></div>
  </section>
</template>
