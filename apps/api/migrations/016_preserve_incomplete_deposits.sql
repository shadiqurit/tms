ALTER TABLE app_engineer_deposits
  MODIFY COLUMN deposit_date DATE NULL,
  MODIFY COLUMN amount DECIMAL(18,2) NULL;
