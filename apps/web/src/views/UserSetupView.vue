<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Check, KeyRound, LoaderCircle, Pencil, Plus, Search, Trash2, UserRound, UsersRound, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

interface UserRecord {
  id: number; username: string; firstName: string; lastName: string | null; email: string;
  status: 'active' | 'inactive' | 'locked'; roleId: number; roleKey: string; roleName: string;
  projectIds: number[]; lastLoginAt: string | null;
}
interface RoleOption { id: number; key: string; name: string }
interface ProjectOption { id: number; name: string; code: string | null; status: string }

const auth = useAuthStore();
const users = ref<UserRecord[]>([]); const roles = ref<RoleOption[]>([]); const projects = ref<ProjectOption[]>([]);
const loading = ref(false); const saving = ref(false); const error = ref(''); const saved = ref(''); const search = ref('');
const modalOpen = ref(false); const editingId = ref<number | null>(null);
const form = reactive({ username: '', firstName: '', lastName: '', email: '', roleId: 0, status: 'active' as UserRecord['status'], password: '', projectIds: [] as number[] });
const canManage = computed(() => auth.hasPermission('admin.users.manage'));
const canDelete = computed(() => auth.hasPermission('admin.users.delete'));
const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase();
  return users.value.filter((user) => !term || `${user.firstName} ${user.lastName ?? ''} ${user.username} ${user.email} ${user.roleName}`.toLowerCase().includes(term));
});

