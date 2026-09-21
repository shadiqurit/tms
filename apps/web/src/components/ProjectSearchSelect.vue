<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-vue-next';
interface ProjectChoice { id: number; code: string; tenderId: string; name: string; location: string }

const props = defineProps<{ modelValue: number; projects: ProjectChoice[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const root = ref<HTMLElement>();
const input = ref<HTMLInputElement>();
const open = ref(false);
const query = ref('');
const activeIndex = ref(0);

const selected = computed(() => props.projects.find((project) => project.id === props.modelValue));
const selectedLabel = computed(() => selected.value ? `${selected.value.code} — ${selected.value.name}` : '');
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term || query.value === selectedLabel.value) return props.projects;
  return props.projects.filter((project) =>
    [project.code, project.tenderId, project.name, project.location].some((value) => value.toLowerCase().includes(term)),
  );
});

watch(selectedLabel, (label) => { if (!open.value) query.value = label; }, { immediate: true });
watch(filtered, () => { activeIndex.value = 0; });

function handleOutside(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close();
}
onMounted(() => document.addEventListener('pointerdown', handleOutside, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutside, true));

function show() {
  open.value = true;
  query.value = '';
  activeIndex.value = Math.max(0, filtered.value.findIndex((project) => project.id === props.modelValue));
  nextTick(() => input.value?.focus());
}

function close() {
  open.value = false;
  query.value = selectedLabel.value;
}

function choose(project: ProjectChoice) {
  emit('update:modelValue', project.id);
  query.value = `${project.code} — ${project.name}`;
  open.value = false;
}

function clear() {
  emit('update:modelValue', 0);
  query.value = '';
  open.value = true;
  nextTick(() => input.value?.focus());
}

function onInput() {
  if (query.value !== selectedLabel.value) emit('update:modelValue', 0);
}

function keydown(event: KeyboardEvent) {
  if (!open.value && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
    event.preventDefault();
    show();
    return;
  }
  if (!open.value) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter' && filtered.value[activeIndex.value]) {
    event.preventDefault();
    choose(filtered.value[activeIndex.value]!);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}
</script>

<template>
  <div ref="root" class="project-combobox" :class="{ open }" @keydown="keydown">
    <Building2 :size="17" />
    <input
      ref="input"
      v-model="query"
      role="combobox"
      autocomplete="off"
      aria-label="Search and select project"
      :aria-expanded="open"
      :placeholder="open ? 'Search by package, tender, name or location…' : 'Select a project'"
      @focus="show"
      @input="onInput"
    />
    <button v-if="modelValue && open" type="button" class="combo-clear" aria-label="Clear selection" @click.stop="clear"><X :size="15" /></button>
    <button type="button" class="combo-toggle" aria-label="Open project options" @click.stop="open ? close() : show()"><ChevronDown :size="16" /></button>

    <div v-if="open" class="combo-menu" role="listbox">
      <div class="combo-search-hint"><Search :size="14" /><span>{{ query ? `${filtered.length} matching projects` : `${projects.length} projects available` }}</span></div>
      <button
        v-for="(project, index) in filtered"
        :key="project.id"
        type="button"
        role="option"
        class="combo-option"
        :class="{ active: index === activeIndex, selected: project.id === modelValue }"
        :aria-selected="project.id === modelValue"
        @mouseenter="activeIndex = index"
        @mousedown.prevent="choose(project)"
      >
        <span class="combo-project-mark">{{ project.code.slice(0, 2) }}</span>
        <span><strong>{{ project.code }}</strong><small>{{ project.name }}</small><em>{{ project.location }} · Tender {{ project.tenderId }}</em></span>
        <Check v-if="project.id === modelValue" :size="16" />
      </button>
      <div v-if="filtered.length === 0" class="combo-empty"><Search :size="18" /><span>No matching project</span><small>Try the package number, project name, or location.</small></div>
    </div>
  </div>
</template>
