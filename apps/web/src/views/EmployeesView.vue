<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Mail, MapPinned, Pencil, Phone, Plus, Search, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeRecords, type EmployeeRecord } from '../data/employees';

const employees = ref<EmployeeRecord[]>(employeeRecords.map((employee) => ({ ...employee })));
const search = ref('');
const statusFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 15;

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const result = await api<{ employees: EmployeeRecord[] }>('/employees');
    employees.value = result.employees;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load employees.';
  } finally {
    loading.value = false;
  }
});

const filteredEmployees = computed(() => {
  const term = search.value.trim().toLowerCase();
  return employees.value.filter((employee) => {
    const matchesSearch = !term || [employee.name, employee.employeeCode, employee.phone, employee.email, employee.address, employee.department]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
    const matchesStatus = statusFilter.value === 'all' || employee.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const activeCount = computed(() => employees.value.filter((employee) => employee.status === 'active').length);
const pageCount = computed(() => Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize)));
const visibleEmployees = computed(() => filteredEmployees.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const rangeStart = computed(() => filteredEmployees.value.length ? (page.value - 1) * pageSize + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * pageSize, filteredEmployees.value.length));
watch([search, statusFilter], () => { page.value = 1; });

function initials(name: string) {
  return name.split(/\s+/).filter((part) => !/^eng\.?$/i.test(part)).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function salary(value: number | null) {
  if (value === null || value === undefined) return 'Not set';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value));
}
</script>

<template>
  <section class="sites-page employees-page">
    <div class="welcome-row projects-tools">
      <p>{{ employees.length }} employees · {{ activeCount }} active · all employees work as site engineers</p>
      <RouterLink to="/workforce/employees/new" class="primary-button"><Plus :size="18" /> New employee</RouterLink>
    </div>

    <div class="site-toolbar panel">
      <label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search employee, code, phone or address…" /></label>
      <select v-model="statusFilter" aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
    </div>

    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel employee-table-wrap">
      <div v-if="loading" class="table-loading">Loading employees…</div>
      <table v-else class="site-table employee-table">
        <thead><tr><th>Employee</th><th>Contact</th><th>Employment</th><th>Assignments</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="employee in visibleEmployees" :key="employee.id">
            <td><div class="employee-name-cell"><span>{{ initials(employee.name) }}</span><div><strong>{{ employee.name }}</strong><small>{{ employee.employeeCode || 'No employee code' }}</small></div></div></td>
            <td><div class="employee-contact"><span><Phone :size="13" />{{ employee.phone || 'No phone' }}</span><span><Mail :size="13" />{{ employee.email || 'No email' }}</span></div></td>
            <td><div class="employee-employment"><strong>{{ employee.department || 'Site Engineer' }}</strong><small>{{ salary(employee.salary) }}</small></div></td>
            <td><RouterLink :to="`/projects/assignments/${employee.id}/edit`" class="employee-assignment-link"><span><BriefcaseBusiness :size="14" /><b>{{ employee.projectCount }}</b> projects</span><span><MapPinned :size="14" /><b>{{ employee.siteCount }}</b> sites</span></RouterLink></td>
            <td><span class="status-chip" :class="employee.status">{{ employee.status }}</span></td>
            <td><RouterLink :to="`/workforce/employees/${employee.id}/edit`" class="card-edit" title="Modify employee"><Pencil :size="15" /></RouterLink></td>
          </tr>
          <tr v-if="visibleEmployees.length === 0"><td colspan="6"><div class="site-empty"><UserRoundCog :size="24" /><strong>No employees found</strong><span>Try changing the search or status filter.</span></div></td></tr>
        </tbody>
      </table>
      <footer v-if="!loading && filteredEmployees.length" class="table-pagination">
        <span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredEmployees.length }}</span>
        <div><button :disabled="page === 1" aria-label="Previous page" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" aria-label="Next page" @click="page++"><ChevronRight :size="16" /></button></div>
      </footer>
    </div>
  </section>
</template>
