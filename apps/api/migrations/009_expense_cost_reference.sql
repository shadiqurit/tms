ALTER TABLE app_expense_payment_lines
  ADD COLUMN company_id BIGINT UNSIGNED NULL AFTER payment_id,
  ADD COLUMN cost_id BIGINT NULL AFTER expense_type_id;

UPDATE app_expense_payment_lines line
JOIN app_expense_payments payment ON payment.id = line.payment_id
LEFT JOIN app_expense_types expense_type ON expense_type.id = line.expense_type_id
SET line.company_id = payment.company_id,
    line.cost_id = expense_type.legacy_id;

ALTER TABLE app_expense_payment_lines
  MODIFY COLUMN company_id BIGINT UNSIGNED NOT NULL,
  ADD KEY ix_expense_lines_company_cost (company_id, cost_id),
  ADD CONSTRAINT fk_expense_lines_company
    FOREIGN KEY (company_id) REFERENCES app_companies(id),
  ADD CONSTRAINT fk_expense_lines_source_cost
    FOREIGN KEY (company_id, cost_id) REFERENCES app_expense_types(company_id, legacy_id)
    ON DELETE RESTRICT;
