<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BriefcaseBusiness, MapPinned, Pencil, Phone, Plus, Search, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeAssignments, type EmployeeAssignment } from '../data/assignments';

const assignments = ref<EmployeeAssignment[]>(employeeAssignments.map((item) => ({ ...item, projects: [...item.projects], sites: [...item.sites] })));
const search = ref('');
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const result = await api<{ assignments: EmployeeAssignment[] }>('/assignments');
    assignments.value = result.assignments;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load assignments.';
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return assignments.value;
  return assignments.value.filter((item) => [item.name, item.employeeCode, item.phone, ...item.projects.map((project) => `${project.code} ${project.name}`), ...item.sites.map((site) => site.name)].some((value) => value.toLowerCase().includes(term)));
});
const projectCount = computed(() => new Set(assignments.value.flatMap((item) => item.projects.map((project) => project.id))).size);
const siteCount = computed(() => assignments.value.reduce((sum, item) => sum + item.sites.length, 0));

function siteGroups(assignment: EmployeeAssignment) {
  return assignment.projects.map((project) => ({ project, sites: assignment.sites.filter((site) => site.projectId === project.id) }));
}

function initials(name: string) {
  return name.split(/\s+/).filter((part) => !/^eng\.?$/i.test(part)).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
</script>

<template>
  <section class="assignments-page">
    <div class="welcome-row projects-tools">
      <p>{{ assignments.length }} employees · {{ projectCount }} projects · {{ siteCount }} assigned sites</p>
      <RouterLink to="/projects/assignments/new" class="primary-button"><Plus :size="18" /> Assign employee</RouterLink>
    </div>
    <div class="assignment-toolbar panel"><label class="table-search"><Search :size="17" /><input v-model="search" placeholder="Search employee, project or site…" /></label><span>{{ filtered.length }} employees</span></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div v-if="loading" class="panel table-loading">Loading assignments…</div>
    <div v-else class="assignment-list">
      <article v-for="assignment in filtered" :key="assignment.id" class="assignment-card panel">
        <header>
          <span class="engineer-avatar">{{ initials(assignment.name) }}</span>
          <div class="engineer-summary"><span><strong>{{ assignment.name }}</strong><em>{{ assignment.employeeCode }}</em></span><small><Phone :size="13" />{{ assignment.phone || 'No phone number' }}</small></div>
          <div class="assignment-totals"><span><BriefcaseBusiness :size="15" /><strong>{{ assignment.projects.length }}</strong> projects</span><span><MapPinned :size="15" /><strong>{{ assignment.sites.length }}</strong> sites</span></div>
          <RouterLink :to="`/projects/assignments/${assignment.id}/edit`" class="secondary-button"><Pencil :size="15" /> Modify</RouterLink>
        </header>
        <div v-if="assignment.projects.length" class="assignment-projects"><span>Assigned projects</span><div><span v-for="project in assignment.projects" :key="project.id" class="assignment-project-chip"><BriefcaseBusiness :size="13" />{{ project.code }}</span></div></div>
        <details v-if="assignment.sites.length" open class="assigned-sites-detail">
          <summary><span>All assigned sites</span><small>{{ assignment.sites.length }} sites</small></summary>
          <div class="assignment-site-groups">
            <section v-for="group in siteGroups(assignment)" :key="group.project.id">
              <header><strong>{{ group.project.code }}</strong><span>{{ group.sites.length }} sites</span></header>
              <div v-if="group.sites.length"><span v-for="site in group.sites" :key="site.id" class="assigned-site"><MapPinned :size="12" />{{ site.name }}</span></div>
              <p v-else>No individual sites selected.</p>
            </section>
          </div>
        </details>
        <div v-if="!assignment.projects.length" class="unassigned-engineer"><UserRoundCog :size="19" /><span><strong>No assignments yet</strong><small>Use Modify to assign projects and sites.</small></span></div>
      </article>
      <div v-if="!filtered.length" class="empty-projects panel"><Search :size="24" /><strong>No assignments found</strong><span>Try another employee, project, or site name.</span></div>
    </div>
  </section>
</template>
