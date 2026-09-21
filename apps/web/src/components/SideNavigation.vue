<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDown } from 'lucide-vue-next';
import { navigation } from '../data/navigation';
import AppIcon from './AppIcon.vue';

defineProps<{ collapsed: boolean }>();
const emit = defineEmits<{ navigate: [] }>();
const route = useRoute();
const openGroups = ref<number[]>([]);

function containsRoute(item: typeof navigation[number]) {
  return item.route === route.path || item.children?.some((child) => child.route === route.path);
}

watch(() => route.path, () => {
  const active = navigation.find((item) => containsRoute(item));
  if (active?.children && !openGroups.value.includes(active.id)) openGroups.value.push(active.id);
}, { immediate: true });

function toggle(id: number) {
  openGroups.value = openGroups.value.includes(id)
    ? openGroups.value.filter((item) => item !== id)
    : [...openGroups.value, id];
}

const isOpen = computed(() => (id: number) => openGroups.value.includes(id));
</script>

<template>
  <nav class="side-nav" aria-label="Main navigation">
    <template v-for="item in navigation" :key="item.id">
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
