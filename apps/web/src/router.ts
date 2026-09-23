import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import LoginView from './views/LoginView.vue';
import AppLayout from './layouts/AppLayout.vue';
import { navigation } from './data/navigation';
import type { NavItem } from './types';

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
        { path: 'projects', name: 'projects', component: () => import('./views/ProjectsView.vue'), meta: { permission: 'projects.view' } },
        { path: 'projects/new', name: 'project-new', component: () => import('./views/ProjectFormView.vue'), meta: { permission: 'projects.manage' } },
        { path: 'projects/sites', name: 'project-sites', component: () => import('./views/ProjectSitesView.vue'), meta: { permission: 'project_sites.view' } },
        { path: 'projects/sites/new', name: 'project-site-new', component: () => import('./views/ProjectSiteFormView.vue'), meta: { permission: 'project_sites.manage' } },
        { path: 'projects/sites/:id/edit', name: 'project-site-edit', component: () => import('./views/ProjectSiteFormView.vue'), meta: { permission: 'project_sites.manage' } },
        { path: 'projects/assignments', name: 'assignments', component: () => import('./views/AssignmentsView.vue'), meta: { permission: 'assignments.view' } },
        { path: 'projects/assignments/new', name: 'assignment-new', component: () => import('./views/AssignmentFormView.vue'), meta: { permission: 'assignments.manage' } },
        { path: 'projects/assignments/:employeeId/edit', name: 'assignment-edit', component: () => import('./views/AssignmentFormView.vue'), meta: { permission: 'assignments.manage' } },
        { path: 'projects/:id/edit', name: 'project-edit', component: () => import('./views/ProjectFormView.vue'), meta: { permission: 'projects.manage' } },
        { path: 'workforce/employees', name: 'employees', component: () => import('./views/EmployeesView.vue'), meta: { permission: 'employees.view' } },
        { path: 'workforce/employees/new', name: 'employee-new', component: () => import('./views/EmployeeFormView.vue'), meta: { permission: 'employees.manage' } },
        { path: 'workforce/employees/:id/edit', name: 'employee-edit', component: () => import('./views/EmployeeFormView.vue'), meta: { permission: 'employees.manage' } },
        { path: 'workforce/engineers', redirect: '/workforce/employees' },
        { path: 'expenses/project-costs', name: 'project-costs', component: () => import('./views/ExpensesView.vue'), meta: { permission: 'expenses.view' } },
        { path: 'expenses/project-costs/new', name: 'project-cost-new', component: () => import('./views/ExpenseFormView.vue'), meta: { permission: 'expenses.manage' } },
        { path: 'expenses/pre-award', redirect: '/expenses/project-costs' },
        { path: 'expenses/pre-award/new', redirect: '/expenses/project-costs/new' },
        { path: 'expenses/project', redirect: '/expenses/project-costs' },
        { path: 'expenses/project/new', redirect: '/expenses/project-costs/new' },
        { path: 'expenses/setup', name: 'expense-setup', component: () => import('./views/ExpenseSetupView.vue'), meta: { permission: 'expense_setup.view' } },
        { path: 'purchases/site-engineer', name: 'site-purchases', component: () => import('./views/SitePurchasesView.vue'), meta: { permission: 'site_purchases.view' } },
        { path: 'purchases/site-engineer/new', name: 'site-purchase-new', component: () => import('./views/SitePurchaseFormView.vue'), meta: { permission: 'site_purchases.manage' } },
        { path: 'purchases/site-engineer/:id/edit', name: 'site-purchase-edit', component: () => import('./views/SitePurchaseFormView.vue'), meta: { permission: 'site_purchases.manage' } },
        { path: 'purchases/corporate', name: 'corporate-purchases', component: () => import('./views/CorporatePurchasesView.vue'), meta: { permission: 'corporate_purchases.view' } },
        { path: 'purchases/corporate/new', name: 'corporate-purchase-new', component: () => import('./views/CorporatePurchaseFormView.vue'), meta: { permission: 'corporate_purchases.manage' } },
        { path: 'purchases/corporate/:id/edit', name: 'corporate-purchase-edit', component: () => import('./views/CorporatePurchaseFormView.vue'), meta: { permission: 'corporate_purchases.manage' } },
        { path: 'purchases/transfers', name: 'corporate-transfers', component: () => import('./views/CorporateTransfersView.vue'), meta: { permission: 'corporate_transfers.view' } },
        { path: 'purchases/transfers/new', name: 'corporate-transfer-new', component: () => import('./views/CorporateTransferFormView.vue'), meta: { permission: 'corporate_transfers.manage' } },
        { path: 'purchases/transfers/:id/edit', name: 'corporate-transfer-edit', component: () => import('./views/CorporateTransferFormView.vue'), meta: { permission: 'corporate_transfers.manage' } },
        { path: 'finance/engineer-deposits', name: 'engineer-deposits', component: () => import('./views/EngineerDepositsView.vue'), meta: { permission: 'engineer_deposits.view' } },
        { path: 'finance/engineer-deposits/:employeeId', name: 'engineer-deposit-ledger', component: () => import('./views/EngineerDepositLedgerView.vue'), meta: { permission: 'engineer_deposits.view' } },
        { path: 'finance/engineer-deposits/:employeeId/:projectId', redirect: (to) => `/finance/engineer-deposits/${to.params.employeeId}` },
        { path: 'finance/bills', redirect: '/finance/engineer-deposits' },
        { path: 'expenses/site-purchases', redirect: '/purchases/site-engineer' },
        { path: 'expenses/site-purchases/new', redirect: '/purchases/site-engineer/new' },
        { path: 'expenses/site-purchases/:id/edit', redirect: (to) => `/purchases/site-engineer/${to.params.id}/edit` },
        { path: 'expenses/:id/edit', name: 'expense-edit', component: () => import('./views/ExpenseFormView.vue'), meta: { permission: 'expenses.manage' } },
        { path: 'admin/users', name: 'users', component: () => import('./views/UserSetupView.vue'), meta: { permission: 'admin.users.view' } },
        { path: 'admin/access', name: 'access', component: () => import('./views/AccessControlView.vue'), meta: { permission: 'admin.access.manage' } },
        { path: 'admin/menus', name: 'menus', component: () => import('./views/MenuSetupView.vue'), meta: { permission: 'admin.menus.view' } },
        { path: 'admin/master-data', name: 'master-data', component: () => import('./views/MasterDataView.vue'), meta: { permission: 'master_data.view' } },
        { path: 'suppliers', redirect: '/admin/master-data', meta: { permission: 'master_data.view' } },
        { path: 'forbidden', name: 'forbidden', component: () => import('./views/AccessDeniedView.vue') },
        { path: ':pathMatch(.*)*', name: 'module', component: () => import('./views/ModuleView.vue') },
      ],
    },
  ],
});

function findNavigationItem(items: NavItem[], path: string): NavItem | undefined {
  for (const item of items) {
    if (item.route === path) return item;
    const child = item.children ? findNavigationItem(item.children, path) : undefined;
    if (child) return child;
  }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.authenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.authenticated) return { name: 'dashboard' };
  if (!to.meta.public && auth.authenticated) {
    try { await auth.ensureSession(); }
    catch { return { name: 'login', query: { redirect: to.fullPath } }; }
    const required = to.meta.permission as string | string[] | undefined;
    if (required && !auth.hasPermission(required)) return { name: 'forbidden' };
    if (to.name === 'module') {
      const item = findNavigationItem(navigation, to.path);
      if (!item || !auth.hasPermission(item.permission)) return { name: 'forbidden' };
    }
  }
});

export default router;
