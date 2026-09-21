<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, PackageSearch, Pencil, Plus, ReceiptText, Search, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { sitePurchaseRecords, type SitePurchaseRecord } from '../data/sitePurchases';
import { projects } from '../data/projects';

const purchases = ref<SitePurchaseRecord[]>(sitePurchaseRecords.map((item) => ({ ...item })));
const search = ref('');
const projectFilter = ref('all');
const typeFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 15;

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try { purchases.value = (await api<{ purchases: SitePurchaseRecord[] }>('/site-purchases')).purchases; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load site-engineer purchases.'; }
  finally { loading.value = false; }
});

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return purchases.value.filter((item) => {
    const matchesSearch = !term || [item.purchaseNo, item.projectCode, item.projectName, item.employeeName, item.employeeCode, item.supplierName, item.challanNo].some((value) => String(value ?? '').toLowerCase().includes(term));
    return matchesSearch && (projectFilter.value === 'all' || item.projectId === Number(projectFilter.value)) && (typeFilter.value === 'all' || item.purchaseType === typeFilter.value);
  });
});
const total = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.materialTotal) + Number(item.expenseTotal), 0));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, projectFilter, typeFilter], () => { page.value = 1; });
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value: string) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'; }
</script>

<template>
  <section class="sites-page site-purchases-page">
    <div class="expense-page-intro panel"><span><PackageSearch :size="22" /></span><div><h2>Site engineer purchases</h2><p>Material purchases and other site expenses entered by assigned employees.</p></div><strong>{{ money(total) }}</strong></div>
    <div class="welcome-row projects-tools"><p>{{ filtered.length }} purchase ledgers · {{ filtered.reduce((sum, item) => sum + Number(item.materialCount) + Number(item.expenseCount), 0) }} entries</p><RouterLink to="/purchases/site-engineer/new" class="primary-button"><Plus :size="18" /> New purchase ledger</RouterLink></div>
    <div class="site-toolbar panel"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search employee, project, supplier or purchase no…" /></label><select v-model="projectFilter"><option value="all">All projects</option><option v-for="project in projects" :key="project.id" :value="String(project.id)">{{ project.code }}</option></select><select v-model="typeFilter"><option value="all">All purchase types</option><option value="local">Local</option><option value="corporate">Corporate</option></select></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel purchase-table-wrap"><div v-if="loading" class="table-loading">Loading site purchases…</div><table v-else class="site-table purchase-table"><thead><tr><th>Purchase ledger</th><th>Project</th><th>Site engineer</th><th>Supplier</th><th>Material purchases</th><th>Other expenses</th><th>Total</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
      <tr v-for="item in visible" :key="item.id"><td><div class="expense-voucher"><span>{{ date(item.purchaseDate) }} · {{ item.purchaseType }}</span><strong>{{ item.purchaseNo || `PUR-${item.id}` }}</strong></div></td><td><div class="site-project-cell"><strong>{{ item.projectCode }}</strong><small>{{ item.projectName }}</small></div></td><td><div class="purchase-person"><UserRoundCog :size="15" /><span><strong>{{ item.employeeName }}</strong><small>{{ item.employeeCode }}</small></span></div></td><td><span class="purchase-supplier">{{ item.supplierName }}</span></td><td><div class="purchase-total-cell"><PackageSearch :size="14" /><span><strong>{{ money(item.materialTotal) }}</strong><small>{{ item.materialCount }} entries</small></span></div></td><td><div class="purchase-total-cell"><ReceiptText :size="14" /><span><strong>{{ money(item.expenseTotal) }}</strong><small>{{ item.expenseCount }} entries</small></span></div></td><td><strong class="expense-amount">{{ money(Number(item.materialTotal) + Number(item.expenseTotal)) }}</strong></td><td><RouterLink :to="`/purchases/site-engineer/${item.id}/edit`" class="card-edit"><Pencil :size="15" /></RouterLink></td></tr>
      <tr v-if="!visible.length"><td colspan="8"><div class="site-empty"><PackageSearch :size="24" /><strong>No site purchases found</strong><span>Try changing the search or filters.</span></div></td></tr>
    </tbody></table><footer v-if="!loading && filtered.length" class="table-pagination"><span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer></div>
  </section>
</template>
