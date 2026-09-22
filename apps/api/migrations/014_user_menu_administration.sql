CREATE TABLE IF NOT EXISTS app_user_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  allowed TINYINT(1) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_permission FOREIGN KEY (permission_id) REFERENCES app_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_navigation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_key VARCHAR(80) NULL,
  parent_id BIGINT UNSIGNED NULL,
  permission_id BIGINT UNSIGNED NULL,
  label VARCHAR(100) NOT NULL,
  route VARCHAR(160) NULL,
  icon VARCHAR(60) NOT NULL DEFAULT 'Circle',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_navigation_menu_key (menu_key),
  KEY ix_navigation_parent_sort (parent_id, sort_order),
  CONSTRAINT fk_navigation_parent FOREIGN KEY (parent_id) REFERENCES app_navigation_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_navigation_permission FOREIGN KEY (permission_id) REFERENCES app_permissions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('admin.users.view', 'View users', 'Administration', 'View users and their assigned roles and projects'),
  ('admin.users.manage', 'Manage users', 'Administration', 'Create users and change user details, roles, status, and project access'),
  ('admin.users.delete', 'Delete users', 'Administration', 'Delete non-programmer user accounts'),
  ('admin.menus.view', 'View menu setup', 'Administration', 'View application menu configuration and menu access'),
  ('admin.menus.manage', 'Manage menu setup', 'Administration', 'Create and change menus and group or user menu access')
ON DUPLICATE KEY UPDATE name = VALUES(name), module = VALUES(module), description = VALUES(description);

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
  FROM app_roles r
  JOIN app_permissions p ON p.permission_key IN (
    'admin.users.view', 'admin.users.manage', 'admin.users.delete',
    'admin.menus.view', 'admin.menus.manage', 'admin.access.manage'
  )
 WHERE r.role_key IN ('programmer', 'admin')
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

INSERT INTO app_navigation_items (menu_key, label, route, icon, sort_order) VALUES
  ('overview', 'Overview', '/dashboard', 'LayoutDashboard', 10),
  ('projects', 'Projects', NULL, 'BriefcaseBusiness', 20),
  ('expenses', 'Expenses', NULL, 'ReceiptText', 30),
  ('procurement', 'Procurement', NULL, 'ShoppingCart', 40),
  ('workforce', 'Workforce', NULL, 'HardHat', 50),
  ('finance', 'Finance', NULL, 'Landmark', 60),
  ('reports', 'Reports', '/reports', 'ChartNoAxesCombined', 70),
  ('administration', 'Administration', NULL, 'Settings2', 80)
ON DUPLICATE KEY UPDATE label = VALUES(label), route = VALUES(route), icon = VALUES(icon), sort_order = VALUES(sort_order);

INSERT INTO app_navigation_items (menu_key, parent_id, permission_id, label, route, icon, sort_order)
SELECT seed.menu_key, parent.id, permission.id, seed.label, seed.route, seed.icon, seed.sort_order
  FROM (
    SELECT 'projects.all' menu_key, 'projects' parent_key, 'projects.view' permission_key, 'All projects' label, '/projects' route, 'FolderKanban' icon, 10 sort_order UNION ALL
    SELECT 'projects.sites', 'projects', 'project_sites.view', 'Project sites', '/projects/sites', 'MapPinned', 20 UNION ALL
    SELECT 'projects.assignments', 'projects', 'assignments.view', 'Team assignments', '/projects/assignments', 'UsersRound', 30 UNION ALL
    SELECT 'expenses.costs', 'expenses', 'expenses.view', 'Project Costs', '/expenses/project-costs', 'CircleDollarSign', 10 UNION ALL
    SELECT 'expenses.setup', 'expenses', 'expense_setup.view', 'Expense setup', '/expenses/setup', 'ListTree', 20 UNION ALL
    SELECT 'procurement.local', 'procurement', 'menu.local.purchase.view', 'Local purchase', '/purchases/local', 'ShoppingBag', 10 UNION ALL
    SELECT 'procurement.site', 'procurement', 'site_purchases.view', 'Site engineer purchases', '/purchases/site-engineer', 'UserRoundCog', 20 UNION ALL
    SELECT 'procurement.corporate', 'procurement', 'corporate_purchases.view', 'Corporate purchase', '/purchases/corporate', 'Building2', 30 UNION ALL
    SELECT 'procurement.transfers', 'procurement', 'corporate_transfers.view', 'Corporate transfer', '/purchases/transfers', 'ArrowLeftRight', 40 UNION ALL
    SELECT 'procurement.suppliers', 'procurement', 'master_data.view', 'Suppliers', '/suppliers', 'Truck', 50 UNION ALL
    SELECT 'workforce.employees', 'workforce', 'employees.view', 'Employees', '/workforce/employees', 'UserRoundCog', 10 UNION ALL
    SELECT 'workforce.masons', 'workforce', 'menu.mason.raj.mistry.entry.view', 'Masons & teams', '/workforce/masons', 'UsersRound', 20 UNION ALL
    SELECT 'workforce.payroll', 'workforce', 'menu.mistry.payment.view', 'Salary & loans', '/workforce/payroll', 'WalletCards', 30 UNION ALL
    SELECT 'finance.bills', 'finance', 'menu.eng.deposit.view', 'Bills & deposits', '/finance/bills', 'Files', 10 UNION ALL
    SELECT 'finance.loans', 'finance', 'menu.loan.view', 'Loans', '/finance/loans', 'HandCoins', 20 UNION ALL
    SELECT 'finance.banks', 'finance', 'menu.bank.setup.view', 'Banks', '/finance/banks', 'Landmark', 30 UNION ALL
    SELECT 'admin.users', 'administration', 'admin.users.view', 'User setup', '/admin/users', 'UsersRound', 10 UNION ALL
    SELECT 'admin.access', 'administration', 'admin.access.manage', 'Access control', '/admin/access', 'ShieldCheck', 20 UNION ALL
    SELECT 'admin.menus', 'administration', 'admin.menus.view', 'Menu setup', '/admin/menus', 'PanelLeft', 30 UNION ALL
    SELECT 'admin.master', 'administration', 'master_data.view', 'Master setup', '/admin/master-data', 'Database', 40
  ) seed
  JOIN app_navigation_items parent ON parent.menu_key = seed.parent_key
  LEFT JOIN app_permissions permission ON permission.permission_key = seed.permission_key
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), permission_id = VALUES(permission_id), label = VALUES(label),
  route = VALUES(route), icon = VALUES(icon), sort_order = VALUES(sort_order);
