<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Check, ChevronRight, Layers3, LoaderCircle, Menu, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

interface MenuItem { id: number; parentId: number | null; permissionId: number | null; permissionKey: string | null; label: string; route: string | null; icon: string; sortOrder: number; active: number | boolean }
interface Permission { id: number; permissionKey: string; name: string; module: string }
interface RoleRecord { id: number; key: string; name: string; users: number }
interface UserRecord { id: number; username: string; name: string; roleId: number; roleKey: string; roleName: string; status: string }
interface Grant { roleId: number; permissionId: number; allowed: number | boolean }
interface Override { userId: number; permissionId: number; allowed: number | boolean }

const auth = useAuthStore();
const tab = ref<'menus' | 'groups' | 'users'>('menus');
const items = ref<MenuItem[]>([]); const permissions = ref<Permission[]>([]); const roles = ref<RoleRecord[]>([]); const users = ref<UserRecord[]>([]);
const roleGrants = ref<Grant[]>([]); const userOverrides = ref<Override[]>([]);
const loading = ref(false); const saving = ref(false); const error = ref(''); const saved = ref(''); const search = ref('');
const selectedRoleId = ref(0); const selectedUserId = ref(0); const groupValues = ref<Record<number, boolean>>({}); const userValues = ref<Record<number, 'inherit' | 'allow' | 'deny'>>({});
const modalOpen = ref(false); const editingId = ref<number | null>(null);
const form = reactive({ parentId: null as number | null, permissionId: null as number | null, label: '', route: '', icon: 'Circle', sortOrder: 10, active: true });
const canManage = computed(() => auth.hasPermission('admin.menus.manage'));
const roots = computed(() => items.value.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder));
const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value));
const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value));
const menuName = (item: MenuItem) => item.parentId ? `${items.value.find((parent) => parent.id === item.parentId)?.label ?? 'Menu'} / ${item.label}` : item.label;
const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase();
  return [...items.value].sort((a, b) => (a.parentId ?? a.id) - (b.parentId ?? b.id) || a.sortOrder - b.sortOrder)
    .filter((item) => !term || `${menuName(item)} ${item.route ?? ''} ${item.permissionKey ?? ''}`.toLowerCase().includes(term));
});
const accessItems = computed(() => {
  const unique = new Map<number, MenuItem>();
  for (const item of items.value) if (item.permissionId && !unique.has(item.permissionId)) unique.set(item.permissionId, item);
  return [...unique.values()].sort((a, b) => menuName(a).localeCompare(menuName(b)));
});

async function load() {
  loading.value = true; error.value = '';
  try {
    const result = await api<{ items: MenuItem[]; permissions: Permission[]; roles: RoleRecord[]; users: UserRecord[]; roleGrants: Grant[]; userOverrides: Override[] }>('/menus');
    items.value = result.items; permissions.value = result.permissions; roles.value = result.roles; users.value = result.users; roleGrants.value = result.roleGrants; userOverrides.value = result.userOverrides;
    selectedRoleId.value ||= result.roles.find((role) => role.key === 'admin')?.id ?? result.roles[0]?.id ?? 0;
    selectedUserId.value ||= result.users.find((user) => user.roleKey !== 'programmer')?.id ?? result.users[0]?.id ?? 0;
    populateGroup(); populateUser();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load menu setup.'; }
  finally { loading.value = false; }
}
function roleAllowed(roleId: number, permissionId: number) {
  const role = roles.value.find((item) => item.id === roleId);
  return role?.key === 'programmer' || Boolean(roleGrants.value.find((grant) => grant.roleId === roleId && grant.permissionId === permissionId)?.allowed);
}
function populateGroup() { groupValues.value = Object.fromEntries(accessItems.value.map((item) => [item.permissionId!, roleAllowed(selectedRoleId.value, item.permissionId!)])); }
function populateUser() {
  userValues.value = Object.fromEntries(accessItems.value.map((item) => {
    const override = userOverrides.value.find((entry) => entry.userId === selectedUserId.value && entry.permissionId === item.permissionId);
    return [item.permissionId!, override === undefined ? 'inherit' : Boolean(override.allowed) ? 'allow' : 'deny'];
  }));
}
function openCreate() { editingId.value = null; Object.assign(form, { parentId: null, permissionId: null, label: '', route: '', icon: 'Circle', sortOrder: 10, active: true }); error.value = ''; modalOpen.value = true; }
function openEdit(item: MenuItem) { editingId.value = item.id; Object.assign(form, { parentId: item.parentId, permissionId: item.permissionId, label: item.label, route: item.route ?? '', icon: item.icon, sortOrder: item.sortOrder, active: Boolean(item.active) }); error.value = ''; modalOpen.value = true; }
async function saveMenu() {
  if (!form.label.trim()) { error.value = 'Menu label is required.'; return; }
  saving.value = true; error.value = ''; saved.value = '';
  try {
    const result = await api<{ message: string }>(editingId.value ? `/menus/${editingId.value}` : '/menus', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify({ ...form, route: form.route || null }) });
    saved.value = result.message; modalOpen.value = false; await load(); window.dispatchEvent(new Event('tms:navigation-changed'));
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save menu.'; }
  finally { saving.value = false; }
}
async function deleteMenu(item: MenuItem) {
  if (!window.confirm(`Delete menu ${item.label}?`)) return;
  try { const result = await api<{ message: string }>(`/menus/${item.id}`, { method: 'DELETE' }); saved.value = result.message; await load(); window.dispatchEvent(new Event('tms:navigation-changed')); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete menu.'; }
}
async function saveGroup() {
  if (!selectedRole.value || selectedRole.value.key === 'programmer') return;
  saving.value = true; error.value = '';
  try {
    const payload = accessItems.value.map((item) => ({ permissionId: item.permissionId!, allowed: Boolean(groupValues.value[item.permissionId!]) }));
    const result = await api<{ message: string }>(`/menus/roles/${selectedRoleId.value}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: payload }) });
    saved.value = result.message; await load();
    if (auth.user?.role.id === selectedRoleId.value) { await auth.refreshSession(); window.dispatchEvent(new Event('tms:navigation-changed')); }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save group menu access.'; }
  finally { saving.value = false; }
}
async function saveUser() {
  if (!selectedUser.value || selectedUser.value.roleKey === 'programmer') return;
  saving.value = true; error.value = '';
  try {
    const payload = accessItems.value.map((item) => ({ permissionId: item.permissionId!, allowed: userValues.value[item.permissionId!] === 'inherit' ? null : userValues.value[item.permissionId!] === 'allow' }));
    const result = await api<{ message: string }>(`/menus/users/${selectedUserId.value}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions: payload }) });
    saved.value = result.message; await load();
    if (auth.user?.id === selectedUserId.value) { await auth.refreshSession(); window.dispatchEvent(new Event('tms:navigation-changed')); }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save personal menu access.'; }
  finally { saving.value = false; }
}
function effectiveUserAllowed(permissionId: number) {
  const value = userValues.value[permissionId];
  return value === 'allow' || (value === 'inherit' && selectedUser.value ? roleAllowed(selectedUser.value.roleId, permissionId) : false);
}
onMounted(load);
</script>

