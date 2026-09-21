<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, ReceiptText, RotateCcw, Search } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import { api } from '../services/api';
import { expenseRecords, type ExpensePhase } from '../data/expenses';
import { projects } from '../data/projects';

interface ExpenseSummary {
  id: number; paymentNo: string; paymentDate: string; payTo: string; referenceNo: string; notes: string;
  status: 'draft' | 'posted' | 'cancelled'; projectId: number; projectCode: string; projectName: string;
  lineCount: number; grossAmount: number; returnedAmount: number; totalAmount: number;
}

const route = useRoute();
const phase = computed<ExpensePhase>(() => route.name === 'pre-award-expenses' ? 'pre_award' : 'execution');
const title = computed(() => phase.value === 'pre_award' ? 'Pre-award expenses' : 'Project costs');
const description = computed(() => phase.value === 'pre_award' ? 'Tender, security, estimate, and contract costs before project execution.' : 'Costs incurred after the project has started.');
const items = ref<ExpenseSummary[]>([]);
const search = ref('');
const projectFilter = ref('all');
const statusFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 15;

function demoItems(): ExpenseSummary[] {
  return expenseRecords.flatMap((item) => {
    const lines = item.lines.filter((line) => line.phase === phase.value && line.expenseTypeId);
    if (!lines.length) return [];
    return [{
      id: item.id, paymentNo: item.paymentNo, paymentDate: item.paymentDate, payTo: item.payTo,
      referenceNo: item.referenceNo, notes: item.notes, status: item.status, projectId: item.projectId,
      projectCode: item.projectCode, projectName: item.projectName, lineCount: lines.length,
      grossAmount: lines.reduce((sum, line) => sum + line.amount, 0),
      returnedAmount: lines.reduce((sum, line) => sum + line.returnedAmount, 0),
      totalAmount: lines.reduce((sum, line) => sum + line.totalAmount, 0),
    }];
  });
}

async function load() {
  page.value = 1;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') { items.value = demoItems(); return; }
  loading.value = true;
  error.value = '';
  try {
    const result = await api<{ expenses: ExpenseSummary[] }>(`/expenses?phase=${phase.value}`);
    items.value = result.expenses;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load expenses.';
  } finally {
    loading.value = false;
  }
}
watch(() => route.name, load, { immediate: true });

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return items.value.filter((item) => {
    const matchesSearch = !term || [item.paymentNo, item.payTo, item.referenceNo, item.projectCode, item.projectName, item.notes].some((value) => String(value ?? '').toLowerCase().includes(term));
    const matchesProject = projectFilter.value === 'all' || item.projectId === Number(projectFilter.value);
    const matchesStatus = statusFilter.value === 'all' || item.status === statusFilter.value;
    return matchesSearch && matchesProject && matchesStatus;
  });
});
const total = computed(() => filtered.value.reduce((sum, item) => sum + Number(item.totalAmount), 0));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const rangeStart = computed(() => filtered.value.length ? (page.value - 1) * pageSize + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * pageSize, filtered.value.length));
watch([search, projectFilter, statusFilter], () => { page.value = 1; });

function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value: string) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'; }
</script>

<template>
  <section class="sites-page expenses-page">
    <div class="expense-page-intro panel"><span><ReceiptText :size="22" /></span><div><h2>{{ title }}</h2><p>{{ description }}</p></div><strong>{{ money(total) }}</strong></div>
    <div class="welcome-row projects-tools"><p>{{ filtered.length }} vouchers · {{ filtered.reduce((sum, item) => sum + Number(item.lineCount), 0) }} expense lines</p><RouterLink :to="phase === 'pre_award' ? '/expenses/pre-award/new' : '/expenses/project/new'" class="primary-button"><Plus :size="18" /> New expense</RouterLink></div>
    <div class="site-toolbar panel">
      <label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search voucher, project, payee or reference…" /></label>
      <select v-model="projectFilter"><option value="all">All projects</option><option v-for="project in projects" :key="project.id" :value="String(project.id)">{{ project.code }}</option></select>
      <select v-model="statusFilter"><option value="all">All statuses</option><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select>
    </div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel expense-table-wrap">
      <div v-if="loading" class="table-loading">Loading expenses…</div>
      <table v-else class="site-table expense-table">
        <thead><tr><th>Voucher</th><th>Project</th><th>Payee / reference</th><th>Lines</th><th>Returned</th><th>Net amount</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td><div class="expense-voucher"><span><CalendarDays :size="14" />{{ date(item.paymentDate) }}</span><strong>{{ item.paymentNo || `EXP-${item.id}` }}</strong></div></td>
            <td><div class="site-project-cell"><strong>{{ item.projectCode }}</strong><small>{{ item.projectName }}</small></div></td>
            <td><div class="expense-payee"><strong>{{ item.payTo || 'Not specified' }}</strong><small>{{ item.referenceNo || 'No reference' }}</small></div></td>
            <td><span class="expense-line-count">{{ item.lineCount }}</span></td>
            <td><span class="expense-returned"><RotateCcw :size="13" />{{ money(item.returnedAmount) }}</span></td>
            <td><strong class="expense-amount">{{ money(item.totalAmount) }}</strong></td>
            <td><span class="status-chip" :class="item.status">{{ item.status }}</span></td>
            <td><RouterLink :to="`/expenses/${item.id}/edit?phase=${phase}`" class="card-edit" title="Modify expense"><Pencil :size="15" /></RouterLink></td>
          </tr>
          <tr v-if="!visible.length"><td colspan="8"><div class="site-empty"><Search :size="24" /><strong>No {{ title.toLowerCase() }} found</strong><span>Try changing the search or filters.</span></div></td></tr>
        </tbody>
      </table>
      <footer v-if="!loading && filtered.length" class="table-pagination"><span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filtered.length }}</span><div><button :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++"><ChevronRight :size="16" /></button></div></footer>
    </div>
  </section>
</template>
