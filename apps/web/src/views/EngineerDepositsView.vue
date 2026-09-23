<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDownToLine, ChevronLeft, ChevronRight, CircleDollarSign, Landmark, Plus, Search, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { addDemoEngineerDeposit, buildDemoEngineerAccounts, type DepositInput, type EngineerAccountSummary } from '../data/engineerDeposits';
import { employeeProjectOptions } from '../data/sitePurchases';
import { employeeOptions } from '../data/assignments';
import { projects } from '../data/projects';
import { projectSites } from '../data/projectSites';

interface ProjectOption { id: number; code: string; name: string }
interface EmployeeOption { id: number; employeeCode: string; name: string; projectId: number }
interface SiteOption { id: number; projectId: number; name: string }

const auth = useAuthStore();
const router = useRouter();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
const accounts = ref<EngineerAccountSummary[]>(buildDemoEngineerAccounts());
const projectOptions = ref<ProjectOption[]>(projects.map((item) => ({ id: item.id, code: item.code, name: item.name })));
const employeeOptionsByProject = ref<EmployeeOption[]>(employeeProjectOptions.map((assignment) => {
  const employee = employeeOptions.find((item) => item.id === assignment.employeeId);
  return { id: assignment.employeeId, employeeCode: employee?.employeeCode ?? '', name: employee?.name ?? `Engineer #${assignment.employeeId}`, projectId: assignment.projectId };
}));
const siteOptions = ref<SiteOption[]>(projectSites.map((item) => ({ id: item.id, projectId: item.projectId, name: item.name })));
const loading = ref(false); const saving = ref(false); const error = ref(''); const formError = ref(''); const showForm = ref(false);
const search = ref(''); const balanceFilter = ref('all'); const page = ref(1); const pageSize = 12;
const today = new Date().toISOString().slice(0, 10);
const form = reactive<DepositInput>({ employeeId: 0, projectId: 0, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' });

const canManage = computed(() => auth.hasPermission('engineer_deposits.manage'));
const filteredEmployees = computed(() => employeeOptionsByProject.value.filter((item) => item.projectId === form.projectId));
const filteredSites = computed(() => siteOptions.value.filter((item) => item.projectId === form.projectId));
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return accounts.value.filter((item) => {
    const matchesSearch = !term || [item.employeeName, item.employeeCode, item.projectName, item.projectCode].some((value) => String(value ?? '').toLowerCase().includes(term));
    const matchesBalance = balanceFilter.value === 'all' || (balanceFilter.value === 'available' && item.balance >= 0) || (balanceFilter.value === 'overspent' && item.balance < 0);
    return matchesSearch && matchesBalance;
  });
});
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const totals = computed(() => accounts.value.reduce((result, item) => ({ deposited: result.deposited + Number(item.deposited), purchased: result.purchased + Number(item.purchased), balance: result.balance + Number(item.balance), transactions: result.transactions + Number(item.depositCount) }), { deposited: 0, purchased: 0, balance: 0, transactions: 0 }));

watch([search, balanceFilter], () => { page.value = 1; });
watch(() => form.projectId, () => { if (!filteredEmployees.value.some((item) => item.id === form.employeeId)) form.employeeId = 0; if (!filteredSites.value.some((item) => item.id === form.siteId)) form.siteId = null; });

