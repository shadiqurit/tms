import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import LoginView from './views/LoginView.vue';
import AppLayout from './layouts/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    {
      path: '/',
      component: AppLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
        { path: 'projects', name: 'projects', component: () => import('./views/ProjectsView.vue') },
        { path: 'projects/new', name: 'project-new', component: () => import('./views/ProjectFormView.vue') },
        { path: 'projects/sites', name: 'project-sites', component: () => import('./views/ProjectSitesView.vue') },
        { path: 'projects/sites/new', name: 'project-site-new', component: () => import('./views/ProjectSiteFormView.vue') },
        { path: 'projects/sites/:id/edit', name: 'project-site-edit', component: () => import('./views/ProjectSiteFormView.vue') },
        { path: 'projects/assignments', name: 'assignments', component: () => import('./views/AssignmentsView.vue') },
        { path: 'projects/assignments/new', name: 'assignment-new', component: () => import('./views/AssignmentFormView.vue') },
        { path: 'projects/assignments/:employeeId/edit', name: 'assignment-edit', component: () => import('./views/AssignmentFormView.vue') },
        { path: 'projects/:id/edit', name: 'project-edit', component: () => import('./views/ProjectFormView.vue') },
        { path: 'workforce/employees', name: 'employees', component: () => import('./views/EmployeesView.vue') },
        { path: 'workforce/employees/new', name: 'employee-new', component: () => import('./views/EmployeeFormView.vue') },
        { path: 'workforce/employees/:id/edit', name: 'employee-edit', component: () => import('./views/EmployeeFormView.vue') },
        { path: 'workforce/engineers', redirect: '/workforce/employees' },
        { path: 'expenses/pre-award', name: 'pre-award-expenses', component: () => import('./views/ExpensesView.vue') },
        { path: 'expenses/pre-award/new', name: 'pre-award-expense-new', component: () => import('./views/ExpenseFormView.vue') },
        { path: 'expenses/project', name: 'project-expenses', component: () => import('./views/ExpensesView.vue') },
        { path: 'expenses/project/new', name: 'project-expense-new', component: () => import('./views/ExpenseFormView.vue') },
        { path: 'expenses/setup', name: 'expense-setup', component: () => import('./views/ExpenseSetupView.vue') },
        { path: 'purchases/site-engineer', name: 'site-purchases', component: () => import('./views/SitePurchasesView.vue') },
        { path: 'purchases/site-engineer/new', name: 'site-purchase-new', component: () => import('./views/SitePurchaseFormView.vue') },
        { path: 'purchases/site-engineer/:id/edit', name: 'site-purchase-edit', component: () => import('./views/SitePurchaseFormView.vue') },
        { path: 'purchases/corporate', name: 'corporate-purchases', component: () => import('./views/CorporatePurchasesView.vue') },
        { path: 'purchases/corporate/new', name: 'corporate-purchase-new', component: () => import('./views/CorporatePurchaseFormView.vue') },
        { path: 'purchases/corporate/:id/edit', name: 'corporate-purchase-edit', component: () => import('./views/CorporatePurchaseFormView.vue') },
        { path: 'expenses/site-purchases', redirect: '/purchases/site-engineer' },
        { path: 'expenses/site-purchases/new', redirect: '/purchases/site-engineer/new' },
        { path: 'expenses/site-purchases/:id/edit', redirect: (to) => `/purchases/site-engineer/${to.params.id}/edit` },
        { path: 'expenses/:id/edit', name: 'expense-edit', component: () => import('./views/ExpenseFormView.vue') },
        { path: 'admin/access', name: 'access', component: () => import('./views/AccessControlView.vue') },
        { path: ':pathMatch(.*)*', name: 'module', component: () => import('./views/ModuleView.vue') },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.authenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.authenticated) return { name: 'dashboard' };
});

export default router;
