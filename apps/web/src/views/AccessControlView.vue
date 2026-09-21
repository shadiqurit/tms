<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, ChevronRight, Info, Plus, Search, ShieldCheck, UsersRound } from 'lucide-vue-next';

const roles = [
  { id: 0, key: 'programmer', name: 'Programmer', users: 2, description: 'Super administrator with unrestricted system access' },
  { id: 1, key: 'admin', name: 'Admin', users: 1, description: 'Manages projects, people, and finance' },
  { id: 2, key: 'staff', name: 'Staff', users: 0, description: 'Operational access to assigned projects' },
  { id: 3, key: 'users', name: 'Users', users: 1, description: 'Limited data entry and viewing access' },
];
const modules = [
  { name: 'Projects', icon: 'P', permissions: ['View projects', 'Create & edit projects', 'Manage project sites', 'Assign project users', 'Delete unreferenced projects'] },
  { name: 'Expenses', icon: 'E', permissions: ['View general expenses', 'Create and modify general expenses', 'Delete general expenses', 'Manage expense setup'] },
  { name: 'Procurement', icon: 'P', permissions: ['View site engineer purchases', 'Create and modify site engineer purchases', 'Delete site engineer purchases', 'View corporate purchases', 'Create and modify corporate purchases', 'Delete corporate purchases', 'Transfer materials'] },
  { name: 'Workforce', icon: 'W', permissions: ['View employees', 'Create and modify employees', 'Delete unreferenced employees', 'Manage masons', 'Process salary & loans'] },
  { name: 'Finance', icon: 'F', permissions: ['View bills & deposits', 'Manage loans', 'Manage banks', 'Approve transactions'] },
  { name: 'Reports', icon: 'R', permissions: ['View reports', 'Export reports'] },
  { name: 'Administration', icon: 'A', permissions: ['Manage users', 'Manage menu permissions', 'Manage master data'] },
];
const selectedRole = ref(roles[1]!);
const search = ref('');
const grants = ref<Record<string, boolean>>({});

for (const module of modules) for (const permission of module.permissions) grants.value[permission] = selectedRole.value.key !== 'users' || permission.startsWith('View');
const filtered = computed(() => modules.filter((item) => item.name.toLowerCase().includes(search.value.toLowerCase()) || item.permissions.some((p) => p.toLowerCase().includes(search.value.toLowerCase()))));

function selectRole(role: typeof roles[number]) {
  selectedRole.value = role;
  for (const module of modules) for (const permission of module.permissions) grants.value[permission] = role.key === 'programmer' || role.key === 'admin' || permission.startsWith('View');
}
</script>

<template>
  <section class="access-page">
    <div class="welcome-row">
      <p>Control what each role can see and do across the workspace.</p>
      <button class="primary-button"><Plus :size="18" /> Add role</button>
    </div>
    <div class="access-layout">
      <aside class="roles-panel panel">
        <div class="panel-heading"><div><h2>Roles</h2><p>{{ roles.length }} roles configured</p></div></div>
        <button v-for="role in roles" :key="role.id" class="role-item" :class="{ active: selectedRole.id === role.id }" @click="selectRole(role)">
          <span class="role-icon"><ShieldCheck :size="18" /></span>
          <span><strong>{{ role.name }}</strong><small>{{ role.description }}</small><em><UsersRound :size="12" /> {{ role.users }} {{ role.users === 1 ? 'user' : 'users' }}</em></span>
          <ChevronRight :size="17" />
        </button>
      </aside>

      <article class="permissions-panel panel">
        <div class="permission-head">
          <div><span class="role-icon big"><ShieldCheck :size="21" /></span><span><h2>{{ selectedRole.name }} <em v-if="selectedRole.key === 'programmer'" class="super-admin-badge">Super admin</em></h2><p>{{ selectedRole.description }}</p></span></div>
          <button class="primary-button small"><Check :size="16" /> Save changes</button>
        </div>
        <div class="permission-note"><Info :size="16" /><p v-if="selectedRole.key === 'programmer'"><strong>Programmer is the super administrator.</strong> This role can create, update, delete, and configure everything. Its permissions cannot be disabled.</p><p v-else><strong>Permissions are role-based.</strong> Project access is assigned separately for each user.</p></div>
        <label class="permission-search"><Search :size="16" /><input v-model="search" placeholder="Find a module or permission…" /></label>
        <div class="permission-groups">
          <section v-for="module in filtered" :key="module.name" class="permission-group">
            <header><span>{{ module.icon }}</span><strong>{{ module.name }}</strong><em>{{ module.permissions.filter((p) => grants[p]).length }}/{{ module.permissions.length }} enabled</em></header>
            <label v-for="permission in module.permissions" :key="permission" class="permission-row">
              <span><strong>{{ permission }}</strong><small>Allow this role to {{ permission.toLowerCase() }}.</small></span>
              <input v-model="grants[permission]" type="checkbox" :disabled="selectedRole.key === 'programmer'" /><i></i>
            </label>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>
