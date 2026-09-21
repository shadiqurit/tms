UPDATE app_permissions
   SET module = 'Procurement'
 WHERE permission_key IN ('site_purchases.view', 'site_purchases.manage', 'site_purchases.delete');

UPDATE app_menu_items
   SET route = '/purchases/site-engineer'
 WHERE legacy_id = 29;
