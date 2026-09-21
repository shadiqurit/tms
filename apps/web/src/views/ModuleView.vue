<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Blocks, Construction } from 'lucide-vue-next';

const route = useRoute();
const name = computed(() => route.path.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Module');
</script>

<template>
  <section class="module-placeholder panel">
    <span><Construction :size="28" /></span>
    <p>Next redevelopment module</p>
    <h2>{{ name }}</h2>
    <p>This route is already permission-aware and ready for its Oracle workflow to be migrated.</p>
    <RouterLink to="/dashboard"><ArrowLeft :size="16" /> Back to overview</RouterLink>
    <div class="placeholder-mark"><Blocks :size="110" /></div>
  </section>
</template>
