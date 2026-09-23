CREATE TABLE IF NOT EXISTS app_engineer_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  opened_on DATE NULL,
  legacy_amount DECIMAL(18,2) NULL,
  legacy_created_by BIGINT NULL,
  legacy_created_at DATETIME NULL,
  legacy_updated_by BIGINT NULL,
  legacy_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_engineer_accounts_company_legacy (company_id, legacy_id),
  UNIQUE KEY uq_engineer_accounts_employee_project (company_id, employee_id, project_id),
  KEY ix_engineer_accounts_project (project_id),
  CONSTRAINT fk_engineer_accounts_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_engineer_accounts_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_engineer_accounts_employee FOREIGN KEY (employee_id) REFERENCES app_employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_engineer_deposits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  site_id BIGINT UNSIGNED NULL,
  deposit_date DATE NULL,
  amount DECIMAL(18,2) NULL,
  reference_no VARCHAR(120) NULL,
  notes VARCHAR(500) NULL,
  legacy_created_by BIGINT NULL,
  legacy_created_at DATETIME NULL,
  legacy_updated_by BIGINT NULL,
  legacy_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_engineer_deposits_legacy (legacy_id),
  KEY ix_engineer_deposits_account_date (account_id, deposit_date),
  CONSTRAINT fk_engineer_deposits_account FOREIGN KEY (account_id) REFERENCES app_engineer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_engineer_deposits_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_engineer_deposits_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('engineer_deposits.view', 'View engineer deposits and balances', 'Finance', 'View deposits, purchases, expenses, and running engineer balances'),
  ('engineer_deposits.manage', 'Manage engineer deposits', 'Finance', 'Create and modify site-engineer deposit transactions'),
  ('engineer_deposits.delete', 'Delete engineer deposits', 'Finance', 'Delete engineer deposit transactions with an audit trail')
ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module), description=VALUES(description);

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT rp.role_id, target.id, 1
  FROM app_role_permissions rp
  JOIN app_permissions source ON source.id = rp.permission_id
  JOIN app_permissions target ON target.permission_key IN ('engineer_deposits.view', 'engineer_deposits.manage')
 WHERE source.permission_key = 'menu.eng.deposit.view' AND rp.allowed = 1
ON DUPLICATE KEY UPDATE allowed = 1;

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
  FROM app_roles r
  JOIN app_permissions p ON p.permission_key IN ('engineer_deposits.view', 'engineer_deposits.manage', 'engineer_deposits.delete')
 WHERE r.role_key = 'programmer'
ON DUPLICATE KEY UPDATE allowed = 1;

UPDATE app_menu_items
   SET route = '/finance/engineer-deposits',
       permission_id = (SELECT id FROM app_permissions WHERE permission_key = 'engineer_deposits.view')
 WHERE legacy_id = 21;

UPDATE app_navigation_items
   SET label = 'Engineer deposits',
       route = '/finance/engineer-deposits',
       icon = 'WalletCards',
       permission_id = (SELECT id FROM app_permissions WHERE permission_key = 'engineer_deposits.view')
 WHERE menu_key = 'finance.bills';
