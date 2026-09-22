ALTER TABLE app_expense_payment_lines
  ADD COLUMN returnable TINYINT(1) NULL AFTER expense_type_id;

UPDATE app_expense_payment_lines line
JOIN app_expense_types expense_type ON expense_type.id = line.expense_type_id
SET line.returnable = expense_type.refundable
WHERE line.returnable IS NULL;
