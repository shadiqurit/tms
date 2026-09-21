<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Bell, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/BrandMark.vue';
import SideNavigation from '../components/SideNavigation.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const mobileOpen = ref(false);
const profileOpen = ref(false);

const title = computed(() => {
  if (route.path === '/dashboard') return 'Good evening, Sadiq';
  if (route.path === '/projects') return 'Projects';
  if (route.name === 'project-new') return 'New project';
  if (route.name === 'project-edit') return 'Edit project';
  if (route.name === 'project-sites') return 'Project sites';
  if (route.name === 'project-site-new') return 'New project site';
  if (route.name === 'project-site-edit') return 'Edit project site';
  if (route.name === 'assignments') return 'Employee assignments';
  if (route.name === 'assignment-new') return 'New assignment';
  if (route.name === 'assignment-edit') return 'Modify assignment';
  if (route.name === 'employees') return 'Employees';
  if (route.name === 'employee-new') return 'New employee';
  if (route.name === 'employee-edit') return 'Edit employee';
  if (route.name === 'pre-award-expenses') return 'Pre-award expenses';
  if (route.name === 'project-expenses') return 'Project costs';
  if (route.name === 'pre-award-expense-new' || route.name === 'project-expense-new') return 'New expense';
  if (route.name === 'expense-edit') return 'Modify expense';
  if (route.name === 'expense-setup') return 'Expense setup';
  if (route.name === 'site-purchases') return 'Site engineer purchases';
  if (route.name === 'site-purchase-new') return 'New site purchase';
  if (route.name === 'site-purchase-edit') return 'Site purchase ledger';
  if (route.name === 'corporate-purchases') return 'Corporate purchases';
  if (route.name === 'corporate-purchase-new') return 'New corporate purchase';
  if (route.name === 'corporate-purchase-edit') return 'Corporate purchase';
  if (route.path === '/admin/access') return 'Access control';
  return route.path.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Overview';
});

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed, 'mobile-nav-open': mobileOpen }">
    <aside class="sidebar">
      <div class="sidebar-head">
        <BrandMark :compact="collapsed" inverse />
        <button class="icon-button sidebar-close-mobile" aria-label="Close menu" @click="mobileOpen = false"><X :size="19" /></button>
      </div>
      <SideNavigation :collapsed="collapsed" @navigate="mobileOpen = false" />
      <div class="sidebar-foot">
        <div class="help-card">
          <span class="help-icon">?</span>
          <div class="nav-label"><strong>Need help?</strong><small>Read the quick guide</small></div>
        </div>
        <button class="collapse-button" @click="collapsed = !collapsed">
          <PanelLeftClose v-if="!collapsed" :size="17" />
          <PanelLeftOpen v-else :size="17" />
          <span class="nav-label">Collapse menu</span>
        </button>
      </div>
    </aside>
    <button class="sidebar-scrim" aria-label="Close navigation" @click="mobileOpen = false"></button>

    <main class="main-area">
      <header class="topbar">
        <button class="icon-button mobile-menu" aria-label="Open navigation" @click="mobileOpen = true"><Menu :size="21" /></button>
        <div class="page-heading">
          <p>Project management</p>
          <h1>{{ title }}</h1>
        </div>
        <div class="topbar-actions">
          <label class="global-search">
            <Search :size="17" />
            <input type="search" placeholder="Search anything…" />
            <kbd>⌘ K</kbd>
          </label>
          <button class="icon-button notification" aria-label="Notifications"><Bell :size="19" /><span></span></button>
          <div class="profile-wrap">
            <button class="profile-button" @click="profileOpen = !profileOpen">
              <span class="avatar">SR</span>
              <span class="profile-copy"><strong>{{ auth.user?.name }}</strong><small>{{ auth.user?.role.name }}</small></span>
              <ChevronDown :size="15" />
            </button>
            <div v-if="profileOpen" class="profile-menu">
              <button>My profile</button>
              <button>Account settings</button>
              <hr />
              <button class="danger" @click="logout">Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <div class="page-content"><RouterView /></div>
    </main>
  </div>
</template>
