ALTER TABLE app_expense_types
  ADD COLUMN default_amount DECIMAL(18,2) NULL AFTER default_rate,
  ADD COLUMN default_return_amount DECIMAL(18,2) NULL AFTER default_amount;

CREATE TABLE IF NOT EXISTS app_suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(120) NULL,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(500) NULL,
  contact_person VARCHAR(120) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(120) NULL,
  supplier_type VARCHAR(20) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_company_legacy (company_id, legacy_id),
  KEY ix_suppliers_company_name (company_id, name),
  CONSTRAINT fk_suppliers_company FOREIGN KEY (company_id) REFERENCES app_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(30) NULL,
  description VARCHAR(160) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_company_legacy (company_id, legacy_id),
  CONSTRAINT fk_units_company FOREIGN KEY (company_id) REFERENCES app_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(200) NOT NULL,
  details VARCHAR(300) NULL,
  material_type VARCHAR(80) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_materials_company_legacy (company_id, legacy_id),
  KEY ix_materials_company_name (company_id, name),
  CONSTRAINT fk_materials_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_materials_unit FOREIGN KEY (unit_id) REFERENCES app_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_engineer_expense_heads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(220) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_engineer_heads_company_legacy (company_id, legacy_id),
  KEY ix_engineer_heads_company_name (company_id, name),
  CONSTRAINT fk_engineer_heads_company FOREIGN KEY (company_id) REFERENCES app_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_expense_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(100) NULL,
  pay_to VARCHAR(160) NULL,
  payee_address VARCHAR(300) NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(40) NULL,
  reference_no VARCHAR(120) NULL,
  reference_date DATE NULL,
  notes TEXT NULL,
  status ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'posted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_payments_company_legacy (company_id, legacy_id),
  KEY ix_expense_payments_project_date (project_id, payment_date),
  CONSTRAINT fk_expense_payments_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_expense_payments_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_expense_payment_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  expense_type_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(18,4) NULL,
  unit_name VARCHAR(40) NULL,
  amount DECIMAL(18,2) NULL,
  discount DECIMAL(18,2) NULL,
  returned_amount DECIMAL(18,2) NULL,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  return_date DATE NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_payment_lines_legacy (legacy_id),
  KEY ix_expense_payment_lines_payment (payment_id),
  KEY ix_expense_payment_lines_type (expense_type_id),
  CONSTRAINT fk_expense_lines_payment FOREIGN KEY (payment_id) REFERENCES app_expense_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_lines_type FOREIGN KEY (expense_type_id) REFERENCES app_expense_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_site_purchases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  purchase_no VARCHAR(100) NULL,
  local_supplier VARCHAR(200) NULL,
  supplier_address VARCHAR(500) NULL,
  purchase_date DATE NOT NULL,
  purchase_type ENUM('local', 'corporate') NOT NULL DEFAULT 'local',
  challan_no VARCHAR(120) NULL,
  challan_date DATE NULL,
  notes TEXT NULL,
  status ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'posted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_purchases_company_legacy (company_id, legacy_id),
  KEY ix_site_purchases_project_employee (project_id, employee_id),
  CONSTRAINT fk_site_purchases_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_site_purchases_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_site_purchases_employee FOREIGN KEY (employee_id) REFERENCES app_employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_site_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES app_suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_site_purchase_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  purchase_id BIGINT UNSIGNED NOT NULL,
  material_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  site_id BIGINT UNSIGNED NULL,
  entry_date DATE NOT NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  discount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_purchase_materials_legacy (legacy_id),
  KEY ix_site_purchase_materials_purchase_date (purchase_id, entry_date),
  CONSTRAINT fk_site_materials_purchase FOREIGN KEY (purchase_id) REFERENCES app_site_purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_site_materials_material FOREIGN KEY (material_id) REFERENCES app_materials(id) ON DELETE RESTRICT,
  CONSTRAINT fk_site_materials_unit FOREIGN KEY (unit_id) REFERENCES app_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_site_materials_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_site_purchase_expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  purchase_id BIGINT UNSIGNED NOT NULL,
  expense_head_id BIGINT UNSIGNED NULL,
  site_id BIGINT UNSIGNED NULL,
  entry_date DATE NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_purchase_expenses_legacy (legacy_id),
  KEY ix_site_purchase_expenses_purchase_date (purchase_id, entry_date),
  CONSTRAINT fk_site_expenses_purchase FOREIGN KEY (purchase_id) REFERENCES app_site_purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_site_expenses_head FOREIGN KEY (expense_head_id) REFERENCES app_engineer_expense_heads(id) ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('expenses.view', 'View general expenses', 'Expenses', 'View pre-award and project expense vouchers'),
  ('expenses.manage', 'Create and modify general expenses', 'Expenses', 'Create and update expense vouchers and lines'),
  ('expenses.delete', 'Delete general expenses', 'Expenses', 'Delete expense vouchers after a reference check'),
  ('expense_setup.view', 'View expense setup', 'Expenses', 'View expense types and site-engineer expense heads'),
  ('expense_setup.manage', 'Manage expense setup', 'Expenses', 'Create and modify expense types and site-engineer expense heads'),
  ('expense_setup.delete', 'Delete unreferenced expense setup', 'Expenses', 'Delete only setup records without referenced entries'),
  ('site_purchases.view', 'View site engineer purchases', 'Procurement', 'View site-engineer material purchases and other expenses'),
  ('site_purchases.manage', 'Create and modify site engineer purchases', 'Procurement', 'Manage purchase headers, materials, and expense entries'),
  ('site_purchases.delete', 'Delete site engineer purchases', 'Procurement', 'Delete only unreferenced purchase records')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  module = VALUES(module),
  description = VALUES(description);
