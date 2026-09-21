ALTER TABLE app_employees
  ADD COLUMN date_of_birth DATE NULL AFTER last_name,
  ADD COLUMN hire_date DATE NULL AFTER email,
  ADD COLUMN salary DECIMAL(15,2) NULL AFTER hire_date,
  ADD COLUMN department VARCHAR(120) NULL AFTER salary;

INSERT INTO app_permissions (permission_key, name, module, description) VALUES
  ('employees.view', 'View employees', 'Workforce', 'View the employee and site engineer directory'),
  ('employees.manage', 'Create and modify employees', 'Workforce', 'Add employees and update their information'),
  ('employees.delete', 'Delete unreferenced employees', 'Workforce', 'Delete employees only when no referenced assignment data exists')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  module = VALUES(module),
  description = VALUES(description);
