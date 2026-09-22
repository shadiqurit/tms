CREATE TABLE IF NOT EXISTS app_corporate_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  transfer_no VARCHAR(120) NULL,
  from_project_id BIGINT UNSIGNED NOT NULL,
  from_site_id BIGINT UNSIGNED NULL,
  receive_project_id BIGINT UNSIGNED NOT NULL,
  receive_site_id BIGINT UNSIGNED NULL,
  transfer_date DATE NOT NULL,
  notes TEXT NULL,
  legacy_project_id BIGINT NULL,
  legacy_transfer_group BIGINT NULL,
  engineer_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'posted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_transfers_company_legacy (company_id, legacy_id),
  KEY ix_corporate_transfers_company_date (company_id, transfer_date),
  KEY ix_corporate_transfers_from_project (from_project_id),
  KEY ix_corporate_transfers_receive_project (receive_project_id),
  CONSTRAINT fk_corporate_transfers_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_corporate_transfers_from_project FOREIGN KEY (from_project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfers_from_site FOREIGN KEY (from_site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfers_receive_project FOREIGN KEY (receive_project_id) REFERENCES app_projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfers_receive_site FOREIGN KEY (receive_site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfers_engineer FOREIGN KEY (engineer_id) REFERENCES app_employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_corporate_transfer_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  transfer_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  destination_site_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  other_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
  other_expense DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  transfer_date DATE NULL,
  legacy_project_id BIGINT NULL,
  engineer_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_corporate_transfer_lines_legacy (legacy_id),
  KEY ix_corporate_transfer_lines_transfer (transfer_id),
  CONSTRAINT fk_corporate_transfer_lines_transfer FOREIGN KEY (transfer_id) REFERENCES app_corporate_transfers(id) ON DELETE CASCADE,
  CONSTRAINT fk_corporate_transfer_lines_category FOREIGN KEY (category_id) REFERENCES app_corporate_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfer_lines_product FOREIGN KEY (product_id) REFERENCES app_corporate_products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfer_lines_unit FOREIGN KEY (unit_id) REFERENCES app_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_corporate_transfer_lines_site FOREIGN KEY (destination_site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT,
  CONSTRAINT fk_corporate_transfer_lines_engineer FOREIGN KEY (engineer_id) REFERENCES app_employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('corporate_transfers.view', 'View corporate transfers', 'Procurement', 'View project and site corporate product transfers'),
  ('corporate_transfers.manage', 'Create and modify corporate transfers', 'Procurement', 'Manage transfer headers and product lines'),
  ('corporate_transfers.delete', 'Delete corporate transfers', 'Procurement', 'Delete only transfers without product lines')
ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module), description=VALUES(description);

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT rp.role_id, target.id, 1
  FROM app_role_permissions rp
  JOIN app_permissions source ON source.id = rp.permission_id
  JOIN app_permissions target ON target.permission_key IN ('corporate_transfers.view', 'corporate_transfers.manage')
 WHERE source.permission_key = 'menu.transfer.corporate.product.view' AND rp.allowed = 1
ON DUPLICATE KEY UPDATE allowed = 1;

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
  FROM app_roles r
  JOIN app_permissions p ON p.permission_key IN ('corporate_transfers.view', 'corporate_transfers.manage', 'corporate_transfers.delete')
 WHERE r.role_key = 'programmer'
ON DUPLICATE KEY UPDATE allowed = 1;

UPDATE app_menu_items
   SET route = '/purchases/transfers',
       permission_id = (SELECT id FROM app_permissions WHERE permission_key = 'corporate_transfers.view')
 WHERE legacy_id = 41;
