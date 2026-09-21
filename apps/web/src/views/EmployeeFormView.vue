<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Check, Hash, Mail, MapPin, Phone, Save, Trash2, UserRoundCog, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeRecords, nextEmployeeId, type EmployeeRecord } from '../data/employees';
import { employeeAssignments } from '../data/assignments';

interface EmployeeForm {
  employeeCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  hireDate: string;
  salary: number | null | '';
  department: string;
  address: string;
  status: 'active' | 'inactive';
}

interface DeleteCheck {
  canDelete: boolean;
  references: { projects: number; sites: number };
}

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'employee-edit');
const employeeId = computed(() => Number(route.params.id));
const existing = computed(() => employeeRecords.find((employee) => employee.id === employeeId.value));
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const deleteCheck = ref<DeleteCheck | null>(null);

const form = reactive<EmployeeForm>({
  employeeCode: existing.value?.employeeCode ?? '',
  firstName: existing.value?.firstName ?? '',
  lastName: existing.value?.lastName ?? '',
  dateOfBirth: existing.value?.dateOfBirth ?? '',
  phone: existing.value?.phone ?? '',
  email: existing.value?.email ?? '',
  hireDate: existing.value?.hireDate ?? '',
  salary: existing.value?.salary ?? '',
  department: existing.value?.department ?? '',
  address: existing.value?.address ?? '',
  status: existing.value?.status ?? 'active',
});

function fillForm(employee: EmployeeRecord) {
  form.employeeCode = employee.employeeCode ?? '';
  form.firstName = employee.firstName ?? '';
  form.lastName = employee.lastName ?? '';
  form.dateOfBirth = employee.dateOfBirth ?? '';
  form.phone = employee.phone ?? '';
  form.email = employee.email ?? '';
  form.hireDate = employee.hireDate ?? '';
  form.salary = employee.salary ?? '';
  form.department = employee.department ?? '';
  form.address = employee.address ?? '';
  form.status = employee.status;
}

onMounted(async () => {
  if (!editing.value || import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const result = await api<{ employee: EmployeeRecord }>(`/employees/${employeeId.value}`);
    fillForm(result.employee);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load the employee.';
  } finally {
    loading.value = false;
  }
});

async function save() {
  error.value = '';
  saved.value = false;
  if (!form.firstName.trim()) { error.value = 'Enter the employee first name.'; return; }
  const parsedSalary = form.salary === '' || form.salary === null ? null : Number(form.salary);
  if (parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary < 0)) { error.value = 'Enter a valid salary.'; return; }
  saving.value = true;
  try {
    const payload = {
      employeeCode: form.employeeCode.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth, phone: form.phone.trim(), email: form.email.trim(), hireDate: form.hireDate,
      salary: parsedSalary, department: form.department.trim(), address: form.address.trim(), status: form.status,
    };
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(editing.value ? `/employees/${employeeId.value}` : '/employees', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const id = editing.value ? employeeId.value : nextEmployeeId();
      const current = employeeRecords.find((employee) => employee.id === id);
      const record: EmployeeRecord = {
        id,
        ...payload,
        employeeCode: payload.employeeCode || `EMP-${id}`,
        name: `${payload.firstName} ${payload.lastName}`.replace(/\s+/g, ' ').trim(),
        projectCount: current?.projectCount ?? 0,
        siteCount: current?.siteCount ?? 0,
      };
      const index = employeeRecords.findIndex((employee) => employee.id === id);
      if (index >= 0) employeeRecords[index] = record; else employeeRecords.unshift(record);
      const assignment = employeeAssignments.find((item) => item.id === id);
      if (assignment) Object.assign(assignment, { employeeCode: record.employeeCode, name: record.name, phone: record.phone, email: record.email, address: record.address, status: record.status });
      else employeeAssignments.push({ id, employeeCode: record.employeeCode, name: record.name, phone: record.phone, email: record.email, address: record.address, status: record.status, projects: [], sites: [] });
    }
    saved.value = true;
    setTimeout(() => router.push('/workforce/employees'), 550);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not save the employee.';
  } finally {
    saving.value = false;
  }
}

async function openDelete() {
  deleteOpen.value = true;
  deleteText.value = '';
  deleteCheck.value = null;
  deleteLoading.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      deleteCheck.value = await api<DeleteCheck>(`/employees/${employeeId.value}/delete-check`);
    } else {
      deleteCheck.value = { canDelete: (existing.value?.projectCount ?? 0) + (existing.value?.siteCount ?? 0) === 0, references: { projects: existing.value?.projectCount ?? 0, sites: existing.value?.siteCount ?? 0 } };
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not check employee references.';
    deleteOpen.value = false;
  } finally {
    deleteLoading.value = false;
  }
}

