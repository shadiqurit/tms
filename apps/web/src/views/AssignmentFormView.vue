<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, BriefcaseBusiness, Check, CheckSquare2, MapPinned, Save, Search, Square, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeAssignments, employeeOptions, type EmployeeAssignment, type EmployeeOption } from '../data/assignments';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';

interface ProjectOption { id: number; code: string; name: string; tenderId: string; location: string }
interface SiteOption { id: number; projectId: number; projectCode: string; projectName: string; name: string; address: string }

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'assignment-edit');
const routeEmployeeId = computed(() => Number(route.params.employeeId));
const demoExisting = computed(() => employeeAssignments.find((item) => item.id === routeEmployeeId.value));
const employees = ref<EmployeeOption[]>([...employeeOptions]);
const projectOptions = ref<ProjectOption[]>(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const siteOptions = ref<SiteOption[]>(demoSites.map(({ id, projectId, projectCode, projectName, name, address }) => ({ id, projectId, projectCode, projectName, name, address })));
const employeeId = ref(editing.value ? routeEmployeeId.value : 0);
const projectIds = ref<number[]>(demoExisting.value?.projects.map((item) => item.id) ?? []);
const siteIds = ref<number[]>(demoExisting.value?.sites.map((item) => item.id) ?? []);
const projectSearch = ref('');
const siteSearch = ref('');
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  loading.value = true;
  try {
    const requests: [Promise<{ employees: EmployeeOption[]; projects: ProjectOption[]; sites: SiteOption[] }>, Promise<{ assignment: EmployeeAssignment }> | null] = [
      api('/assignments/options'),
      editing.value ? api(`/assignments/${routeEmployeeId.value}`) : null,
    ];
    const [options, current] = await Promise.all(requests);
    employees.value = options.employees;
    projectOptions.value = options.projects;
    siteOptions.value = options.sites;
    if (current) {
      employeeId.value = current.assignment.id;
      projectIds.value = current.assignment.projects.map((item) => item.id);
      siteIds.value = current.assignment.sites.map((item) => item.id);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load assignment options.';
  } finally {
    loading.value = false;
  }
});

const filteredProjects = computed(() => {
  const term = projectSearch.value.trim().toLowerCase();
  return projectOptions.value.filter((project) => !term || [project.code, project.name, project.tenderId, project.location].some((value) => value.toLowerCase().includes(term)));
});
const selectedProjects = computed(() => projectOptions.value.filter((project) => projectIds.value.includes(project.id)));
const selectedEmployee = computed(() => employees.value.find((employee) => employee.id === employeeId.value));

function projectSites(projectId: number) {
  const term = siteSearch.value.trim().toLowerCase();
  return siteOptions.value.filter((site) => site.projectId === projectId && (!term || [site.name, site.address].some((value) => value.toLowerCase().includes(term))));
}
function toggleProject(projectId: number) {
  if (projectIds.value.includes(projectId)) {
    projectIds.value = projectIds.value.filter((id) => id !== projectId);
    const removedSiteIds = new Set(siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id));
    siteIds.value = siteIds.value.filter((id) => !removedSiteIds.has(id));
  } else projectIds.value.push(projectId);
}
function toggleSite(siteId: number) {
  siteIds.value = siteIds.value.includes(siteId) ? siteIds.value.filter((id) => id !== siteId) : [...siteIds.value, siteId];
}
function allSitesSelected(projectId: number) {
  const ids = siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id);
  return ids.length > 0 && ids.every((id) => siteIds.value.includes(id));
}
function toggleAllSites(projectId: number) {
  const ids = siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id);
  if (allSitesSelected(projectId)) siteIds.value = siteIds.value.filter((id) => !ids.includes(id));
  else siteIds.value = [...new Set([...siteIds.value, ...ids])];
}

