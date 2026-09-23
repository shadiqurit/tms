<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ArrowLeftRight, ChevronLeft, ChevronRight, MapPin, PackageCheck, Pencil, Plus, Search } from 'lucide-vue-next';
import { api } from '../services/api';
import { corporateTransferLines, corporateTransferRecords, type CorporateTransferRecord } from '../data/corporateTransfers';

const transfers = ref<CorporateTransferRecord[]>(corporateTransferRecords.map((item) => ({ ...item })));
const search = ref(''); const statusFilter = ref('all'); const loading = ref(false); const error = ref(''); const page = ref(1); const pageSize = 15;
onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try { transfers.value = (await api<{ transfers: CorporateTransferRecord[] }>('/corporate-transfers')).transfers; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load corporate transfers.'; }
  finally { loading.value = false; }
});
const filtered = computed(() => { const term = search.value.trim().toLowerCase(); return transfers.value.filter((item) => (!term || [item.transferNo, item.fromProjectName, item.fromProjectCode, item.fromSiteName, item.receiveProjectName, item.receiveProjectCode, item.receiveSiteName].some((value) => String(value ?? '').toLowerCase().includes(term))) && (statusFilter.value === 'all' || item.status === statusFilter.value)); });
const total = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.totalAmount), 0));
const lineCount = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.itemCount), 0));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, statusFilter], () => { page.value = 1; });
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value: string) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not recorded'; }
function previewNames(item: CorporateTransferRecord) {
  return import.meta.env.VITE_DEMO_MODE === 'false'
    ? item.productNames ?? []
    : [...new Set(corporateTransferLines.filter((line) => line.transferId === item.id).map((line) => line.productName))].slice(0, 2);
}
</script>

<template>
  <section class="sites-page corporate-transfers-page">
    <div class="expense-page-intro panel"><span><ArrowLeftRight :size="22" /></span><div><h2>Corporate transfers</h2><p>Move corporate products between projects, sites, or both.</p></div><strong>{{ money(total) }}</strong></div>
    <div class="welcome-row projects-tools"><p>{{ filtered.length }} transfers · {{ lineCount }} product lines</p><RouterLink to="/purchases/transfers/new" class="primary-button"><Plus :size="18" /> New transfer</RouterLink></div>
    <div class="site-toolbar panel"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search transfer, source, destination, or site…" /></label><select v-model="statusFilter"><option value="all">All statuses</option><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel corporate-table-wrap"><div v-if="loading" class="table-loading">Loading corporate transfers…</div><table v-else class="site-table corporate-transfer-table"><thead><tr><th>Transfer</th><th>From project / site</th><th>To project / site</th><th>Products</th><th>Total</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
      <tr v-for="item in visible" :key="item.id"><td><div class="expense-voucher"><span>{{ date(item.transferDate) }}</span><strong>{{ item.transferNo || `TRN-${item.id}` }}</strong></div></td><td><div class="site-project-cell"><strong>{{ item.fromProjectCode || `#${item.fromProjectId}` }}</strong><small>{{ item.fromProjectName }}</small><span class="corporate-site"><MapPin :size="13" />{{ item.fromSiteName || 'All / source project' }}</span></div></td><td><div class="site-project-cell"><strong>{{ item.receiveProjectCode || `#${item.receiveProjectId}` }}</strong><small>{{ item.receiveProjectName }}</small><span class="corporate-site"><MapPin :size="13" />{{ item.receiveSiteName || 'Defined per product line' }}</span></div></td><td><div class="corporate-transfer-products"><span class="corporate-line-count"><PackageCheck :size="15" /><strong>{{ item.itemCount }}</strong><small>{{ Number(item.totalQuantity).toLocaleString() }} units</small></span><div v-if="previewNames(item).length" class="corporate-product-preview"><small v-for="(name, index) in previewNames(item)" :key="index" :title="name">{{ name }}</small></div></div></td><td><strong class="expense-amount">{{ money(item.totalAmount) }}</strong></td><td><span class="status-pill" :class="item.status">{{ item.status }}</span></td><td><RouterLink :to="`/purchases/transfers/${item.id}/edit`" class="card-edit" aria-label="Modify corporate transfer"><Pencil :size="15" /></RouterLink></td></tr>
      <tr v-if="!visible.length"><td colspan="7"><div class="site-empty"><ArrowLeftRight :size="24" /><strong>No corporate transfers found</strong><span>Try changing the search or add a new transfer.</span></div></td></tr>
    </tbody></table><footer v-if="!loading && filtered.length" class="table-pagination"><span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer></div>
  </section>
</template>