<template>
  <section class="admin-setup-page">
    <div class="admin-intro"><div><span class="eyebrow">Administration</span><h2>Menu setup</h2><p>Maintain the navigation and assign menus by user group or individual user.</p></div></div>
    <div class="admin-tabs"><button :class="{ active: tab === 'menus' }" @click="tab = 'menus'"><Menu :size="16" /> Menu items</button><button :class="{ active: tab === 'groups' }" @click="tab = 'groups'"><UsersRound :size="16" /> Group access</button><button :class="{ active: tab === 'users' }" @click="tab = 'users'"><UserRound :size="16" /> User access</button></div>
    <p v-if="error && !modalOpen" class="form-error">{{ error }}</p><p v-if="saved" class="save-success"><Check :size="15" />{{ saved }}</p>
    <div v-if="loading" class="access-loading panel"><LoaderCircle :size="22" class="spin" /> Loading menu configuration…</div>

    <article v-else-if="tab === 'menus'" class="panel admin-list-panel">
      <div class="admin-toolbar"><label class="table-search"><Search :size="16" /><input v-model="search" placeholder="Search menu, route, or permission…" /></label><span>{{ items.length }} items</span><button v-if="canManage" class="primary-button small" @click="openCreate"><Plus :size="16" /> Add menu</button></div>
      <div class="menu-config-list">
        <div v-for="item in filteredItems" :key="item.id" class="menu-config-row" :class="{ child: item.parentId, inactive: !item.active }"><span class="menu-config-icon"><Layers3 :size="17" /></span><span><strong>{{ menuName(item) }}</strong><small>{{ item.route || 'Menu group' }} · {{ item.permissionKey || 'Visible to signed-in users' }}</small></span><em>Order {{ item.sortOrder }}</em><i>{{ item.active ? 'Active' : 'Hidden' }}</i><button v-if="canManage" class="icon-button" @click="openEdit(item)"><Pencil :size="15" /></button><button v-if="canManage" class="icon-button danger-icon" @click="deleteMenu(item)"><Trash2 :size="15" /></button></div>
      </div>
    </article>

    <div v-else-if="tab === 'groups'" class="menu-access-layout">
      <aside class="panel access-selector"><div class="panel-heading"><div><h2>User groups</h2><p>Default menu access for every member</p></div></div><button v-for="role in roles" :key="role.id" :class="{ active: selectedRoleId === role.id }" @click="selectedRoleId = role.id; saved = ''; populateGroup()"><span class="role-icon"><ShieldCheck :size="17" /></span><span><strong>{{ role.name }}</strong><small>{{ Number(role.users) }} users</small></span><ChevronRight :size="16" /></button></aside>
      <article class="panel menu-access-panel"><header><div><h2>{{ selectedRole?.name }} menu access</h2><p>Enable menus for everyone assigned to this group.</p></div><button v-if="canManage" class="primary-button small" :disabled="selectedRole?.key === 'programmer' || saving" @click="saveGroup"><LoaderCircle v-if="saving" :size="15" class="spin" /><Check v-else :size="15" /> Save group access</button></header><p v-if="selectedRole?.key === 'programmer'" class="permission-note"><ShieldCheck :size="16" /> Programmer is unrestricted and always sees every active menu.</p><label v-for="item in accessItems" :key="item.permissionId!" class="menu-access-row"><span><strong>{{ menuName(item) }}</strong><small>{{ item.permissionKey }}</small></span><input v-model="groupValues[item.permissionId!]" type="checkbox" :disabled="selectedRole?.key === 'programmer'" /><i></i></label></article>
    </div>

    <div v-else class="menu-access-layout">
      <aside class="panel access-selector"><div class="panel-heading"><div><h2>Users</h2><p>Override the selected user's group</p></div></div><button v-for="user in users" :key="user.id" :class="{ active: selectedUserId === user.id }" @click="selectedUserId = user.id; saved = ''; populateUser()"><span class="role-icon"><UserRound :size="17" /></span><span><strong>{{ user.name || user.username }}</strong><small>{{ user.roleName }} · {{ user.status }}</small></span><ChevronRight :size="16" /></button></aside>
      <article class="panel menu-access-panel"><header><div><h2>{{ selectedUser?.name || selectedUser?.username }} menu access</h2><p>Inherit uses the selected user's group permission.</p></div><button v-if="canManage" class="primary-button small" :disabled="selectedUser?.roleKey === 'programmer' || saving" @click="saveUser"><LoaderCircle v-if="saving" :size="15" class="spin" /><Check v-else :size="15" /> Save user access</button></header><p v-if="selectedUser?.roleKey === 'programmer'" class="permission-note"><ShieldCheck :size="16" /> Programmer is unrestricted and cannot receive menu overrides.</p><div v-for="item in accessItems" :key="item.permissionId!" class="user-menu-row"><span><strong>{{ menuName(item) }}</strong><small>{{ item.permissionKey }} · group is {{ roleAllowed(selectedUser?.roleId ?? 0, item.permissionId!) ? 'allowed' : 'denied' }}</small></span><select v-model="userValues[item.permissionId!]" :disabled="selectedUser?.roleKey === 'programmer'"><option value="inherit">Inherit from group</option><option value="allow">Allow for user</option><option value="deny">Deny for user</option></select><em :class="{ allowed: effectiveUserAllowed(item.permissionId!) }">{{ effectiveUserAllowed(item.permissionId!) ? 'Visible' : 'Hidden' }}</em></div></article>
    </div>

    <div v-if="modalOpen" class="modal-backdrop" @mousedown.self="modalOpen = false"><form class="admin-entry-modal compact" @submit.prevent="saveMenu"><header><div><span class="role-icon big"><Menu :size="21" /></span><span><h2>{{ editingId ? 'Update menu item' : 'Create menu item' }}</h2><p>Changes appear in the application sidebar immediately.</p></span></div><button type="button" class="icon-button" @click="modalOpen = false"><X :size="18" /></button></header><p v-if="error" class="form-error">{{ error }}</p><div class="admin-form-grid"><label class="form-field"><span>Menu label *</span><input v-model.trim="form.label" required /></label><label class="form-field"><span>Parent menu</span><select v-model="form.parentId"><option :value="null">Top level</option><option v-for="root in roots.filter((root) => root.id !== editingId)" :key="root.id" :value="root.id">{{ root.label }}</option></select></label><label class="form-field full"><span>Permission</span><select v-model="form.permissionId"><option :value="null">Visible to all signed-in users</option><option v-for="permission in permissions" :key="permission.id" :value="permission.id">{{ permission.module }} · {{ permission.name }}</option></select></label><label class="form-field"><span>Route</span><input v-model.trim="form.route" placeholder="/module/page" /></label><label class="form-field"><span>Icon name</span><input v-model.trim="form.icon" placeholder="Circle" /></label><label class="form-field"><span>Sort order</span><input v-model.number="form.sortOrder" type="number" min="0" max="9999" /></label><label class="toggle-field"><input v-model="form.active" type="checkbox" /><span><strong>Active menu</strong><small>Hidden menus are removed from the sidebar.</small></span></label></div><footer><button type="button" class="secondary-button" @click="modalOpen = false">Cancel</button><button class="primary-button" :disabled="saving"><LoaderCircle v-if="saving" :size="16" class="spin" /><Check v-else :size="16" />{{ saving ? 'Saving…' : 'Save menu' }}</button></footer></form></div>
  </section>
</template>