async function load() {
  loading.value = true; error.value = '';
  try {
    const [list, options] = await Promise.all([
      api<{ users: UserRecord[] }>('/users'),
      api<{ roles: RoleOption[]; projects: ProjectOption[] }>('/users/options'),
    ]);
    users.value = list.users; roles.value = options.roles; projects.value = options.projects;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load users.'; }
  finally { loading.value = false; }
}
function openCreate() {
  editingId.value = null;
  Object.assign(form, { username: '', firstName: '', lastName: '', email: '', roleId: roles.value.find((role) => role.key === 'users')?.id ?? roles.value[0]?.id ?? 0, status: 'active', password: '', projectIds: [] });
  error.value = ''; saved.value = ''; modalOpen.value = true;
}
function openEdit(user: UserRecord) {
  editingId.value = user.id;
  Object.assign(form, { username: user.username, firstName: user.firstName, lastName: user.lastName ?? '', email: user.email, roleId: user.roleId, status: user.status, password: '', projectIds: [...user.projectIds] });
  error.value = ''; saved.value = ''; modalOpen.value = true;
}
async function saveUser() {
  if (!form.username.trim() || !form.firstName.trim() || !form.email.trim() || !form.roleId || (!editingId.value && form.password.length < 8)) {
    error.value = 'Complete the required fields. New passwords must contain at least 8 characters.'; return;
  }
  saving.value = true; error.value = ''; saved.value = '';
  try {
    const body = { ...form, lastName: form.lastName || null, ...(form.password ? { password: form.password } : {}) };
    const result = await api<{ message: string }>(editingId.value ? `/users/${editingId.value}` : '/users', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(body) });
    saved.value = result.message; modalOpen.value = false; await load();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save user.'; }
  finally { saving.value = false; }
}
async function deleteUser(user: UserRecord) {
  if (!window.confirm(`Delete user ${user.username}? This removes their personal menu and project assignments.`)) return;
  error.value = ''; saved.value = '';
  try {
    const result = await api<{ message: string }>(`/users/${user.id}`, { method: 'DELETE' });
    saved.value = result.message; await load();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete user.'; }
}
function toggleProject(projectId: number) {
  form.projectIds = form.projectIds.includes(projectId) ? form.projectIds.filter((id) => id !== projectId) : [...form.projectIds, projectId];
}
onMounted(load);
</script>

<template>
  <section class="admin-setup-page">
    <div class="admin-intro">
      <div><span class="eyebrow">Administration</span><h2>User accounts</h2><p>Create users, assign a group, control status, and limit project access.</p></div>
      <button v-if="canManage" class="primary-button" @click="openCreate"><Plus :size="17" /> Add user</button>
    </div>
    <p v-if="error && !modalOpen" class="form-error">{{ error }}</p>
    <p v-if="saved" class="save-success"><Check :size="15" />{{ saved }}</p>
    <article class="panel admin-list-panel">
      <div class="admin-toolbar"><label class="table-search"><Search :size="16" /><input v-model="search" placeholder="Search user, email, or group…" /></label><span>{{ filteredUsers.length }} users</span></div>
      <div v-if="loading" class="access-loading"><LoaderCircle :size="22" class="spin" /> Loading users…</div>
      <div v-else class="admin-user-table-wrap">
        <table class="admin-user-table">
          <thead><tr><th>User</th><th>Group</th><th>Projects</th><th>Status</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td data-label="User"><span class="user-cell"><i><UserRound :size="17" /></i><span><strong>{{ user.firstName }} {{ user.lastName }}</strong><small>{{ user.username }} · {{ user.email }}</small></span></span></td>
              <td data-label="Group"><span class="role-chip">{{ user.roleName }}</span></td>
              <td data-label="Projects">{{ user.projectIds.length ? `${user.projectIds.length} assigned` : 'All / not limited' }}</td>
              <td data-label="Status"><span class="status-pill" :class="user.status">{{ user.status }}</span></td>
              <td data-label="Last login">{{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never' }}</td>
              <td class="row-actions"><button v-if="canManage" class="icon-button" title="Edit user" @click="openEdit(user)"><Pencil :size="15" /></button><button v-if="canDelete && user.id !== auth.user?.id && user.roleKey !== 'programmer'" class="icon-button danger-icon" title="Delete user" @click="deleteUser(user)"><Trash2 :size="15" /></button></td>
            </tr>
            <tr v-if="!filteredUsers.length"><td colspan="6"><div class="site-empty"><UsersRound :size="22" /><strong>No users found</strong><span>Try a different search.</span></div></td></tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="modalOpen" class="modal-backdrop" @mousedown.self="modalOpen = false">
      <form class="admin-entry-modal" @submit.prevent="saveUser">
        <header><div><span class="role-icon big"><UserRound :size="21" /></span><span><h2>{{ editingId ? 'Update user' : 'Create user' }}</h2><p>Group permissions apply by default; Menu Setup can override a single user.</p></span></div><button type="button" class="icon-button" @click="modalOpen = false"><X :size="18" /></button></header>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="admin-form-grid">
          <label class="form-field"><span>Username *</span><input v-model.trim="form.username" maxlength="50" required /></label>
          <label class="form-field"><span>Email *</span><input v-model.trim="form.email" type="email" maxlength="120" required /></label>
          <label class="form-field"><span>First name *</span><input v-model.trim="form.firstName" maxlength="50" required /></label>
          <label class="form-field"><span>Last name</span><input v-model.trim="form.lastName" maxlength="50" /></label>
          <label class="form-field"><span>User group *</span><select v-model.number="form.roleId" required><option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option></select></label>
          <label class="form-field"><span>Status *</span><select v-model="form.status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="locked">Locked</option></select></label>
          <label class="form-field full"><span><KeyRound :size="13" /> Password {{ editingId ? '(leave blank to keep current)' : '*' }}</span><input v-model="form.password" type="password" :required="!editingId" minlength="8" autocomplete="new-password" /></label>
          <fieldset class="project-access-field full"><legend>Project access</legend><p>Select projects to restrict this user. No selection keeps the account unrestricted by project assignment.</p><div><label v-for="project in projects" :key="project.id"><input type="checkbox" :checked="form.projectIds.includes(project.id)" @change="toggleProject(project.id)" /><span><strong>{{ project.name }}</strong><small>{{ project.code || `Project #${project.id}` }}</small></span></label></div></fieldset>
        </div>
        <footer><button type="button" class="secondary-button" @click="modalOpen = false">Cancel</button><button class="primary-button" :disabled="saving"><LoaderCircle v-if="saving" :size="16" class="spin" /><Check v-else :size="16" />{{ saving ? 'Saving…' : 'Save user' }}</button></footer>
      </form>
    </div>
  </section>
</template>
