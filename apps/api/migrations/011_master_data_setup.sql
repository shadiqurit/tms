ALTER TABLE app_units
  ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER description;

ALTER TABLE app_corporate_products
  ADD COLUMN subcategory_id BIGINT UNSIGNED NULL AFTER category_id,
  ADD KEY ix_corporate_products_subcategory (subcategory_id),
  ADD CONSTRAINT fk_corporate_products_subcategory
    FOREIGN KEY (subcategory_id) REFERENCES app_corporate_subcategories(id) ON DELETE RESTRICT;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('master_data.view', 'View master setup', 'Administration', 'View supplier, unit, material, and corporate product masters'),
  ('master_data.manage', 'Manage master setup', 'Administration', 'Create and modify procurement master records'),
  ('master_data.delete', 'Delete unused master records', 'Administration', 'Delete master records only when they are not referenced')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  module = VALUES(module),
  description = VALUES(description);

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT DISTINCT rp.role_id, target.id, 1
  FROM app_role_permissions rp
  JOIN app_permissions source ON source.id = rp.permission_id
  JOIN app_permissions target ON target.permission_key IN ('master_data.view', 'master_data.manage')
 WHERE source.permission_key IN (
   'menu.raw.materials.view',
   'menu.supplier.setup.view',
   'menu.uom.setup.view',
   'menu.category.and.products.view'
 )
   AND rp.allowed = 1
ON DUPLICATE KEY UPDATE allowed = 1;

INSERT INTO app_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
  FROM app_roles r
  JOIN app_permissions p ON p.permission_key IN ('master_data.view', 'master_data.manage', 'master_data.delete')
 WHERE r.role_key = 'programmer'
ON DUPLICATE KEY UPDATE allowed = 1;

UPDATE app_menu_items
   SET route = '/admin/master-data',
       permission_id = (SELECT id FROM app_permissions WHERE permission_key = 'master_data.view')
 WHERE legacy_id IN (3, 8, 16, 39);
