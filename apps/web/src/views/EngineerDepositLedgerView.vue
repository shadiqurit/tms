<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowDownToLine, ArrowLeft, BanknoteArrowDown, ChevronLeft, ChevronRight, CircleDollarSign, Download, PackageSearch, Pencil, Plus, Search, Trash2, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { addDemoEngineerDeposit, deleteDemoEngineerDeposit, getDemoEngineerLedger, updateDemoEngineerDeposit, type DepositInput, type EngineerLedger, type EngineerLedgerTransaction } from '../data/engineerDeposits';

const route = useRoute(); const auth = useAuthStore(); const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
const employeeId = Number(route.params.employeeId);
const ledger = ref<EngineerLedger | null>(null); const transactions = ref<EngineerLedgerTransaction[]>([]);
const loading = ref(false); const saving = ref(false); const error = ref(''); const formError = ref(''); const showForm = ref(false); const editingId = ref<number | null>(null);
const search = ref(''); const typeFilter = ref('all'); const projectFilter = ref(0); const siteFilter = ref('all'); const page = ref(1); const pageSize = 30;
const today = new Date().toISOString().slice(0, 10);
const form = reactive<DepositInput>({ employeeId, depositDate: today, amount: 0, referenceNo: '', notes: '' });
const canManage = computed(() => auth.hasPermission('engineer_deposits.manage'));
const canDelete = computed(() => auth.hasPermission('engineer_deposits.delete'));
const canManagePurchases = computed(() => auth.hasPermission('site_purchases.manage'));
const spending = computed(() => transactions.value.filter((item) => item.type !== 'deposit'));
const projectSpending = computed(() => {
  const result = new Map<number, { id: number; code: string; name: string; materials: number; expenses: number; total: number; lines: number; sites: Set<number> }>();
  for (const item of spending.value) {
    if (!item.projectId) continue;
    let project = result.get(item.projectId);
    if (!project) { project = { id: item.projectId, code: item.projectCode ?? `#${item.projectId}`, name: item.projectName ?? '', materials: 0, expenses: 0, total: 0, lines: 0, sites: new Set() }; result.set(item.projectId, project); }
    project.total += Number(item.debit); project.lines++;
    if (item.type === 'material') project.materials += Number(item.debit); else project.expenses += Number(item.debit);
    if (item.siteId) project.sites.add(item.siteId);
  }
  return [...result.values()].sort((a, b) => b.total - a.total);
});
const availableSites = computed(() => {
  const sites = new Map<number, string>();
  for (const item of spending.value) if ((!projectFilter.value || item.projectId === projectFilter.value) && item.siteId) sites.set(item.siteId, item.siteName || `Site #${item.siteId}`);
  return [...sites].sort((a, b) => a[1].localeCompare(b[1]));
});
const scopedSpending = computed(() => spending.value.filter((item) => (!projectFilter.value || item.projectId === projectFilter.value) && (siteFilter.value === 'all' || (siteFilter.value === 'unassigned' ? !item.siteId : String(item.siteId) === siteFilter.value))));
const spendingTotal = computed(() => Math.round(scopedSpending.value.reduce((sum, item) => sum + item.debit * 100, 0)) / 100);
const scopeActive = computed(() => Boolean(projectFilter.value) || siteFilter.value !== 'all');
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return transactions.value.filter((item) => {
    if (scopeActive.value && item.type === 'deposit') return false;
    if (projectFilter.value && item.projectId !== projectFilter.value) return false;
    if (siteFilter.value !== 'all' && (siteFilter.value === 'unassigned' ? Boolean(item.siteId) : String(item.siteId) !== siteFilter.value)) return false;
    return (typeFilter.value === 'all' || item.type === typeFilter.value) &&
      (!term || [item.referenceNo, item.projectName, item.projectCode, item.description, item.notes, item.siteName, item.transactionDate].some((value) => String(value ?? '').toLowerCase().includes(term)));
  });
});
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const counts = computed(() => ({ deposits: transactions.value.filter((item) => item.type === 'deposit').length, materials: transactions.value.filter((item) => item.type === 'material').length, expenses: transactions.value.filter((item) => item.type === 'expense').length }));
watch([search, typeFilter, projectFilter, siteFilter], () => { page.value = 1; });
watch(projectFilter, () => { siteFilter.value = 'all'; typeFilter.value = 'all'; });
watch(siteFilter, () => { if (siteFilter.value !== 'all') typeFilter.value = 'all'; });