async function save() {
  error.value = '';
  if (!employeeId.value) { error.value = 'Select an employee.'; return; }
  if (!projectIds.value.length) { error.value = 'Select at least one project.'; return; }
  saving.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(`/assignments/${employeeId.value}`, { method: 'PUT', body: JSON.stringify({ projectIds: projectIds.value, siteIds: siteIds.value }) });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const target = employeeAssignments.find((item) => item.id === employeeId.value);
      const employee = selectedEmployee.value!;
      const next: EmployeeAssignment = {
        ...(target ?? { ...employee, email: '', address: '', status: 'active' as const }),
        projects: projectOptions.value.filter((project) => projectIds.value.includes(project.id)).map(({ id, code, name }) => ({ id, code, name })),
        sites: siteOptions.value.filter((site) => siteIds.value.includes(site.id)),
      };
      if (target) Object.assign(target, next); else employeeAssignments.push(next);
    }
    saved.value = true;
    setTimeout(() => router.push('/projects/assignments'), 550);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not save assignments.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="assignment-form-page">
    <div class="form-page-head">
      <RouterLink to="/projects/assignments" class="back-link"><ArrowLeft :size="16" /> All assignments</RouterLink>
      <div><span class="form-heading-icon"><UserRoundCog :size="21" /></span><span><h2>{{ editing ? 'Modify employee assignments' : 'Assign projects and sites' }}</h2><p>Every employee is a site engineer. Select multiple projects, then choose their sites.</p></span></div>
    </div>
    <div v-if="loading" class="panel table-loading">Loading assignment options…</div>
    <form v-else class="assignment-form" @submit.prevent="save">
      <section class="assignment-step panel">
        <header><span>1</span><div><h3>Employee</h3><p>Choose the employee who will work as site engineer.</p></div></header>
        <label class="form-field"><span>Employee (Site Engineer) <b>*</b></span><select v-model.number="employeeId" :disabled="editing" required><option :value="0" disabled>Select employee</option><option v-for="employee in employees" :key="employee.id" :value="employee.id">{{ employee.employeeCode }} — {{ employee.name }} · {{ employee.phone }}</option></select></label>
      </section>

      <section class="assignment-step panel">
        <header><span>2</span><div><h3>Projects</h3><p>Select one or more projects.</p></div><em>{{ projectIds.length }} selected</em></header>
        <label class="assignment-search"><Search :size="16" /><input v-model="projectSearch" placeholder="Search package, project, tender or location…" /></label>
        <div class="project-choice-grid">
          <button v-for="project in filteredProjects" :key="project.id" type="button" class="project-choice" :class="{ selected: projectIds.includes(project.id) }" @click="toggleProject(project.id)">
            <CheckSquare2 v-if="projectIds.includes(project.id)" :size="18" /><Square v-else :size="18" />
            <span><strong>{{ project.code }}</strong><small>{{ project.name }}</small><em>{{ project.location }}</em></span>
          </button>
        </div>
      </section>

      <section class="assignment-step panel">
        <header><span>3</span><div><h3>Project sites</h3><p>Select multiple sites from the chosen projects.</p></div><em>{{ siteIds.length }} selected</em></header>
        <div v-if="selectedProjects.length" class="site-choice-area">
          <label class="assignment-search"><Search :size="16" /><input v-model="siteSearch" placeholder="Search selected project sites…" /></label>
          <section v-for="project in selectedProjects" :key="project.id" class="site-choice-group">
            <header><div><BriefcaseBusiness :size="15" /><span><strong>{{ project.code }}</strong><small>{{ project.name }}</small></span></div><button type="button" @click="toggleAllSites(project.id)">{{ allSitesSelected(project.id) ? 'Clear all' : 'Select all' }}</button></header>
            <div v-if="projectSites(project.id).length" class="site-choice-grid">
              <button v-for="site in projectSites(project.id)" :key="site.id" type="button" :class="{ selected: siteIds.includes(site.id) }" @click="toggleSite(site.id)"><Check v-if="siteIds.includes(site.id)" :size="14" /><MapPinned v-else :size="14" /><span><strong>{{ site.name }}</strong><small>{{ site.address }}</small></span></button>
            </div>
            <p v-else>No matching sites in this project.</p>
          </section>
        </div>
        <div v-else class="choose-project-prompt"><BriefcaseBusiness :size="22" /><strong>Choose a project first</strong><span>Its available sites will appear here.</span></div>
      </section>

      <p v-if="error" class="form-error form-message">{{ error }}</p>
      <p v-if="saved" class="save-success"><Check :size="16" /> Assignments saved. Returning to the list…</p>
      <footer class="assignment-form-actions"><div><strong>{{ selectedEmployee?.name || 'No employee selected' }}</strong><span>{{ projectIds.length }} projects · {{ siteIds.length }} sites</span></div><RouterLink to="/projects/assignments" class="secondary-button">Cancel</RouterLink><button class="primary-button" :disabled="saving"><Save :size="17" />{{ saving ? 'Saving…' : 'Save assignments' }}</button></footer>
    </form>
  </section>
</template>
