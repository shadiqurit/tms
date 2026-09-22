import type { NavItem } from '../types';

export const navigation: NavItem[] = [
  { id: 1, label: 'Overview', route: '/dashboard', icon: 'LayoutDashboard' },
  {
    id: 2, label: 'Projects', icon: 'BriefcaseBusiness', children: [
      { id: 21, label: 'All projects', route: '/projects', icon: 'FolderKanban', permission: 'projects.view' },
      { id: 22, label: 'Project sites', route: '/projects/sites', icon: 'MapPinned', badge: '93', permission: 'project_sites.view' },
      { id: 23, label: 'Team assignments', route: '/projects/assignments', icon: 'UsersRound', permission: 'assignments.view' },
    ],
  },
  {
    id: 3, label: 'Expenses', icon: 'ReceiptText', children: [
      { id: 31, label: 'Project Costs', route: '/expenses/project-costs', icon: 'CircleDollarSign', permission: 'expenses.view' },
      { id: 34, label: 'Expense setup', route: '/expenses/setup', icon: 'ListTree', permission: 'expense_setup.view' },
    ],
  },
  {
    id: 4, label: 'Procurement', icon: 'ShoppingCart', children: [
      { id: 41, label: 'Local purchase', route: '/purchases/local', icon: 'ShoppingBag', permission: 'menu.local.purchase.view' },
      { id: 45, label: 'Site engineer purchases', route: '/purchases/site-engineer', icon: 'UserRoundCog', permission: 'site_purchases.view' },
      { id: 42, label: 'Corporate purchase', route: '/purchases/corporate', icon: 'Building2', permission: 'corporate_purchases.view' },
      { id: 43, label: 'Corporate transfer', route: '/purchases/transfers', icon: 'ArrowLeftRight', permission: 'corporate_transfers.view' },
      { id: 44, label: 'Suppliers', route: '/suppliers', icon: 'Truck', permission: 'master_data.view' },
    ],
  },
  {
    id: 5, label: 'Workforce', icon: 'HardHat', children: [
      { id: 51, label: 'Employees', route: '/workforce/employees', icon: 'UserRoundCog', permission: 'employees.view' },
      { id: 52, label: 'Masons & teams', route: '/workforce/masons', icon: 'UsersRound', permission: ['menu.mason.raj.mistry.entry.view', 'menu.mistry.type.view'] },
      { id: 53, label: 'Salary & loans', route: '/workforce/payroll', icon: 'WalletCards', permission: ['menu.mistry.payment.view', 'menu.loan.view'] },
    ],
  },
  {
    id: 6, label: 'Finance', icon: 'Landmark', children: [
      { id: 61, label: 'Bills & deposits', route: '/finance/bills', icon: 'Files', permission: 'menu.eng.deposit.view' },
      { id: 62, label: 'Loans', route: '/finance/loans', icon: 'HandCoins', permission: 'menu.loan.view' },
      { id: 63, label: 'Banks', route: '/finance/banks', icon: 'Landmark', permission: 'menu.bank.setup.view' },
    ],
  },
  { id: 7, label: 'Reports', route: '/reports', icon: 'ChartNoAxesCombined', permission: ['menu.site.enginer.report.view', 'menu.loan.report.view', 'menu.mistry.payment.report.view', 'menu.corporate.reports.view', 'menu.final.reports.view', 'menu.final.summary.view'] },
  {
    id: 8, label: 'Administration', icon: 'Settings2', children: [
      { id: 81, label: 'User setup', route: '/admin/users', icon: 'UsersRound', permission: 'admin.users.view' },
      { id: 82, label: 'Access control', route: '/admin/access', icon: 'ShieldCheck', permission: 'admin.access.manage' },
      { id: 83, label: 'Menu setup', route: '/admin/menus', icon: 'PanelLeft', permission: 'admin.menus.view' },
      { id: 84, label: 'Master setup', route: '/admin/master-data', icon: 'Database', permission: 'master_data.view' },
    ],
  },
];
