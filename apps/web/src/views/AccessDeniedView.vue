<script setup lang="ts">
import { ArrowLeft, ShieldX } from 'lucide-vue-next';
</script>

<template>
  <section class="access-denied panel">
    <span><ShieldX :size="30" /></span>
    <h2>Access denied</h2>
    <p>Your user role does not have permission to open this module. Ask the system administrator to enable it under Access Control.</p>
    <RouterLink to="/dashboard" class="primary-button"><ArrowLeft :size="16" /> Return to dashboard</RouterLink>
  </section>
</template>
