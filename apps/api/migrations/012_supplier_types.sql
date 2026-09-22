UPDATE app_suppliers
   SET supplier_type = 'O'
 WHERE supplier_type IS NULL
    OR UPPER(TRIM(supplier_type)) NOT IN ('L', 'C', 'I', 'O');

UPDATE app_suppliers
   SET supplier_type = UPPER(TRIM(supplier_type));

ALTER TABLE app_suppliers
  MODIFY COLUMN supplier_type ENUM('L', 'C', 'I', 'O') NOT NULL DEFAULT 'O';
