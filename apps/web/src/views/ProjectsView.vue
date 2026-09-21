<script setup lang="ts">
import { Check, ChevronDown, Grid2X2, List, MapPin, Pencil, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { formatMoney, projects } from '../data/projects';

const search = ref('');
const filtersOpen = ref(false);
const statusFilter = ref<'all' | 'active' | 'planned' | 'on_hold' | 'completed'>('all');
const siteFilter = ref<'all' | 'with_sites' | 'without_sites'>('all');
const viewMode = ref<'cards' | 'table'>((localStorage.getItem('tms_project_view') as 'cards' | 'table') || 'cards');

const activeFilterCount = computed(() => Number(statusFilter.value !== 'all') + Number(siteFilter.value !== 'all'));
const filteredProjects = computed(() => {
  const term = search.value.trim().toLowerCase();
  return projects.filter((project) => {
    const matchesSearch = !term || [project.name, project.code, project.tenderId, project.location].some((value) => value.toLowerCase().includes(term));
    const matchesStatus = statusFilter.value === 'all' || project.status === statusFilter.value;
    const matchesSites = siteFilter.value === 'all'
      || (siteFilter.value === 'with_sites' ? project.sites > 0 : project.sites === 0);
    return matchesSearch && matchesStatus && matchesSites;
  });
});

function setView(mode: 'cards' | 'table') {
  viewMode.value = mode;
  localStorage.setItem('tms_project_view', mode);
}

function clearFilters() {
  statusFilter.value = 'all';
  siteFilter.value = 'all';
}
</script>

<template>
  <section>
    <div class="welcome-row projects-tools">
      <p>10 projects · 93 sites · ৳177.19M total contract value</p>
      <RouterLink to="/projects/new" class="primary-button"><Plus :size="18" /> New project</RouterLink>
    </div>
    <div class="toolbar panel">
      <label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search projects, packages or locations…" /></label>
      <button class="secondary-button filter-trigger" :class="{ active: filtersOpen }" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen"><SlidersHorizontal :size="16" /> Filters <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span><ChevronDown :size="14" /></button>
      <div class="view-switch" aria-label="Project view">
        <button :class="{ active: viewMode === 'cards' }" title="Card view" :aria-pressed="viewMode === 'cards'" @click="setView('cards')"><Grid2X2 :size="16" /></button>
        <button :class="{ active: viewMode === 'table' }" title="Table view" :aria-pressed="viewMode === 'table'" @click="setView('table')"><List :size="17" /></button>
      </div>
    </div>
    <div v-if="filtersOpen" class="project-filters panel">
      <div class="filter-field"><span>Status</span><select v-model="statusFilter"><option value="all">All statuses</option><option value="active">Active</option><option value="planned">Planned</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></div>
      <div class="filter-field"><span>Site coverage</span><select v-model="siteFilter"><option value="all">All projects</option><option value="with_sites">Has project sites</option><option value="without_sites">No project sites</option></select></div>
      <button class="clear-filter" :disabled="activeFilterCount === 0" @click="clearFilters"><RotateCcw :size="14" /> Clear filters</button>
      <p><Check :size="14" /> Showing {{ filteredProjects.length }} of {{ projects.length }} projects</p>
    </div>

    <div v-if="filteredProjects.length === 0" class="empty-projects panel"><Search :size="24" /><strong>No projects found</strong><span>Try a different search or clear the filters.</span><button v-if="activeFilterCount" class="secondary-button" @click="clearFilters">Clear filters</button></div>

    <div v-else-if="viewMode === 'cards'" class="project-card-grid">
      <article v-for="project in filteredProjects" :key="project.id" class="project-card panel">
        <div class="project-card-head"><span class="project-avatar large" :class="project.color">{{ project.code.slice(0, 2) }}</span><span class="status-chip">{{ project.status.replace('_', ' ') }}</span><RouterLink :to="`/projects/${project.id}/edit`" class="card-edit" title="Edit project"><Pencil :size="16" /></RouterLink></div>
        <span class="project-code">{{ project.code }}</span>
        <h2>{{ project.name }}</h2>
        <p><MapPin :size="14" /> {{ project.location }}</p>
        <div class="project-card-metrics"><div><strong>{{ project.sites }}</strong><span>Sites</span></div><div><strong>{{ formatMoney(project.value) }}</strong><span>Contract value</span></div></div>
        <div class="card-progress"><div><span>Overall progress</span><strong>{{ project.progress }}%</strong></div><div class="progress-track"><i :style="{ width: `${project.progress}%` }"></i></div></div>
        <RouterLink :to="`/projects/${project.id}/edit`" class="project-open">View or modify project <span>→</span></RouterLink>
      </article>
    </div>

    <div v-else class="project-table-wrap panel">
      <table class="project-table">
        <thead><tr><th>Project</th><th>Location</th><th>Status</th><th>Sites</th><th>Contract value</th><th>Progress</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="project in filteredProjects" :key="project.id">
            <td><div class="table-project"><span class="project-avatar" :class="project.color">{{ project.code.slice(0, 2) }}</span><span><strong>{{ project.name }}</strong><small>{{ project.code }} · Tender {{ project.tenderId }}</small></span></div></td>
            <td><span class="table-location"><MapPin :size="13" />{{ project.location }}</span></td>
            <td><span class="status-chip">{{ project.status.replace('_', ' ') }}</span></td>
            <td><strong>{{ project.sites }}</strong></td>
            <td><strong>{{ formatMoney(project.value) }}</strong></td>
            <td><div class="table-progress"><span>{{ project.progress }}%</span><div class="progress-track"><i :style="{ width: `${project.progress}%` }"></i></div></div></td>
            <td><RouterLink :to="`/projects/${project.id}/edit`" class="card-edit" title="View or modify project"><Pencil :size="15" /></RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
