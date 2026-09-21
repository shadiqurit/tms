<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Search } from 'lucide-vue-next';
import { api } from '../services/api';
import { projectSites, type ProjectSiteRecord } from '../data/projectSites';
import { projects } from '../data/projects';

const sites = ref<ProjectSiteRecord[]>([...projectSites]);
const search = ref('');
const projectFilter = ref('all');
const statusFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 20;

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const result = await api<{ sites: ProjectSiteRecord[] }>('/project-sites');
    sites.value = result.sites;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load project sites.';
  } finally {
    loading.value = false;
  }
});

const filteredSites = computed(() => {
  const term = search.value.trim().toLowerCase();
  return sites.value.filter((site) => {
    const matchesSearch = !term || [site.name, site.address, site.projectName, site.projectCode].some((value) => value.toLowerCase().includes(term));
    const matchesProject = projectFilter.value === 'all' || site.projectId === Number(projectFilter.value);
    const matchesStatus = statusFilter.value === 'all' || site.status === statusFilter.value;
    return matchesSearch && matchesProject && matchesStatus;
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredSites.value.length / pageSize)));
const visibleSites = computed(() => filteredSites.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const rangeStart = computed(() => filteredSites.value.length ? (page.value - 1) * pageSize + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * pageSize, filteredSites.value.length));
watch([search, projectFilter, statusFilter], () => { page.value = 1; });
</script>

<template>
  <section class="sites-page">
    <div class="welcome-row projects-tools">
      <p>{{ sites.length }} project sites across {{ new Set(sites.map((site) => site.projectId)).size }} projects</p>
      <RouterLink to="/projects/sites/new" class="primary-button"><Plus :size="18" /> New site</RouterLink>
    </div>

    <div class="site-toolbar panel">
      <label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search site, project or address…" /></label>
      <select v-model="projectFilter" aria-label="Filter by project"><option value="all">All projects</option><option v-for="project in projects" :key="project.id" :value="String(project.id)">{{ project.code }}</option></select>
      <select v-model="statusFilter" aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select>
    </div>

    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div class="site-table-wrap panel">
      <div v-if="loading" class="table-loading">Loading project sites…</div>
      <table v-else class="site-table">
        <thead><tr><th>Site name</th><th>Project</th><th>Address</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="site in visibleSites" :key="site.id">
            <td><div class="site-name-cell"><span><MapPin :size="16" /></span><strong>{{ site.name }}</strong></div></td>
            <td><div class="site-project-cell"><strong>{{ site.projectCode }}</strong><small>{{ site.projectName }}</small></div></td>
            <td><span class="site-address">{{ site.address || '—' }}</span></td>
            <td><span class="status-chip">{{ site.status.replace('_', ' ') }}</span></td>
            <td><RouterLink :to="`/projects/sites/${site.id}/edit`" class="card-edit" title="Modify site"><Pencil :size="15" /></RouterLink></td>
          </tr>
          <tr v-if="visibleSites.length === 0"><td colspan="5"><div class="site-empty"><Search :size="22" /><strong>No project sites found</strong><span>Try changing the search or filters.</span></div></td></tr>
        </tbody>
      </table>
      <footer v-if="!loading && filteredSites.length" class="table-pagination">
        <span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredSites.length }}</span>
        <div><button :disabled="page === 1" aria-label="Previous page" @click="page--"><ChevronLeft :size="16" /></button><span>Page {{ page }} of {{ pageCount }}</span><button :disabled="page === pageCount" aria-label="Next page" @click="page++"><ChevronRight :size="16" /></button></div>
      </footer>
    </div>
  </section>
</template>
