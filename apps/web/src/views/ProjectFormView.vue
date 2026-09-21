<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Check, CircleDollarSign, FileText, Hash, MapPin, Save, ShieldAlert, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { projects } from '../data/projects';

const route = useRoute();
const router = useRouter();
const projectId = computed(() => Number(route.params.id));
const editing = computed(() => route.name === 'project-edit');
const existing = computed(() => projects.find((project) => project.id === projectId.value));
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleteError = ref('');
const confirmDelete = ref('');
const deleteCheck = ref<{ canDelete: boolean; references: { sites: number; userAssignments: number } } | null>(null);

const form = reactive({
  name: existing.value?.name ?? '',
  code: existing.value?.code ?? '',
  tenderId: existing.value?.tenderId ?? '',
  address: existing.value?.address ?? '',
  contractValue: existing.value?.value ? String(existing.value.value) : '',
  startDate: existing.value?.startDate ?? '',
  endDate: existing.value?.endDate ?? '',
  status: existing.value?.status ?? 'active',
});

async function save() {
  error.value = '';
  saved.value = false;
  if (!form.name.trim()) {
    error.value = 'Project name is required.';
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form, contractValue: form.contractValue ? Number(form.contractValue) : null };
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(editing.value ? `/projects/${projectId.value}` : '/projects', {
        method: editing.value ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    saved.value = true;
    setTimeout(() => router.push('/projects'), 650);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not save the project.';
  } finally {
    saving.value = false;
  }
}

async function openDelete() {
  deleteError.value = '';
  confirmDelete.value = '';
  deleteCheck.value = null;
  deleteLoading.value = true;
  deleteOpen.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      deleteCheck.value = await api(`/projects/${projectId.value}/delete-check`);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 350));
      deleteCheck.value = { canDelete: (existing.value?.sites ?? 0) === 0, references: { sites: existing.value?.sites ?? 0, userAssignments: 0 } };
    }
  } catch (reason) {
    deleteError.value = reason instanceof Error ? reason.message : 'Could not check project references.';
  } finally {
    deleteLoading.value = false;
  }
}

async function removeProject() {
  if (!deleteCheck.value?.canDelete || confirmDelete.value !== 'DELETE') return;
  deleteLoading.value = true;
  deleteError.value = '';
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(`/projects/${projectId.value}`, { method: 'DELETE' });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await router.push('/projects');
  } catch (reason) {
    deleteError.value = reason instanceof Error ? reason.message : 'The project could not be deleted.';
    deleteCheck.value = { canDelete: false, references: deleteCheck.value.references };
  } finally {
    deleteLoading.value = false;
  }
}
</script>

<template>
  <section class="project-form-page">
    <div class="form-page-head">
      <RouterLink to="/projects" class="back-link"><ArrowLeft :size="16" /> All projects</RouterLink>
      <div><span class="form-heading-icon"><Building2 :size="21" /></span><span><h2>{{ editing ? 'Modify project' : 'Create a new project' }}</h2><p>{{ editing ? 'Update the project information below.' : 'Enter the core project details. Sites can be added after saving.' }}</p></span></div>
    </div>

    <form class="project-form panel" @submit.prevent="save">
      <div class="form-section-title"><span>01</span><div><h3>Project information</h3><p>Name and official tender references</p></div></div>
      <div class="form-grid">
        <label class="form-field full"><span>Project name <b>*</b></span><div><FileText :size="17" /><input v-model="form.name" placeholder="Enter the full project name" required /></div></label>
        <label class="form-field"><span>Package / work order no.</span><div><Hash :size="17" /><input v-model="form.code" placeholder="e.g. PEDP4/WB-1803" /></div></label>
        <label class="form-field"><span>Tender ID</span><div><Hash :size="17" /><input v-model="form.tenderId" placeholder="e.g. 794739" /></div></label>
        <label class="form-field full"><span>Project address</span><div><MapPin :size="17" /><input v-model="form.address" placeholder="District, upazila, or project area" /></div></label>
      </div>

      <div class="form-divider"></div>
      <div class="form-section-title"><span>02</span><div><h3>Contract and schedule</h3><p>Financial value, timeline, and current state</p></div></div>
      <div class="form-grid three">
        <label class="form-field"><span>Contract value (BDT)</span><div><CircleDollarSign :size="17" /><input v-model="form.contractValue" type="number" min="0" step="0.01" placeholder="0.00" /></div></label>
        <label class="form-field"><span>Start date</span><div><CalendarDays :size="17" /><input v-model="form.startDate" type="date" /></div></label>
        <label class="form-field"><span>Expected end date</span><div><CalendarDays :size="17" /><input v-model="form.endDate" type="date" /></div></label>
        <label class="form-field"><span>Project status</span><select v-model="form.status"><option value="planned">Planned</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></label>
      </div>

      <p v-if="error" class="form-error form-message">{{ error }}</p>
      <p v-if="saved" class="save-success"><Check :size="16" /> Project saved. Returning to all projects…</p>
      <footer class="form-actions">
        <button v-if="editing" type="button" class="delete-project-button" @click="openDelete"><Trash2 :size="16" /> Delete project</button>
        <RouterLink to="/projects" class="secondary-button">Cancel</RouterLink>
        <button class="primary-button" :disabled="saving"><Save :size="17" /> {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create project' }}</button>
      </footer>
    </form>

    <div v-if="deleteOpen" class="modal-backdrop" role="presentation" @click.self="deleteOpen = false">
      <section class="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <button class="modal-close" aria-label="Close" @click="deleteOpen = false"><X :size="18" /></button>
        <span class="delete-modal-icon"><ShieldAlert :size="24" /></span>
        <h2 id="delete-title">Delete this project?</h2>
        <p v-if="deleteLoading && !deleteCheck">Checking project references before deletion…</p>
        <template v-else-if="deleteCheck && !deleteCheck.canDelete">
          <div class="delete-blocked"><AlertTriangle :size="18" /><span><strong>Deletion prevented</strong><small>This project has referenced data and must be kept.</small></span></div>
          <div class="reference-list">
            <div><span>Project sites</span><strong>{{ deleteCheck.references.sites }}</strong></div>
            <div><span>User assignments</span><strong>{{ deleteCheck.references.userAssignments }}</strong></div>
          </div>
          <p>Remove or transfer every related record first. No data has been changed.</p>
          <button class="secondary-button modal-done" @click="deleteOpen = false">Close</button>
        </template>
        <template v-else-if="deleteCheck?.canDelete">
          <p>This project has no referenced sites or assignments. Deletion is permanent and will be written to the audit log.</p>
          <label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="confirmDelete" autocomplete="off" placeholder="DELETE" /></label>
          <div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="confirmDelete !== 'DELETE' || deleteLoading" @click="removeProject"><Trash2 :size="16" /> {{ deleteLoading ? 'Deleting…' : 'Delete permanently' }}</button></div>
        </template>
        <p v-if="deleteError" class="form-error modal-error">{{ deleteError }}</p>
      </section>
    </div>
  </section>
</template>
