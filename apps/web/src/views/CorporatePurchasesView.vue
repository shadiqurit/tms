<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Building2, ChevronLeft, ChevronRight, MapPin, PackageCheck, Pencil, Plus, Search, Truck } from 'lucide-vue-next';
import { api } from '../services/api';
import { corporatePurchaseRecords, type CorporatePurchaseRecord } from '../data/corporatePurchases';

const purchases = ref<CorporatePurchaseRecord[]>(corporatePurchaseRecords.map((item) => ({ ...item })));
const search = ref('');
const projectFilter = ref('all');
const statusFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 15;

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try { purchases.value = (await api<{ purchases: CorporatePurchaseRecord[] }>('/corporate-purchases')).purchases; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load corporate purchases.'; }
  finally { loading.value = false; }
});

const projectOptions = computed(() => Array.from(new Map(purchases.value.map((item) => [item.projectId, { id: item.projectId, code: item.projectCode, name: item.projectName }])).values()));
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return purchases.value.filter((item) => {
    const matchesSearch = !term || [item.purchaseNo, item.projectCode, item.projectName, item.siteName, item.supplierName, item.challanNo].some((value) => String(value ?? '').toLowerCase().includes(term));
    return matchesSearch && (projectFilter.value === 'all' || item.projectId === Number(projectFilter.value)) && (statusFilter.value === 'all' || item.status === statusFilter.value);
  });
});
const total = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.totalAmount), 0));
const itemTotal = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.itemCount), 0));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, projectFilter, statusFilter], () => { page.value = 1; });
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value: string) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not recorded'; }
</script>

<template>
  <section class="sites-page corporate-purchases-page">
    <div class="expense-page-intro panel"><span><Building2 :size="22" /></span><div><h2>Corporate purchases</h2><p>Head-office purchases organised by project, supplier, site, and product.</p></div><strong>{{ money(total) }}</strong></div>
    <div class="welcome-row projects-tools"><p>{{ filtered.length }} purchases · {{ itemTotal }} product lines</p><RouterLink to="/purchases/corporate/new" class="primary-button"><Plus :size="18" /> New corporate purchase</RouterLink></div>
    <div class="site-toolbar panel"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search purchase, project, site or supplier…" /></label><select v-model="projectFilter"><option value="all">All projects</option><option v-for="project in projectOptions" :key="project.id" :value="String(project.id)">{{ project.code }} — {{ project.name }}</option></select><select v-model="statusFilter"><option value="all">All statuses</option><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel corporate-table-wrap"><div v-if="loading" class="table-loading">Loading corporate purchases…</div><table v-else class="site-table corporate-purchase-table"><thead><tr><th>Purchase</th><th>Project</th><th>Delivery site</th><th>Supplier</th><th>Products</th><th>Total</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
      <tr v-for="item in visible" :key="item.id"><td><div class="expense-voucher"><span>{{ date(item.purchaseDate) }}</span><strong>{{ item.purchaseNo || `COR-${item.id}` }}</strong><small v-if="item.challanNo">Challan {{ item.challanNo }}</small></div></td><td><div class="site-project-cell"><strong>{{ item.projectCode }}</strong><small>{{ item.projectName }}</small></div></td><td><span class="corporate-site"><MapPin :size="14" />{{ item.siteName || 'General project delivery' }}</span></td><td><span class="purchase-person"><Truck :size="15" /><strong>{{ item.supplierName }}</strong></span></td><td><span class="corporate-line-count"><PackageCheck :size="15" /><strong>{{ item.itemCount }}</strong><small>{{ Number(item.totalQuantity).toLocaleString() }} units</small></span></td><td><strong class="expense-amount">{{ money(item.totalAmount) }}</strong></td><td><span class="status-pill" :class="item.status">{{ item.status }}</span></td><td><RouterLink :to="`/purchases/corporate/${item.id}/edit`" class="card-edit" aria-label="Modify corporate purchase"><Pencil :size="15" /></RouterLink></td></tr>
      <tr v-if="!visible.length"><td colspan="8"><div class="site-empty"><Building2 :size="24" /><strong>No corporate purchases found</strong><span>Try changing the search or filters.</span></div></td></tr>
    </tbody></table><footer v-if="!loading && filtered.length" class="table-pagination"><span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer></div>
  </section>
</template>
