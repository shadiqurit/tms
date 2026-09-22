<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Check, ChevronRight, Info, LoaderCircle, Search, ShieldCheck, UsersRound } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

interface RoleRecord { id: number; key: string; name: string; description: string; users: number }
interface PermissionRecord { id: number; permissionKey: string; name: string; module: string; roleId: number; allowed: number | boolean }
interface PermissionModule { name: string; permissions: PermissionRecord[] }

const auth = useAuthStore();
const roles = ref<RoleRecord[]>([]); const permissions = ref<PermissionRecord[]>([]); const selectedRoleId = ref(0);
const grants = ref<Record<number, boolean>>({}); const search = ref(''); const loading = ref(false); const saving = ref(false);
const dirty = ref(false); const error = ref(''); const saved = ref('');
const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value));
const rolePermissions = computed(() => permissions.value.filter((permission) => permission.roleId === selectedRoleId.value));
const modules = computed<PermissionModule[]>(() => {
  const grouped = new Map<string, PermissionRecord[]>();
  for (const permission of rolePermissions.value) grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
  const term = search.value.trim().toLowerCase();
  return [...grouped.entries()].map(([name, items]) => ({ name, permissions: items }))
    .filter((module) => !term || module.name.toLowerCase().includes(term) || module.permissions.some((permission) => `${permission.name} ${permission.permissionKey}`.toLowerCase().includes(term)));
});

function populateGrants() {
  grants.value = Object.fromEntries(rolePermissions.value.map((permission) => [permission.id, selectedRole.value?.key === 'programmer' || Boolean(permission.allowed)]));
  dirty.value = false; saved.value = ''; error.value = '';
}
function selectRole(role: RoleRecord) { selectedRoleId.value = role.id; populateGrants(); }
function findByKey(key: string) { return rolePermissions.value.find((permission) => permission.permissionKey === key); }
function permissionChanged(permission: PermissionRecord, event: Event) {
  const allowed = (event.target as HTMLInputElement).checked;
  grants.value[permission.id] = allowed;
  const match = permission.permissionKey.match(/^(.*)\.(view|manage|delete)$/);
  if (match) {
    const [, prefix, action] = match;
    if (allowed && (action === 'manage' || action === 'delete')) { const view = findByKey(`${prefix}.view`); if (view) grants.value[view.id] = true; }
    if (!allowed && action === 'view') for (const dependent of [`${prefix}.manage`, `${prefix}.delete`]) { const item = findByKey(dependent); if (item) grants.value[item.id] = false; }
  }
  dirty.value = true; saved.value = ''; error.value = '';
}
async function loadAccess() {
  loading.value = true; error.value = '';
  try {
    const result = await api<{ roles: RoleRecord[]; permissions: PermissionRecord[] }>('/access/roles');
    roles.value = result.roles; permissions.value = result.permissions;
    selectedRoleId.value = result.roles.find((role) => role.key === 'admin')?.id ?? result.roles[0]?.id ?? 0;
    populateGrants();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load role permissions.'; }
  finally { loading.value = false; }
}
async function savePermissions() {
  if (!selectedRole.value || selectedRole.value.key === 'programmer' || !dirty.value) return;
  saving.value = true; error.value = ''; saved.value = '';
  try {
    const roleItems = rolePermissions.value.map((permission) => ({ permissionId: permission.id, allowed: Boolean(grants.value[permission.id]) }));
    const result = await api<{ message: string }>(`/access/roles/${selectedRole.value.id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: roleItems }) });
    for (const permission of rolePermissions.value) permission.allowed = grants.value[permission.id];
    dirty.value = false; saved.value = result.message;
    if (auth.user?.role.id === selectedRole.value.id) await auth.refreshSession();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save role permissions.'; }
  finally { saving.value = false; }
}
onMounted(loadAccess);
</script>

<template>
  <section class="access-page">
    <div class="welcome-row"><p>Control which menus each user role can see and which actions it can perform.</p><span v-if="saved" class="save-success"><Check :size="15" />{{ saved }}</span></div>
    <p v-if="error" class="form-error site-load-error">{{ error }}</p>
    <div v-if="loading" class="access-loading panel"><LoaderCircle :size="22" class="spin" /> Loading roles and permissions…</div>
    <div v-else class="access-layout">
      <aside class="roles-panel panel">
        <div class="panel-heading"><div><h2>User roles</h2><p>{{ roles.length }} roles configured</p></div></div>
        <button v-for="role in roles" :key="role.id" class="role-item" :class="{ active: selectedRoleId === role.id }" @click="selectRole(role)"><span class="role-icon"><ShieldCheck :size="18" /></span><span><strong>{{ role.name }}</strong><small>{{ role.description }}</small><em><UsersRound :size="12" /> {{ Number(role.users) }} {{ Number(role.users) === 1 ? 'user' : 'users' }}</em></span><ChevronRight :size="17" /></button>
      </aside>

      <article v-if="selectedRole" class="permissions-panel panel">
        <div class="permission-head"><div><span class="role-icon big"><ShieldCheck :size="21" /></span><span><h2>{{ selectedRole.name }} <em v-if="selectedRole.key === 'programmer'" class="super-admin-badge">Super admin</em></h2><p>{{ selectedRole.description }}</p></span></div><button class="primary-button small" :disabled="selectedRole.key === 'programmer' || !dirty || saving" @click="savePermissions"><LoaderCircle v-if="saving" :size="16" class="spin" /><Check v-else :size="16" />{{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}</button></div>
        <div class="permission-note"><Info :size="16" /><p v-if="selectedRole.key === 'programmer'"><strong>Programmer is the super administrator.</strong> Every menu and action is always available and cannot be disabled.</p><p v-else><strong>Permissions are applied to every user with this role.</strong> View permissions control menus; create, modify, and delete permissions control actions and protected URLs.</p></div>
        <label class="permission-search"><Search :size="16" /><input v-model="search" placeholder="Find a module or permission…" /></label>
        <div class="permission-groups">
          <section v-for="module in modules" :key="module.name" class="permission-group"><header><span>{{ module.name.slice(0, 1).toUpperCase() }}</span><strong>{{ module.name }}</strong><em>{{ module.permissions.filter((permission) => grants[permission.id]).length }}/{{ module.permissions.length }} enabled</em></header><label v-for="permission in module.permissions" :key="permission.id" class="permission-row"><span><strong>{{ permission.name }}</strong><small>{{ permission.permissionKey }}</small></span><input :checked="grants[permission.id]" type="checkbox" :disabled="selectedRole.key === 'programmer'" @change="permissionChanged(permission, $event)" /><i></i></label></section>
          <div v-if="!modules.length" class="site-empty"><ShieldCheck :size="22" /><strong>No permissions found</strong><span>Try a different search.</span></div>
        </div>
      </article>
    </div>
  </section>
</template>
