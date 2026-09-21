CREATE TABLE IF NOT EXISTS app_corporate_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_categories_company_legacy (company_id, legacy_id),
  KEY ix_corporate_categories_company_name (company_id, name),
  CONSTRAINT fk_corporate_categories_company FOREIGN KEY (company_id) REFERENCES app_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_corporate_subcategories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  description VARCHAR(500) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_subcategories_company_legacy (company_id, legacy_id),
  KEY ix_corporate_subcategories_category_name (category_id, name),
  CONSTRAINT fk_corporate_subcategories_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_corporate_subcategories_category FOREIGN KEY (category_id) REFERENCES app_corporate_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_corporate_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(220) NOT NULL,
  description VARCHAR(500) NULL,
  default_price DECIMAL(18,4) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_products_company_legacy (company_id, legacy_id),
  KEY ix_corporate_products_company_name (company_id, name),
  CONSTRAINT fk_corporate_products_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_corporate_products_category FOREIGN KEY (category_id) REFERENCES app_corporate_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_products_unit FOREIGN KEY (unit_id) REFERENCES app_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_corporate_purchases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NULL,
  supplier_id BIGINT UNSIGNED NULL,
  purchase_no VARCHAR(100) NULL,
  local_supplier VARCHAR(200) NULL,
  supplier_address VARCHAR(500) NULL,
  purchase_date DATE NULL,
  purchase_type VARCHAR(50) NULL,
  challan_no VARCHAR(120) NULL,
  challan_date DATE NULL,
  notes TEXT NULL,
  legacy_purchase_group BIGINT NULL,
  status ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'posted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_purchases_company_legacy (company_id, legacy_id),
  KEY ix_corporate_purchases_project_date (project_id, purchase_date),
  CONSTRAINT fk_corporate_purchases_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_corporate_purchases_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_purchases_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES app_suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_corporate_purchase_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  purchase_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  subcategory_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  site_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  discount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_purchase_lines_legacy (legacy_id),
  KEY ix_corporate_purchase_lines_purchase (purchase_id),
  CONSTRAINT fk_corporate_lines_purchase FOREIGN KEY (purchase_id) REFERENCES app_corporate_purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_corporate_lines_category FOREIGN KEY (category_id) REFERENCES app_corporate_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_lines_subcategory FOREIGN KEY (subcategory_id) REFERENCES app_corporate_subcategories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_lines_product FOREIGN KEY (product_id) REFERENCES app_corporate_products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_lines_unit FOREIGN KEY (unit_id) REFERENCES app_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_corporate_lines_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('corporate_purchases.view', 'View corporate purchases', 'Procurement', 'View corporate purchase headers and product lines'),
  ('corporate_purchases.manage', 'Create and modify corporate purchases', 'Procurement', 'Manage corporate purchase headers and product lines'),
  ('corporate_purchases.delete', 'Delete corporate purchases', 'Procurement', 'Delete only corporate purchases without product lines')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  module = VALUES(module),
  description = VALUES(description);

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT rp.role_id, target.id, 1
  FROM app_role_permissions rp
  JOIN app_permissions source ON source.id = rp.permission_id
  JOIN app_permissions target ON target.permission_key IN ('corporate_purchases.view', 'corporate_purchases.manage')
 WHERE source.permission_key = 'menu.corporate.purchase.view' AND rp.allowed = 1
ON DUPLICATE KEY UPDATE allowed = 1;

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
  FROM app_roles r
  JOIN app_permissions p ON p.permission_key IN ('corporate_purchases.view', 'corporate_purchases.manage', 'corporate_purchases.delete')
 WHERE r.role_key = 'programmer'
ON DUPLICATE KEY UPDATE allowed = 1;

UPDATE app_menu_items
   SET route = '/purchases/corporate',
       permission_id = (SELECT id FROM app_permissions WHERE permission_key = 'corporate_purchases.view')
 WHERE legacy_id = 14;