onMounted(async () => {
  if (demoMode) return;
  loading.value = true;
  try {
    const [summary, options] = await Promise.all([
      api<{ accounts: EngineerAccountSummary[] }>('/engineer-deposits'),
      api<{ projects: ProjectOption[]; employees: EmployeeOption[]; sites: SiteOption[] }>('/engineer-deposits/options'),
    ]);
    accounts.value = summary.accounts; projectOptions.value = options.projects; employeeOptionsByProject.value = options.employees; siteOptions.value = options.sites;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load engineer balances.'; }
  finally { loading.value = false; }
});

function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'No activity'; }
function openForm() { Object.assign(form, { employeeId: 0, projectId: 0, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' }); formError.value = ''; showForm.value = true; }
async function saveDeposit() {
  formError.value = '';
  if (!form.projectId || !form.employeeId || !form.depositDate || Number(form.amount) <= 0) { formError.value = 'Select the project and engineer, then enter a positive deposit amount.'; return; }
  saving.value = true;
  try {
    if (demoMode) addDemoEngineerDeposit({ ...form, amount: Number(form.amount) });
    else await api('/engineer-deposits/deposits', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    showForm.value = false;
    if (demoMode) accounts.value = buildDemoEngineerAccounts();
    await router.push(`/finance/engineer-deposits/${form.employeeId}/${form.projectId}`);
  } catch (reason) { formError.value = reason instanceof Error ? reason.message : 'Could not save the deposit.'; }
  finally { saving.value = false; }
}
</script>

<template>
  <section class="sites-page engineer-deposits-page">
    <div class="expense-page-intro panel"><span><WalletCards :size="22" /></span><div><h2>Engineer deposit control</h2><p>Every deposit, material purchase, and site expense in one accountable balance.</p></div><strong>{{ money(totals.balance) }}</strong></div>
    <div class="deposit-stat-grid">
      <article class="panel"><span><ArrowDownToLine :size="18" /></span><small>Total deposited</small><strong>{{ money(totals.deposited) }}</strong><em>{{ totals.transactions.toLocaleString() }} deposit transactions</em></article>
      <article class="panel spent"><span><CircleDollarSign :size="18" /></span><small>Total purchased</small><strong>{{ money(totals.purchased) }}</strong><em>Materials and other expenses</em></article>
      <article class="panel" :class="{ warning: totals.balance < 0 }"><span><Landmark :size="18" /></span><small>Combined balance</small><strong>{{ money(totals.balance) }}</strong><em>{{ accounts.filter((item) => item.balance < 0).length }} ledgers need attention</em></article>
    </div>
    <div class="welcome-row projects-tools"><p>{{ filtered.length }} engineer/project ledgers · purchases are deducted line by line</p><button v-if="canManage" class="primary-button" @click="openForm"><Plus :size="18" /> Record deposit</button></div>
    <div class="site-toolbar panel"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search engineer, employee code, or project…" /></label><select v-model="balanceFilter"><option value="all">All balances</option><option value="available">Available balance</option><option value="overspent">Overspent</option></select></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel deposit-ledger-wrap"><div v-if="loading" class="table-loading">Loading engineer balances…</div><table v-else class="site-table deposit-ledger-table"><thead><tr><th>Site engineer</th><th>Project</th><th>Deposits</th><th>Material purchase</th><th>Other expense</th><th>Balance</th><th>Last activity</th><th><span class="sr-only">Open</span></th></tr></thead><tbody>
      <tr v-for="item in visible" :key="`${item.employeeId}-${item.projectId}`"><td><div class="deposit-engineer"><span>{{ item.employeeName.split(' ').map((part) => part[0]).join('').slice(0,2) }}</span><div><strong>{{ item.employeeName }}</strong><small>{{ item.employeeCode || `Employee #${item.employeeId}` }}</small></div></div></td><td><div class="site-project-cell"><strong>{{ item.projectCode }}</strong><small>{{ item.projectName }}</small></div></td><td><div class="deposit-money credit"><strong>{{ money(item.deposited) }}</strong><small>{{ item.depositCount }} receipts</small></div></td><td><div class="deposit-money"><strong>{{ money(item.materialTotal) }}</strong><small>Materials</small></div></td><td><div class="deposit-money"><strong>{{ money(item.expenseTotal) }}</strong><small>Site expenses</small></div></td><td><strong class="deposit-balance" :class="{ negative: item.balance < 0 }">{{ money(item.balance) }}</strong></td><td><small class="deposit-date">{{ date(item.lastActivityDate) }}</small></td><td><RouterLink :to="`/finance/engineer-deposits/${item.employeeId}/${item.projectId}`" class="secondary-button small">View ledger</RouterLink></td></tr>
      <tr v-if="!visible.length"><td colspan="8"><div class="site-empty"><WalletCards :size="24" /><strong>No engineer ledgers found</strong><span>Change the filters or record the first deposit.</span></div></td></tr>
    </tbody></table><footer v-if="!loading && filtered.length" class="table-pagination"><span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer></div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><form class="expense-line-modal deposit-entry-modal" @submit.prevent="saveDeposit"><header><span><ArrowDownToLine :size="18" /></span><div><h3>Record engineer deposit</h3><p>The amount becomes a credit in the selected engineer/project ledger.</p></div><button type="button" class="modal-close" @click="showForm = false"><X :size="18" /></button></header><div class="form-grid two">
      <label class="form-field"><span>Project <b>*</b></span><select v-model.number="form.projectId" required><option :value="0" disabled>Select project</option><option v-for="project in projectOptions" :key="project.id" :value="project.id">{{ project.code }} — {{ project.name }}</option></select></label>
      <label class="form-field"><span>Site engineer <b>*</b></span><select v-model.number="form.employeeId" required :disabled="!form.projectId"><option :value="0" disabled>Select assigned engineer</option><option v-for="employee in filteredEmployees" :key="`${employee.id}-${employee.projectId}`" :value="employee.id">{{ employee.employeeCode || `#${employee.id}` }} — {{ employee.name }}</option></select></label>
      <label class="form-field"><span>Deposit date <b>*</b></span><input v-model="form.depositDate" type="date" required /></label>
      <label class="form-field"><span>Amount (BDT) <b>*</b></span><input v-model.number="form.amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
      <label class="form-field"><span>Site (optional)</span><select v-model="form.siteId" :disabled="!form.projectId"><option :value="null">Project-wide</option><option v-for="site in filteredSites" :key="site.id" :value="site.id">{{ site.name }}</option></select></label>
      <label class="form-field"><span>Reference</span><input v-model="form.referenceNo" maxlength="120" placeholder="Cheque, voucher, or transfer no." /></label>
      <label class="form-field full"><span>Notes</span><textarea v-model="form.notes" maxlength="500" rows="3" placeholder="Optional transaction details"></textarea></label>
    </div><p v-if="formError" class="form-error">{{ formError }}</p><footer><button type="button" class="secondary-button" @click="showForm = false">Cancel</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : 'Save deposit' }}</button></footer></form></div>
  </section>
</template>
