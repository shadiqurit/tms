-- One spendable balance per engineer. Keep app_engineer_accounts as the
-- original Oracle DEPOSIT headers so their IDs and project context survive.
CREATE TABLE IF NOT EXISTS app_engineer_wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_engineer_wallet_company_employee (company_id, employee_id),
  CONSTRAINT fk_engineer_wallet_company FOREIGN KEY (company_id) REFERENCES app_companies(id),
  CONSTRAINT fk_engineer_wallet_employee FOREIGN KEY (employee_id) REFERENCES app_employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE app_engineer_deposits
  MODIFY COLUMN account_id BIGINT UNSIGNED NULL,
  ADD COLUMN wallet_id BIGINT UNSIGNED NULL AFTER account_id,
  ADD KEY ix_engineer_deposits_wallet_date (wallet_id, deposit_date),
  ADD CONSTRAINT fk_engineer_deposits_wallet FOREIGN KEY (wallet_id) REFERENCES app_engineer_wallets(id) ON DELETE RESTRICT;

INSERT INTO app_engineer_wallets (company_id, employee_id)
SELECT company_id, employee_id FROM app_engineer_accounts
UNION
SELECT company_id, employee_id FROM app_site_purchases
ON DUPLICATE KEY UPDATE id = id;

UPDATE app_engineer_deposits d
JOIN app_engineer_accounts a ON a.id = d.account_id
JOIN app_engineer_wallets w ON w.company_id = a.company_id AND w.employee_id = a.employee_id
SET d.wallet_id = w.id
WHERE d.wallet_id IS NULL;

ALTER TABLE app_engineer_deposits
  MODIFY COLUMN wallet_id BIGINT UNSIGNED NOT NULL;
