# Legacy Oracle/APEX analysis

## What is in the export

The supplied export contains 64 JSON datasets plus Oracle DDL, views, and authentication functions. It is a construction project operations system rather than a simple project tracker.

The main functional areas are:

| Area | Principal legacy objects | Observed data |
| --- | --- | ---: |
| Identity and access | `APPUSER`, `USER_GROUP`, `USER_MENU`, `T_MENU`, `USER_PROJECT` | 4 users, 5 groups, 52 menus, 129 grants, 10 project assignments |
| Projects and sites | `PROJECTS`, `PROJECT_SITE`, `PROJECTS_LOG` | 10 projects, 93 sites, 53 audit rows |
| Project expenses | `EXPCOST`, `EXPAY_MST`, `EXPAY_DTL`, `ENG_EXPHEAD` | 17 expense types, 8 vouchers, 39 lines, 382 engineer expense heads |
| Local procurement | `PURCHASE_MST`, `PURCHASE_DTL`, `RAW_MATERIAL`, `SUPPLIER` | 11 orders, 2,759 current detail lines, 41 materials, 30 suppliers |
| Corporate procurement | `COR_PURCHASE_*`, `COR_TRANSFER_*`, `CORP_PRODUCTS`, category tables | 45 purchases, 255 lines, 38 transfers, 604 transfer lines |
| Workforce | `EMPLOYEES*`, `MASON*`, `EMP_SALARY`, `EMP_LOANS` | Engineers, site assignments, masons, 1,965 mason payment lines |
| Finance | `BILL_*`, `DEPOSIT*`, `LOAN_*`, `RTN_LOAN_*`, `LPROVIDER*`, `BANKS`, `BRANCHES` | Bills, deposits, loans, repayments, lenders, and bank reference data |
| Geography | `DIVISION`, `DISTRICT`, `UPAZILA`, `UNIONS` | Bangladesh administrative reference data |
| Reporting and support | Oracle views, JasperReports config/demo tables, plan tables | Reporting projections and infrastructure metadata |
| Separate lottery module | `LOTTERY_NAMES`, `WINNERS`, `LOT_TRNS*` | A distinct workflow sharing some access infrastructure |

## Business model recovered from the data

1. A company owns projects.
2. Each project can contain many physical sites.
3. Users receive a role/group and can also be limited to explicitly assigned projects.
4. Roles receive access to menu/page entries.
5. Costs occur in at least two phases:
   - **Pre-award** costs, represented by `EXPCOST.COST_TIME = 'Before'` (tender security, estimator, and office preparation costs).
   - **Execution** costs after award, including project expense vouchers, engineer costs, procurement, labor/mason payments, salaries, loans, and billing deductions.
6. Procurement is split between local project purchasing and corporate purchasing/material transfer.
7. Audit/history tables exist for projects, purchases, lenders, and transactions, so the replacement needs first-class audit logging.

## Important migration decisions

- Oracle numeric IDs are retained as `legacy_id`; MySQL receives independent auto-increment primary keys. This avoids the special behavior of zero-valued legacy IDs.
- APEX page numbers are not authorization keys. New permissions use stable names such as `projects.view` and `admin.access.manage`.
- Role permissions are enforced in both Vue navigation and Node API middleware. Hiding a menu is not treated as security.
- User-to-project assignments are preserved as a second authorization boundary.
- All text columns use `utf8mb4`, required for the Bangla names and addresses in the export.
- Passwords are bcrypt-hashed during import. The old Oracle login function compared plaintext values and must not be reproduced.
- `EXPCOST.COST_TIME` becomes a controlled expense phase (`pre_award`, `execution`, or `closeout`) rather than a free-text value.
- Audit records use JSON before/after snapshots in the new model, replacing repeated log-table shapes.

## Data-quality findings to resolve during later modules

- Several current and dated-backup tables coexist (`*271024`, `PURCHASE_DTL1`), and the intended source of truth must be confirmed before full transaction migration.
- Some expense rows have no `COST_TIME`, so the importer currently classifies them as execution costs.
- Naming and spelling vary across records (`Mason`, `Mistry`, `Raj Mistry`; `engineer`/`enginer`). The new UI standardizes labels without altering legacy data.
- Multiple columns act as overloaded flags or references (`PUR_ID`, `S_FLAG`, `TYP`, `STATUS`). Each needs workflow-specific mapping before its module is migrated.
- The Lottery records appear to be a separate application domain and are deliberately outside this first project-management slice.
- JasperReports server configuration and demo tables are infrastructure artifacts and should not be copied into the application domain schema.

## Recommended migration order

1. Identity, roles, menus, project access — included in this slice.
2. Projects, sites, and master data — initial read model included in this slice.
3. Pre-award and execution expense registers.
4. Local purchasing and suppliers.
5. Corporate products, purchasing, and transfers.
6. Engineers, masons, payroll, and loans.
7. Billing, deposits, lender accounts, and financial reporting.
8. Reports, exports, and archival audit migration.
