import type { NavItem } from '../types';

export const navigation: NavItem[] = [
  { id: 1, label: 'Overview', route: '/dashboard', icon: 'LayoutDashboard' },
  {
    id: 2, label: 'Projects', icon: 'BriefcaseBusiness', children: [
      { id: 21, label: 'All projects', route: '/projects', icon: 'FolderKanban' },
      { id: 22, label: 'Project sites', route: '/projects/sites', icon: 'MapPinned', badge: '93' },
      { id: 23, label: 'Team assignments', route: '/projects/assignments', icon: 'UsersRound' },
    ],
  },
  {
    id: 3, label: 'Expenses', icon: 'ReceiptText', children: [
      { id: 31, label: 'Pre-award costs', route: '/expenses/pre-award', icon: 'FileClock' },
      { id: 32, label: 'Project expenses', route: '/expenses/project', icon: 'CircleDollarSign' },
      { id: 34, label: 'Expense setup', route: '/expenses/setup', icon: 'ListTree' },
    ],
  },
  {
    id: 4, label: 'Procurement', icon: 'ShoppingCart', children: [
      { id: 41, label: 'Local purchase', route: '/purchases/local', icon: 'ShoppingBag' },
      { id: 45, label: 'Site engineer purchases', route: '/purchases/site-engineer', icon: 'UserRoundCog' },
      { id: 42, label: 'Corporate purchase', route: '/purchases/corporate', icon: 'Building2' },
      { id: 43, label: 'Material transfer', route: '/purchases/transfers', icon: 'ArrowLeftRight' },
      { id: 44, label: 'Suppliers', route: '/suppliers', icon: 'Truck' },
    ],
  },
  {
    id: 5, label: 'Workforce', icon: 'HardHat', children: [
      { id: 51, label: 'Employees', route: '/workforce/employees', icon: 'UserRoundCog' },
      { id: 52, label: 'Masons & teams', route: '/workforce/masons', icon: 'UsersRound' },
      { id: 53, label: 'Salary & loans', route: '/workforce/payroll', icon: 'WalletCards' },
    ],
  },
  {
    id: 6, label: 'Finance', icon: 'Landmark', children: [
      { id: 61, label: 'Bills & deposits', route: '/finance/bills', icon: 'Files' },
      { id: 62, label: 'Loans', route: '/finance/loans', icon: 'HandCoins' },
      { id: 63, label: 'Banks', route: '/finance/banks', icon: 'Landmark' },
    ],
  },
  { id: 7, label: 'Reports', route: '/reports', icon: 'ChartNoAxesCombined' },
  {
    id: 8, label: 'Administration', icon: 'Settings2', children: [
      { id: 81, label: 'Users & permissions', route: '/admin/access', icon: 'ShieldCheck' },
      { id: 82, label: 'Menu setup', route: '/admin/menus', icon: 'PanelLeft' },
      { id: 83, label: 'Master data', route: '/admin/master-data', icon: 'Database' },
    ],
  },
];
