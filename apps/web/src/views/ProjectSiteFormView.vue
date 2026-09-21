<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Check, MapPin, Save, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { nextProjectSiteId, projectSites, type ProjectSiteRecord } from '../data/projectSites';
import { projects } from '../data/projects';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'project-site-edit');
const siteId = computed(() => Number(route.params.id));
const existing = computed(() => projectSites.find((site) => site.id === siteId.value));
const saving = ref(false);
const loading = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteText = ref('');

const form = reactive({
  projectId: existing.value?.projectId ?? Number(route.query.projectId || projects[0]?.id || 0),
  name: existing.value?.name ?? '',
  address: existing.value?.address ?? '',
  status: existing.value?.status ?? 'active',
});

onMounted(async () => {
  if (!editing.value || import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const result = await api<{ site: ProjectSiteRecord }>(`/project-sites/${siteId.value}`);
    form.projectId = result.site.projectId;
    form.name = result.site.name;
    form.address = result.site.address ?? '';
    form.status = result.site.status;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load the project site.';
  } finally {
    loading.value = false;
  }
});

async function save() {
  error.value = '';
  saved.value = false;
  if (!form.projectId || !form.name.trim()) {
    error.value = 'Select a project and enter the site name.';
    return;
  }
  saving.value = true;
  try {
    const payload = { projectId: Number(form.projectId), name: form.name.trim(), address: form.address.trim(), status: form.status };
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(editing.value ? `/project-sites/${siteId.value}` : '/project-sites', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const project = projects.find((item) => item.id === payload.projectId)!;
      const record: ProjectSiteRecord = { id: editing.value ? siteId.value : nextProjectSiteId(), projectId: payload.projectId, projectName: project.name, projectCode: project.code, name: payload.name, address: payload.address, status: payload.status };
      const index = projectSites.findIndex((site) => site.id === record.id);
      if (index >= 0) projectSites[index] = record; else projectSites.unshift(record);
    }
    saved.value = true;
    setTimeout(() => router.push('/projects/sites'), 550);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not save the project site.';
  } finally {
    saving.value = false;
  }
}

async function removeSite() {
  if (deleteText.value !== 'DELETE') return;
  deleting.value = true;
  error.value = '';
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(`/project-sites/${siteId.value}`, { method: 'DELETE' });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const index = projectSites.findIndex((site) => site.id === siteId.value);
      if (index >= 0) projectSites.splice(index, 1);
    }
    await router.push('/projects/sites');
  } catch (reason) {
    deleteOpen.value = false;
    error.value = reason instanceof Error ? reason.message : 'This site could not be deleted because referenced data may exist.';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="project-form-page site-form-page">
    <div class="form-page-head">
      <RouterLink to="/projects/sites" class="back-link"><ArrowLeft :size="16" /> All project sites</RouterLink>
      <div><span class="form-heading-icon"><MapPin :size="21" /></span><span><h2>{{ editing ? 'Modify project site' : 'Add project site' }}</h2><p>{{ editing ? 'Update the site information below.' : 'Choose the project and enter the site details.' }}</p></span></div>
    </div>

    <form class="project-form site-entry-form panel" @submit.prevent="save">
      <div v-if="loading" class="site-form-loading">Loading site information…</div>
      <div class="site-form-intro"><span>Required information</span><p>Only the project and site name are required.</p></div>
      <div class="form-grid">
        <label class="form-field full"><span>Project <b>*</b></span><ProjectSearchSelect v-model="form.projectId" :projects="projects" /></label>
        <label class="form-field full"><span>Site name <b>*</b></span><div><MapPin :size="17" /><input v-model="form.name" placeholder="e.g. Government Primary School, Bochaganj" required /></div></label>
        <label class="form-field full"><span>Site address</span><div><MapPin :size="17" /><input v-model="form.address" placeholder="Village, upazila, district" /></div></label>
        <label class="form-field"><span>Status</span><select v-model="form.status"><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></label>
      </div>

      <p v-if="error" class="form-error form-message">{{ error }}</p>
      <p v-if="saved" class="save-success"><Check :size="16" /> Site saved. Returning to the list…</p>
      <footer class="form-actions">
        <button v-if="editing" type="button" class="delete-project-button" @click="deleteText = ''; deleteOpen = true"><Trash2 :size="16" /> Delete site</button>
        <RouterLink to="/projects/sites" class="secondary-button">Cancel</RouterLink>
        <button class="primary-button" :disabled="saving"><Save :size="17" /> {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add site' }}</button>
      </footer>
    </form>

    <div v-if="deleteOpen" class="modal-backdrop" @click.self="deleteOpen = false">
      <section class="delete-modal" role="dialog" aria-modal="true" aria-labelledby="site-delete-title">
        <button class="modal-close" aria-label="Close" @click="deleteOpen = false"><X :size="18" /></button>
        <span class="delete-modal-icon"><AlertTriangle :size="24" /></span>
        <h2 id="site-delete-title">Delete this project site?</h2>
        <p>The server will prevent deletion if transactions, employees, purchases, or other referenced records exist.</p>
        <label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="deleteText" autocomplete="off" placeholder="DELETE" /></label>
        <div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="deleteText !== 'DELETE' || deleting" @click="removeSite"><Trash2 :size="16" /> {{ deleting ? 'Deleting…' : 'Delete site' }}</button></div>
      </section>
    </div>
  </section>
</template>