onMounted(load);
async function load() {
  loading.value = true; error.value = '';
  try {
    const result = demoMode ? getDemoEngineerLedger(employeeId) : await api<{ ledger: EngineerLedger; transactions: EngineerLedgerTransaction[] }>(`/engineer-deposits/ledger?employeeId=${employeeId}`);
    ledger.value = result.ledger; transactions.value = result.transactions;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load the engineer ledger.'; }
  finally { loading.value = false; }
}
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value)); }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not recorded'; }
function openNew() { editingId.value = null; Object.assign(form, { employeeId, depositDate: today, amount: 0, referenceNo: '', notes: '' }); formError.value = ''; showForm.value = true; }
function openEdit(item: EngineerLedgerTransaction) { editingId.value = item.id; Object.assign(form, { employeeId, depositDate: item.transactionDate ?? '', amount: item.credit, referenceNo: item.referenceNo ?? '', notes: item.notes ?? '' }); formError.value = ''; showForm.value = true; }
async function saveDeposit() {
  formError.value = '';
  if (!form.depositDate || Number(form.amount) <= 0) { formError.value = 'Enter a date and positive deposit amount.'; return; }
  saving.value = true;
  try {
    const payload = { ...form, amount: Number(form.amount) };
    if (demoMode) { if (editingId.value) updateDemoEngineerDeposit(editingId.value, payload); else addDemoEngineerDeposit(payload); }
    else await api(editingId.value ? `/engineer-deposits/deposits/${editingId.value}` : '/engineer-deposits/deposits', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    showForm.value = false; await load();
  } catch (reason) { formError.value = reason instanceof Error ? reason.message : 'Could not save the deposit.'; }
  finally { saving.value = false; }
}
async function removeDeposit(item: EngineerLedgerTransaction) {
  if (!window.confirm(`Delete the ${money(item.credit)} deposit from ${date(item.transactionDate)}?`)) return;
  try { if (demoMode) deleteDemoEngineerDeposit(item.id); else await api(`/engineer-deposits/deposits/${item.id}`, { method: 'DELETE' }); await load(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete the deposit.'; }
}
function exportLedger() {
  if (!ledger.value) return;
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Date','Type','Reference','Project','Site','Details','Deposit','Spent','Overall running balance'], ...filtered.value.map((item) => [item.transactionDate,item.type,item.referenceNo,item.projectName,item.siteName,item.description,item.credit,item.debit,item.balance])];
  const blob = new Blob(['\uFEFF', rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${ledger.value.employeeCode || ledger.value.employeeId}-engineer-ledger.csv`; link.click(); URL.revokeObjectURL(link.href);
}
</script>

<template>
  <section class="sites-page engineer-ledger-page">
    <RouterLink to="/finance/engineer-deposits" class="back-link"><ArrowLeft :size="16" /> Back to engineer balances</RouterLink>
    <div v-if="loading && !ledger" class="panel table-loading">Loading complete transaction ledger…</div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <template v-if="ledger">
      <div class="ledger-hero panel"><div class="ledger-person"><span>{{ ledger.employeeName.split(' ').map((part) => part[0]).join('').slice(0,2) }}</span><div><small>Overall site engineer ledger</small><h2>{{ ledger.employeeName }}</h2><p>{{ ledger.employeeCode || `Employee #${ledger.employeeId}` }} · spending across all assigned projects and sites</p></div></div><div class="ledger-actions"><button class="secondary-button" @click="exportLedger"><Download :size="16" /> Export filtered CSV</button><RouterLink v-if="canManagePurchases" :to="{ path: '/purchases/site-engineer/new', query: { employeeId, projectId: projectFilter || undefined, entry: 'expense' } }" class="secondary-button"><CircleDollarSign :size="16" /> Record project/site spending</RouterLink><button v-if="canManage" class="primary-button" @click="openNew"><Plus :size="17" /> Add deposit</button></div></div>
      <div class="ledger-balance-grid">
        <article class="panel"><span><ArrowDownToLine :size="18" /></span><div><small>Deposited overall</small><strong>{{ money(ledger.deposited) }}</strong><em>{{ counts.deposits }} transactions</em></div></article>
        <article class="panel"><span><PackageSearch :size="18" /></span><div><small>Materials spent</small><strong>{{ money(transactions.filter((item) => item.type === 'material').reduce((sum, item) => sum + item.debit, 0)) }}</strong><em>{{ counts.materials }} purchase lines</em></div></article>
        <article class="panel"><span><CircleDollarSign :size="18" /></span><div><small>Other expenses</small><strong>{{ money(transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.debit, 0)) }}</strong><em>{{ counts.expenses }} expense lines</em></div></article>
        <article class="panel net" :class="{ negative: ledger.balance < 0 }"><span><WalletCards :size="18" /></span><div><small>Overall balance</small><strong>{{ money(ledger.balance) }}</strong><em>{{ ledger.balance < 0 ? 'Overdrawn — review required' : 'Available with engineer' }}</em></div></article>
      </div>
      <div class="ledger-explanation panel"><BanknoteArrowDown :size="19" /><p><strong>Overall balance = all deposits − all posted material purchases − all posted site expenses.</strong> Project and site filters show where the engineer spent money; the running balance always remains the overall engineer balance.</p></div>

      <section class="panel engineer-project-summary"><header><h3>Spending by project</h3><p>Deposits are received by the engineer overall; these figures show spending only.</p></header><div class="site-table-wrap"><table class="site-table engineer-project-table"><thead><tr><th>Project</th><th>Materials</th><th>Other expenses</th><th>Total spent</th><th>Sites / lines</th><th></th></tr></thead><tbody><tr v-for="project in projectSpending" :key="project.id"><td><div class="site-project-cell"><strong>{{ project.code }}</strong><small>{{ project.name }}</small></div></td><td>{{ money(project.materials) }}</td><td>{{ money(project.expenses) }}</td><td><strong>{{ money(project.total) }}</strong></td><td>{{ project.sites.size }} sites · {{ project.lines }} lines</td><td><button class="secondary-button small" @click="projectFilter = project.id">Show entries</button></td></tr><tr v-if="!projectSpending.length"><td colspan="6">No project spending recorded yet.</td></tr></tbody></table></div></section>

      <div class="site-toolbar panel ledger-toolbar"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search reference, project, site, detail, or date…" /></label><select v-model.number="projectFilter"><option :value="0">All projects</option><option v-for="project in projectSpending" :key="project.id" :value="project.id">{{ project.code }} — {{ project.name }}</option></select><select v-model="siteFilter"><option value="all">All sites</option><option value="unassigned">No site recorded</option><option v-for="site in availableSites" :key="site[0]" :value="String(site[0])">{{ site[1] }}</option></select><select v-model="typeFilter"><option value="all">All transactions</option><option value="deposit">Deposits only</option><option value="material">Materials only</option><option value="expense">Other expenses only</option></select></div>
      <div v-if="scopeActive" class="panel engineer-spending-scope"><span><strong>{{ money(spendingTotal) }}</strong> spent in this {{ projectFilter ? 'project' : 'engineer' }}{{ siteFilter !== 'all' ? ' / site selection' : '' }}</span><small>{{ scopedSpending.length }} spending lines · deposits remain in the overall balance above</small></div>
      <div class="site-table-wrap panel ledger-table-wrap"><table class="site-table engineer-transaction-table"><thead><tr><th>Date / type</th><th>Reference</th><th>Project</th><th>Site</th><th>Transaction details</th><th>Deposit</th><th>Spent</th><th>Overall running balance</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        <tr v-for="item in visible" :key="`${item.type}-${item.id}`"><td><div class="ledger-kind"><span :class="item.type">{{ item.type === 'deposit' ? 'Deposit' : item.type === 'material' ? 'Material' : 'Expense' }}</span><small>{{ date(item.transactionDate) }}</small></div></td><td><RouterLink v-if="item.purchaseId && canManagePurchases" :to="`/purchases/site-engineer/${item.purchaseId}/edit`" class="ledger-reference">{{ item.referenceNo }}</RouterLink><strong v-else class="ledger-reference plain">{{ item.referenceNo || `DEP-${item.id}` }}</strong></td><td><span class="ledger-site">{{ item.type === 'deposit' ? 'Overall deposit' : `${item.projectCode || ''} ${item.projectName || ''}` }}</span></td><td><span class="ledger-site">{{ item.type === 'deposit' ? '—' : item.siteName || 'No site recorded' }}</span></td><td><div class="ledger-description"><strong>{{ item.description }}</strong><small v-if="item.notes && item.notes !== item.description">{{ item.notes }}</small></div></td><td><strong v-if="item.credit" class="ledger-credit">+ {{ money(item.credit) }}</strong><span v-else>—</span></td><td><strong v-if="item.debit" class="ledger-debit">− {{ money(item.debit) }}</strong><span v-else>—</span></td><td><strong class="deposit-balance" :class="{ negative: item.balance < 0 }">{{ money(item.balance) }}</strong></td><td><div v-if="item.type === 'deposit'" class="line-actions"><button v-if="canManage" class="line-edit" aria-label="Edit deposit" @click="openEdit(item)"><Pencil :size="14" /></button><button v-if="canDelete" class="line-delete" aria-label="Delete deposit" @click="removeDeposit(item)"><Trash2 :size="14" /></button></div></td></tr>
        <tr v-if="!visible.length"><td colspan="9"><div class="site-empty"><WalletCards :size="24" /><strong>No transactions found</strong><span>Change the filters or add a deposit.</span></div></td></tr>
      </tbody></table><footer v-if="filtered.length" class="table-pagination"><span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }} transactions</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer></div>
    </template>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><form class="expense-line-modal deposit-entry-modal" @submit.prevent="saveDeposit"><header><span><ArrowDownToLine :size="18" /></span><div><h3>{{ editingId ? 'Modify deposit' : 'Add deposit' }}</h3><p>Overall cash received by {{ ledger?.employeeName }}</p></div><button type="button" class="modal-close" @click="showForm = false"><X :size="18" /></button></header><div class="form-grid two">
      <label class="form-field"><span>Deposit date <b>*</b></span><input v-model="form.depositDate" type="date" required /></label><label class="form-field"><span>Amount (BDT) <b>*</b></span><input v-model.number="form.amount" type="number" min="0.01" step="0.01" required /></label>
      <label class="form-field full"><span>Reference</span><input v-model="form.referenceNo" maxlength="120" placeholder="Cheque, voucher, or transfer no." /></label>
      <label class="form-field full"><span>Notes</span><textarea v-model="form.notes" rows="3" maxlength="500" placeholder="Optional transaction details"></textarea></label>
    </div><p v-if="formError" class="form-error">{{ formError }}</p><footer><button type="button" class="secondary-button" @click="showForm = false">Cancel</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Update deposit' : 'Save deposit' }}</button></footer></form></div>
  </section>
</template>