async function removeEmployee() {
  if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE') return;
  deleting.value = true;
  error.value = '';
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(`/employees/${employeeId.value}`, { method: 'DELETE' });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const index = employeeRecords.findIndex((employee) => employee.id === employeeId.value);
      if (index >= 0) employeeRecords.splice(index, 1);
      const assignmentIndex = employeeAssignments.findIndex((employee) => employee.id === employeeId.value);
      if (assignmentIndex >= 0) employeeAssignments.splice(assignmentIndex, 1);
    }
    await router.push('/workforce/employees');
  } catch (reason) {
    deleteOpen.value = false;
    error.value = reason instanceof Error ? reason.message : 'This employee could not be deleted because referenced data exists.';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="project-form-page employee-form-page">
    <div class="form-page-head">
      <RouterLink to="/workforce/employees" class="back-link"><ArrowLeft :size="16" /> All employees</RouterLink>
      <div><span class="form-heading-icon"><UserRoundCog :size="21" /></span><span><h2>{{ editing ? 'Modify employee' : 'Add employee' }}</h2><p>Every employee is available as a site engineer for project and site assignments.</p></span></div>
    </div>

    <form class="project-form panel" @submit.prevent="save">
      <div v-if="loading" class="site-form-loading">Loading employee information…</div>
      <div class="form-section-title"><span>01</span><div><h3>Employee information</h3><p>Name is required. Other details can be completed later.</p></div></div>
      <div class="form-grid">
        <label class="form-field"><span>Employee code</span><div><Hash :size="17" /><input v-model="form.employeeCode" placeholder="e.g. E-06" /></div></label>
        <label class="form-field"><span>Status</span><select v-model="form.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label class="form-field"><span>First name <b>*</b></span><div><UserRoundCog :size="17" /><input v-model="form.firstName" placeholder="First name" required /></div></label>
        <label class="form-field"><span>Last name</span><div><UserRoundCog :size="17" /><input v-model="form.lastName" placeholder="Last name" /></div></label>
        <label class="form-field"><span>Phone</span><div><Phone :size="17" /><input v-model="form.phone" type="tel" placeholder="01XXXXXXXXX" /></div></label>
        <label class="form-field"><span>Email</span><div><Mail :size="17" /><input v-model="form.email" type="email" placeholder="employee@example.com" /></div></label>
        <label class="form-field"><span>Date of birth</span><div><CalendarDays :size="17" /><input v-model="form.dateOfBirth" type="date" /></div></label>
        <label class="form-field"><span>Hire date</span><div><CalendarDays :size="17" /><input v-model="form.hireDate" type="date" /></div></label>
        <label class="form-field"><span>Monthly salary</span><div><WalletCards :size="17" /><input v-model.number="form.salary" type="number" min="0" step="0.01" placeholder="0.00" /></div></label>
        <label class="form-field"><span>Department / designation</span><div><Building2 :size="17" /><input v-model="form.department" placeholder="Site Engineer" /></div></label>
        <label class="form-field full"><span>Address</span><div><MapPin :size="17" /><input v-model="form.address" placeholder="Village, upazila, district" /></div></label>
      </div>

      <p v-if="error" class="form-error form-message">{{ error }}</p>
      <p v-if="saved" class="save-success"><Check :size="16" /> Employee saved. Returning to the list…</p>
      <footer class="form-actions">
        <button v-if="editing" type="button" class="delete-project-button" @click="openDelete"><Trash2 :size="16" /> Delete employee</button>
        <RouterLink v-if="editing" :to="`/projects/assignments/${employeeId}/edit`" class="secondary-button">Manage assignments</RouterLink>
        <RouterLink to="/workforce/employees" class="secondary-button">Cancel</RouterLink>
        <button class="primary-button" :disabled="saving"><Save :size="17" /> {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee' }}</button>
      </footer>
    </form>

    <div v-if="deleteOpen" class="modal-backdrop" @click.self="deleteOpen = false">
      <section class="delete-modal" role="dialog" aria-modal="true" aria-labelledby="employee-delete-title">
        <button class="modal-close" aria-label="Close" @click="deleteOpen = false"><X :size="18" /></button>
        <span class="delete-modal-icon"><AlertTriangle :size="24" /></span>
        <h2 id="employee-delete-title">Delete this employee?</h2>
        <p v-if="deleteLoading">Checking referenced projects and sites…</p>
        <template v-else-if="deleteCheck && !deleteCheck.canDelete">
          <div class="delete-blocked"><AlertTriangle :size="19" /><span><strong>Deletion prevented</strong><small>Remove the employee’s assignments before deleting the employee.</small></span></div>
          <div class="reference-list"><div><span>Project assignments</span><strong>{{ deleteCheck.references.projects }}</strong></div><div><span>Site assignments</span><strong>{{ deleteCheck.references.sites }}</strong></div></div>
          <RouterLink :to="`/projects/assignments/${employeeId}/edit`" class="primary-button modal-done" @click="deleteOpen = false">Manage assignments</RouterLink>
        </template>
        <template v-else-if="deleteCheck">
          <p>No referenced project or site assignments were found. Type DELETE to confirm.</p>
          <label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="deleteText" autocomplete="off" placeholder="DELETE" /></label>
          <div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="deleteText !== 'DELETE' || deleting" @click="removeEmployee"><Trash2 :size="16" /> {{ deleting ? 'Deleting…' : 'Delete employee' }}</button></div>
        </template>
      </section>
    </div>
  </section>
</template>
