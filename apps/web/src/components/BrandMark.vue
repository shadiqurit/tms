<script setup lang="ts">
defineProps<{ compact?: boolean; inverse?: boolean }>();
</script>

<template>
  <div class="brand" :class="{ compact, inverse }">
    <span class="brand-mark" aria-hidden="true">
      <span class="brand-building"></span>
      <span class="brand-path"></span>
    </span>
    <span v-if="!compact" class="brand-copy">
      <strong>TMS</strong>
      <small>Project operations</small>
    </span>
  </div>
</template>
