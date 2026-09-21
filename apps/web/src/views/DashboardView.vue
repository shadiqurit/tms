<script setup lang="ts">
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, CircleDollarSign, MapPinned, Plus, ReceiptText } from 'lucide-vue-next';

const recentProjects = [
  { code: 'PEDP4/WB-1605', name: 'Wash Block Construction · Package 2', location: 'Dinajpur · Setabganj & Kaharole', sites: 25, value: '৳22.83M', progress: 78, tone: 'emerald' },
  { code: 'PEDB4/WB-1803', name: 'Wash Block Construction · Package 3', location: 'Dinajpur · Setabganj & Kaharole', sites: 18, value: '৳23.86M', progress: 64, tone: 'blue' },
  { code: 'WB-1014', name: 'Two-storey RCC Wash Blocks', location: 'Dinajpur · 3 upazilas', sites: 16, value: '৳16.79M', progress: 87, tone: 'amber' },
  { code: 'PEDB4/WB-1602', name: 'Combined RCC Wash Blocks', location: 'Dinajpur', sites: 16, value: '৳22.80M', progress: 56, tone: 'purple' },
];
</script>

<template>
  <section class="dashboard">
    <div class="welcome-row">
      <div><p>Here’s what’s happening across your projects today.</p></div>
      <div class="welcome-actions">
        <button class="secondary-button"><CalendarDays :size="17" /> September 2026</button>
        <button class="primary-button"><Plus :size="18" /> New expense</button>
      </div>
    </div>

    <div class="stat-grid">
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon green"><Building2 :size="20" /></span><span class="trend positive"><ArrowUpRight :size="13" /> 2 active</span></div>
        <p>Total projects</p><strong>10</strong><small>৳177.19M contracted value</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon blue"><MapPinned :size="20" /></span><span class="trend positive"><ArrowUpRight :size="13" /> 8 this year</span></div>
        <p>Project sites</p><strong>93</strong><small>Across 4 districts</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon amber"><ReceiptText :size="20" /></span><span class="trend neutral">September</span></div>
        <p>Recorded expenses</p><strong>৳5.07M</strong><small>Pre-award & project costs</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon violet"><CircleDollarSign :size="20" /></span><span class="trend negative"><ArrowDownRight :size="13" /> 3.4%</span></div>
        <p>Material purchases</p><strong>৳27.08M</strong><small>2,759 purchase lines</small>
      </article>
    </div>

    <div class="dashboard-grid">
      <article class="panel project-panel">
        <div class="panel-heading">
          <div><h2>Active projects</h2><p>Progress and site coverage</p></div>
          <RouterLink to="/projects">View all <ArrowRight :size="15" /></RouterLink>
        </div>
        <div class="project-list">
          <div v-for="project in recentProjects" :key="project.code" class="project-row">
            <span class="project-avatar" :class="project.tone">{{ project.code.slice(0, 2) }}</span>
            <div class="project-main"><strong>{{ project.name }}</strong><small>{{ project.code }} · {{ project.location }}</small></div>
            <div class="project-sites"><strong>{{ project.sites }}</strong><small>sites</small></div>
            <div class="project-value"><strong>{{ project.value }}</strong><small>contract</small></div>
            <div class="progress-wrap"><div><span>{{ project.progress }}%</span><span>complete</span></div><div class="progress-track"><i :style="{ width: `${project.progress}%` }"></i></div></div>
          </div>
        </div>
      </article>

      <article class="panel spend-panel">
        <div class="panel-heading"><div><h2>Expense mix</h2><p>Current recorded spend</p></div><button class="more-button">•••</button></div>
        <div class="donut-area">
          <div class="donut"><div><strong>৳5.07M</strong><span>Total</span></div></div>
          <div class="legend">
            <div><i class="local"></i><span>Project costs</span><strong>61%</strong></div>
            <div><i class="corp"></i><span>Materials</span><strong>26%</strong></div>
            <div><i class="pre"></i><span>Pre-award</span><strong>13%</strong></div>
          </div>
        </div>
        <RouterLink to="/expenses/project" class="panel-action">Open expense register <ArrowRight :size="15" /></RouterLink>
      </article>
    </div>

    <article class="panel activity-panel">
      <div class="panel-heading"><div><h2>Recent activity</h2><p>Latest updates across the workspace</p></div><button class="filter-button">All activity</button></div>
      <div class="activity-list">
        <div><span class="activity-icon expense"><ReceiptText :size="17" /></span><p><strong>Project expense updated</strong><small>Construction of improved latrine · Bochaganj</small></p><b>৳379,000</b><time>12 min ago</time></div>
        <div><span class="activity-icon site"><MapPinned :size="17" /></span><p><strong>New project site added</strong><small>Prankrishnapur Government Primary School</small></p><b>Site #96</b><time>2 hours ago</time></div>
        <div><span class="activity-icon purchase"><Building2 :size="17" /></span><p><strong>Corporate purchase approved</strong><small>Material allocation · Package WB-1803</small></p><b>Approved</b><time>Yesterday</time></div>
      </div>
    </article>
  </section>
</template>
