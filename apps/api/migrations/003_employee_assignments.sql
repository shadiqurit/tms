CREATE TABLE IF NOT EXISTS app_employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_id BIGINT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  employee_code VARCHAR(30) NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(120) NULL,
  address VARCHAR(300) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_company_legacy (company_id, legacy_id),
  KEY ix_employees_company (company_id, status),
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES app_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_employee_projects (
  employee_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, project_id),
  KEY ix_employee_projects_project (project_id),
  CONSTRAINT fk_employee_projects_employee FOREIGN KEY (employee_id) REFERENCES app_employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_projects_project FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_employee_sites (
  employee_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, site_id),
  KEY ix_employee_sites_site (site_id),
  CONSTRAINT fk_employee_sites_employee FOREIGN KEY (employee_id) REFERENCES app_employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_sites_site FOREIGN KEY (site_id) REFERENCES app_project_sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
