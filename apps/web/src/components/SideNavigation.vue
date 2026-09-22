<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDown } from 'lucide-vue-next';
import { navigation } from '../data/navigation';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { NavItem } from '../types';
import AppIcon from './AppIcon.vue';

defineProps<{ collapsed: boolean }>();
const emit = defineEmits<{ navigate: [] }>();
const route = useRoute();
const auth = useAuthStore();
const openGroups = ref<number[]>([]);
const configuredNavigation = ref<NavItem[]>(navigation);

function allowed(item: NavItem) { return auth.hasPermission(item.permission); }
const visibleNavigation = computed<NavItem[]>(() => configuredNavigation.value.flatMap((item) => {
  if (!item.children) return allowed(item) ? [item] : [];
  const children = item.children.filter(allowed);
  return children.length && allowed(item) ? [{ ...item, children }] : [];
}));

function containsRoute(item: NavItem) {
  return item.route === route.path || item.children?.some((child) => child.route === route.path);
}

watch(() => route.path, () => {
  const active = visibleNavigation.value.find((item) => containsRoute(item));
  if (active?.children && !openGroups.value.includes(active.id)) openGroups.value.push(active.id);
}, { immediate: true });

function toggle(id: number) {
  openGroups.value = openGroups.value.includes(id)
    ? openGroups.value.filter((item) => item !== id)
    : [...openGroups.value, id];
}

const isOpen = computed(() => (id: number) => openGroups.value.includes(id));

async function loadNavigation() {
  try {
    const result = await api<{ items: NavItem[] }>('/navigation');
    configuredNavigation.value = result.items;
  } catch {
    configuredNavigation.value = navigation;
  }
}
function navigationChanged() { void loadNavigation(); }
onMounted(() => {
  void loadNavigation();
  window.addEventListener('tms:navigation-changed', navigationChanged);
});
onBeforeUnmount(() => window.removeEventListener('tms:navigation-changed', navigationChanged));
watch(() => auth.permissions.join('|'), () => void loadNavigation());
</script>

<template>
  <nav class="side-nav" aria-label="Main navigation">
    <template v-for="item in visibleNavigation" :key="item.id">
      <RouterLink
        v-if="!item.children"
        :to="item.route!"
        class="nav-link"
        :title="collapsed ? item.label : undefined"
        @click="emit('navigate')"
      >
        <AppIcon :name="item.icon" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </RouterLink>
      <div v-else class="nav-group" :class="{ active: containsRoute(item), open: isOpen(item.id) }">
        <button class="nav-link nav-button" :title="collapsed ? item.label : undefined" @click="toggle(item.id)">
          <AppIcon :name="item.icon" />
          <span class="nav-label">{{ item.label }}</span>
          <ChevronDown class="nav-chevron" :size="15" />
        </button>
        <div class="nav-children">
          <RouterLink
            v-for="child in item.children"
            :key="child.id"
            :to="child.route!"
            class="nav-child"
            @click="emit('navigate')"
          >
            <span class="nav-dot"></span>
            <span>{{ child.label }}</span>
            <span v-if="child.badge" class="nav-badge">{{ child.badge }}</span>
          </RouterLink>
        </div>
      </div>
    </template>
  </nav>
</template>
