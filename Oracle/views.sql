DROP VIEW TMS.ALL_PURCHASE;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.ALL_PURCHASE
(
    PURCHASE_MST,
    PURCHASE_DTL,
    COR_TRANSFER_MST,
    COR_TRANSFER_DTL,
    T_CATEGORIES,
    CORP_PRODUCTS
)
BEQUEATH DEFINER
AS
    SELECT 1     PURCHASE_MST,
           2     PURCHASE_dtl,
           3     COR_TRANSFER_MST,
           4     COR_TRANSFER_DTL,
           5     T_CATEGORIES,
           6     CORP_PRODUCTS
      FROM RAW_MATERIAL;


DROP VIEW TMS.V_CORPO_PROD;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_CORPO_PROD
(
    CAT_ID,
    PROD_ID,
    UOM,
    QTY,
    PRICE,
    OTHER_COST,
    TOTAL,
    NOTES,
    PRJ_ID,
    SITE_ID,
    OTHER_EXP,
    DSEID,
    TDT,
    P_TYP
)
BEQUEATH DEFINER
AS
      SELECT dtl.CAT_ID,
             dtl.PROD_ID,
             dtl.UOM,
             dtl.QTY,
             dtl.PRICE,
             dtl.OTHER_COST,
             dtl.TOTAL,
             dtl.NOTES,
             dtl.PRJ_ID,
             dtl.s_id      site_id,
             dtl.OTHER_EXP,
             dtl.SE_ID     dseid,
             dtl.TDT,
             'CORP'        AS p_typ
        FROM COR_TRANSFER_MST mst,
             COR_TRANSFER_DTL dtl,
             projects        p,
             project_site    ps,
             CORP_PRODUCTS   cp,
             t_uom           um,
             t_categories    tc
       WHERE     dtl.PID = mst.ID
             AND p.id = dtl.prj_id
             AND ps.id = dtl.s_id
             AND cp.id = dtl.prod_id
             AND um.id = dtl.uom
             AND mst.RCV_PRJ_ID = dtl.PRJ_ID
             AND tc.id = dtl.CAT_ID
    ORDER BY cat_id;


DROP VIEW TMS.V_CORP_PURCHASE;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_CORP_PURCHASE
(
    SLNO,
    MST_ID,
    PUR_NO,
    SUPP_ID,
    SUPPLIER_NAME,
    LOC_SUPP,
    SUP_ADD,
    ODATE,
    PUR_TYPE,
    CHALLAN,
    CH_DATE,
    M_NOTES,
    M_PRJ_ID,
    PROJECT_NAME,
    M_COM_ID,
    M_ENT_BY,
    M_ENT_DATE,
    M_UPD_BY,
    M_UPD_DATE,
    PUR_ID,
    M_SE_ID,
    M_SITE_ID,
    DTL_ID,
    PID,
    CAT_ID,
    CATEGORY_NAME,
    SUB_CAT_ID,
    PROD_ID,
    PRODUCT_NAME,
    UOM,
    UOM_NAME,
    QTY,
    PRICE,
    DISCOUNT,
    TOTAL,
    D_NOTES,
    D_PRJ_ID,
    D_COM_ID,
    D_ENT_BY,
    D_ENT_DATE,
    D_UPD_BY,
    D_UPD_DATE,
    D_SITE_ID,
    P_DATE,
    S_FLAG,
    OTHER_EXP,
    D_SE_ID
)
BEQUEATH DEFINER
AS
      SELECT ROW_NUMBER () OVER (ORDER BY NULL)     AS slno,  -- Master fields
             mst.id                                 AS mst_id,
             mst.pur_no,
             mst.supp_id,
             s.sname                                AS supplier_name,
             mst.loc_supp,
             mst.sup_add,
             mst.odate,
             mst.pur_type,
             mst.challan,
             mst.ch_date,
             mst.notes                              AS m_notes,
             mst.prj_id                             AS m_prj_id,
             pj.pname                               AS project_name,
             mst.com_id                             AS m_com_id,
             mst.ent_by                             AS m_ent_by,
             mst.ent_date                           AS m_ent_date,
             mst.upd_by                             AS m_upd_by,
             mst.upd_date                           AS m_upd_date,
             mst.pur_id,
             mst.se_id                              AS m_se_id,
             mst.site_id                            AS m_site_id,
             -- Detail fields
             dtl.id                                 AS dtl_id,
             dtl.pid,
             dtl.cat_id,
             cat.cname                              AS category_name,
             dtl.sub_cat_id,
             dtl.prod_id,
             cp.pname                               AS product_name,
             dtl.uom,
             tu.umname                              AS uom_name,
             dtl.qty,
             dtl.price,
             dtl.discount,
             dtl.total,
             dtl.notes                              AS d_notes,
             dtl.prj_id                             AS d_prj_id,
             dtl.com_id                             AS d_com_id,
             dtl.ent_by                             AS d_ent_by,
             dtl.ent_date                           AS d_ent_date,
             dtl.upd_by                             AS d_upd_by,
             dtl.upd_date                           AS d_upd_date,
             dtl.site_id                            AS d_site_id,
             dtl.p_date,
             dtl.s_flag,
             dtl.other_exp,
             dtl.se_id                              AS d_se_id
        FROM COR_PURCHASE_MST mst
             JOIN cor_purchase_dtl dtl ON dtl.pid = mst.id
             LEFT JOIN supplier s ON s.id = mst.supp_id
             LEFT JOIN projects pj ON pj.id = mst.prj_id
             LEFT JOIN corp_products cp ON cp.id = dtl.prod_id
             LEFT JOIN t_categories cat ON cat.id = dtl.cat_id
             LEFT JOIN t_uom tu ON tu.id = dtl.uom
    ORDER BY mst.prj_id, mst.odate, mst.supp_id;


DROP VIEW TMS.V_CORP_PURMST;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_CORP_PURMST
(
    MST_ID,
    PUR_NO,
    SUPP_ID,
    SUPPLIER_NAME,
    LOC_SUPP,
    SUP_ADD,
    ODATE,
    PUR_TYPE,
    CHALLAN,
    CH_DATE,
    M_NOTES,
    M_PRJ_ID,
    PROJECT_NAME,
    M_COM_ID,
    M_ENT_BY,
    M_ENT_DATE,
    M_UPD_BY,
    M_UPD_DATE,
    PUR_ID,
    M_SE_ID,
    M_SITE_ID
)
BEQUEATH DEFINER
AS
      SELECT mst.id           AS mst_id,
             mst.pur_no,
             mst.supp_id,
             s.sname          AS supplier_name,
             mst.loc_supp,
             mst.sup_add,
             mst.odate,
             mst.pur_type,
             mst.challan,
             mst.ch_date,
             mst.notes        AS m_notes,
             mst.prj_id       AS m_prj_id,
             pj.pname         AS project_name,
             mst.com_id       AS m_com_id,
             mst.ent_by       AS m_ent_by,
             mst.ent_date     AS m_ent_date,
             mst.upd_by       AS m_upd_by,
             mst.upd_date     AS m_upd_date,
             mst.pur_id,
             mst.se_id        AS m_se_id,
             mst.site_id      AS m_site_id
        FROM cor_purchase_mst mst
             LEFT JOIN supplier s ON s.id = mst.supp_id
             LEFT JOIN projects pj ON pj.id = mst.prj_id
    ORDER BY mst.prj_id, mst.odate, mst.supp_id;


DROP VIEW TMS.V_CORP_TRANSFER;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_CORP_TRANSFER
(
    MASTER_ID,
    TRN_NO,
    FRM_PRJ_ID,
    RCV_PRJ_ID,
    TRNSF_DATE,
    MASTER_NOTES,
    DETAIL_ID,
    PROD_ID,
    UOM,
    QTY,
    PRICE,
    TOTAL,
    DETAIL_NOTES
)
BEQUEATH DEFINER
AS
      SELECT                                                  -- Master Fields
             tm.ID        AS Master_ID,
             tm.TRN_NO,
             tm.FRM_PRJ_ID,
             tm.RCV_PRJ_ID,
             tm.TRNSF_DATE,
             tm.NOTES     AS Master_Notes,
             -- Detail Fields
             td.ID        AS Detail_ID,
             td.PROD_ID,
             td.UOM,
             td.QTY,
             td.PRICE,
             td.TOTAL,
             td.NOTES     AS Detail_Notes
        FROM COR_TRANSFER_MST tm
             INNER JOIN COR_TRANSFER_DTL td ON tm.ID = td.PID
    ORDER BY tm.TRNSF_DATE DESC;


DROP VIEW TMS.V_LOAN;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_LOAN
(
    ID,
    LOAN_NO,
    PROV_ID,
    LPID,
    LPNAME,
    ADDRESS,
    LPTYP,
    RELAT,
    STATUS,
    ACC_NO,
    BANK,
    BRANCH,
    ADDRESS2,
    PDATE,
    MNOTE,
    COM_ID,
    LOAN_ID,
    LDID,
    PID,
    LDATE,
    AMT,
    RTN_AMT,
    RTN_DATE,
    NOTES,
    ENT_BY,
    ENT_DATE,
    UPD_BY,
    UPD_DATE
)
BEQUEATH DEFINER
AS
    SELECT lm.ID,
           lm.LOAN_NO,
           lm.PROV_ID,
           lp.ID          lpid,
           lp.LPNAME,
           lp.ADDRESS,
           lp.LPTYP,
           lp.RELAT,
           lp.STATUS,
           lp.ACC_NO,
           lp.BANK,
           lp.BRANCH,
           lm.ADDRESS     ADDRESS2,
           lm.PDATE,
           lm.NOTES       mnote,
           lm.COM_ID,
           lm.LOAN_ID,
           ld.ID          ldid,
           ld.PID,
           ld.LDATE,
           ld.AMT,
           ld.RTN_AMT,
           ld.RTN_DATE,
           ld.NOTES,
           ld.ENT_BY,
           ld.ENT_DATE,
           ld.UPD_BY,
           ld.UPD_DATE
      FROM LOAN_mst lm, LOAN_DTL ld, lprovider lp
     WHERE lm.ID = ld.PID AND lm.PROV_ID = lp.ID;


DROP VIEW TMS.V_LOCAL_PROD;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_LOCAL_PROD
(
    PNAME,
    SNAME,
    P_DATE,
    RMNAME,
    QTY,
    UOM,
    PRICE,
    TOTAL,
    SITE_ID,
    PRJ_ID,
    SE_ID,
    CNAME,
    T_CAT_ID,
    SITEENG,
    P_TYP
)
BEQUEATH DEFINER
AS
      SELECT tid || ' - ' || p.pname             AS pname,
             ps.sname,
             p_date,
             rm.rmname,
             qty,
             um.umname                           uom,
             price,
             d.total,
             d.site_id,
             d.prj_id,
             m.se_id,
             tc.CNAME,
             rm.t_cat_id,
             em.firstname || ' ' || lastname     siteeng,
             'LOCAL'                             p_typ
        FROM purchase_mst m,
             purchase_dtl d,
             projects    p,
             project_site ps,
             raw_material rm,
             t_uom       um,
             t_categories tc,
             employees   em
       WHERE     m.id = d.pid
             AND p.id = d.prj_id
             AND ps.id = d.site_id
             AND rm.id = d.prod_id
             AND um.id = d.uom
             AND em.id = m.se_id
             AND rm.t_cat_id = tc.id
    --  AND p.id = :prj_id
    -- AND ps.id =  :site_id
    -- AND d.P_DATE BETWEEN  NVL($P{Pfromdate},d.P_DATE)  AND  NVL($P{Ptodate},d.P_DATE)
    ORDER BY t_cat_id,
             prj_id,
             site_id DESC,
             p_date;


DROP VIEW TMS.V_MASONS;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_MASONS
(
    MISTRI,
    TID,
    PACK_NO,
    PNAME,
    PRADD,
    SNAME,
    SITEADD,
    AMOUNT,
    MID,
    PRJ_ID,
    SITE_ID
)
BEQUEATH DEFINER
AS
    SELECT ma.firstname || ' ' || ma.lastname     mistri,
           pr.tid,
           pr.pack_no,
           pr.pname,
           pr.address                             pradd,
           prs.sname,
           prs.address                            siteadd,
           NVL (ag_amt, 0)                        amount,
           ma.id                                  mid,
           ms.prj_id,
           ms.site_id
      FROM mason_p       mp,
           mason_s       ms,
           masons        ma,
           projects      pr,
           project_site  prs
     WHERE     ma.id = mp.empid
           AND mp.prj_id = ms.prj_id
           AND mp.prj_id = pr.id
           AND ms.empid = ma.id
           AND ms.site_id = prs.id;


DROP VIEW TMS.V_MASON_FINAL;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_MASON_FINAL
(
    MISTRI,
    MID,
    PRJ_ID,
    AGAMT,
    TOTPAY,
    DUEAMT
)
BEQUEATH DEFINER
AS
      SELECT ag.mistri,
             ag.mid,
             ag.prj_id,
             ag.amount                                   AS agamt,
             NVL (pm.total_payment, 0)                   AS totpay,
             (ag.amount - NVL (pm.total_payment, 0))     AS dueamt
        FROM (  SELECT ma.firstname || ' ' || ma.lastname     mistri,
                       ma.id                                  mid,
                       ms.prj_id,
                       SUM (NVL (ms.ag_amt, 0))               AS amount -- Replace mp.ag_amt with ms.ag_amt
                  FROM mason_p mp
                       JOIN mason_s ms
                           ON mp.prj_id = ms.prj_id AND mp.empid = ms.empid
                       JOIN masons ma ON ma.id = mp.empid
              GROUP BY ma.firstname,
                       ma.lastname,
                       ma.id,
                       ms.prj_id) ag
             LEFT JOIN
             (  SELECT ms.se_id                       AS mid,
                       NVL (dt.prj_id, ms.PRJ_ID)     AS prj_id,
                       SUM (NVL (dt.total, 0))        AS total_payment
                  FROM mason_pay_m ms JOIN mason_pay_d dt ON ms.id = dt.pid
              GROUP BY ms.se_id, NVL (dt.prj_id, ms.PRJ_ID)) pm
                 ON ag.mid = pm.mid AND ag.prj_id = pm.prj_id
    --WHERE ag.mid = :mason_id             -- Replace with the actual mason ID
    ORDER BY ag.prj_id, ag.mid;


DROP VIEW TMS.V_MASON_PAY;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_MASON_PAY
(
    ID,
    ODATE,
    NOTES,
    COM_ID,
    SE_ID,
    MASON_ID,
    DID,
    PID,
    SITE_ID,
    TOTAL,
    DETAILS,
    PRJ_ID,
    SLOT_ID,
    P_DATE,
    TID,
    PACK_NO,
    PNAME,
    PRADD,
    SNAME,
    SITEADD,
    SLOT_NAME,
    SLT,
    MISTRI,
    MID
)
BEQUEATH DEFINER
AS
    SELECT ms.id,
           ms.odate,
           ms.notes,
           ms.com_id,
           ms.se_id,
           ms.mason_id,
           dt.id                                  did,
           dt.pid,
           dt.site_id,
           NVL (dt.total, 0)                      total,
           dt.notes                               details,
           NVL (dt.prj_id, ms.PRJ_ID)             prj_id,
           dt.slot_id,
           dt.p_date,
           pr.tid,
           pr.pack_no,
           pr.pname,
           pr.address                             pradd,
           prs.sname,
           prs.address                            siteadd,
           sl.slot_name,
           sl.id                                  slt,
           ma.firstname || ' ' || ma.lastname     mistri,
           ma.id                                  mid
      FROM mason_pay_m   ms,
           mason_pay_d   dt,
           projects      pr,
           project_site  prs,
           t_slots       sl,
           masons        ma
     WHERE     ms.id = dt.pid
           AND NVL (dt.prj_id, ms.PRJ_ID) = pr.id(+)
           AND dt.site_id = prs.id(+)
           AND dt.slot_id = sl.id(+)
           AND ms.se_id = ma.id;


DROP VIEW TMS.V_PRODUCT_CORPORATE;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_PRODUCT_CORPORATE
(
    PRJ_ID,
    PROJ_NAME,
    SITE_ID,
    SITE_NAME,
    CAT_ID,
    CAT,
    PROD_ID,
    PRODUCT,
    UMID,
    UOM,
    QTY,
    PRICE,
    TOTAL,
    NOTES,
    P_TYP
)
BEQUEATH DEFINER
AS
      SELECT dtl.PRJ_ID,
             tid || ' - ' || p.pname     AS proj_name,
             dtl.s_id                    site_id,
             ps.sname                    site_name,
             dtl.CAT_ID,
             tc.CNAME                    cat,
             dtl.PROD_ID,
             cp.PNAME                    product,
             dtl.UOM                     umid,
             um.UMNAME                   uom,
             dtl.QTY,
             dtl.PRICE,
             dtl.TOTAL,
             dtl.NOTES,
             'CORP'                      AS p_typ
        FROM COR_TRANSFER_MST mst,
             COR_TRANSFER_DTL dtl,
             projects        p,
             project_site    ps,
             CORP_PRODUCTS   cp,
             t_uom           um,
             t_categories    tc
       WHERE     dtl.PID = mst.ID
             AND p.id = dtl.prj_id
             AND ps.id = dtl.s_id
             AND cp.id = dtl.prod_id
             AND um.id = dtl.uom
             AND mst.RCV_PRJ_ID = dtl.PRJ_ID
             AND tc.id = dtl.CAT_ID
    ORDER BY cat_id;


DROP VIEW TMS.V_PRODUCT_LOCAL;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_PRODUCT_LOCAL
(
    PRJ_ID,
    PROJ_NAME,
    SITE_ID,
    SITE_NAME,
    CAT_ID,
    CAT,
    PROD_ID,
    PRODUCT,
    UMID,
    UOM,
    QTY,
    PRICE,
    TOTAL,
    NOTES,
    P_TYP
)
BEQUEATH DEFINER
AS
      SELECT d.prj_id,
             tid || ' - ' || p.pname     AS proj_name,
             d.site_id,
             ps.sname                    site_name,
             rm.t_cat_id                 cat_id,
             tc.CNAME                    cat,
             d.PROD_ID,
             rm.rmname                   product,
             d.uom                       umid,
             um.umname                   uom,
             qty,
             price,
             d.total,
             d.NOTES,
             'LOCAL'                     p_typ
        FROM purchase_mst m,
             purchase_dtl d,
             projects    p,
             project_site ps,
             raw_material rm,
             t_uom       um,
             t_categories tc
       WHERE     m.id = d.pid
             AND p.id = d.prj_id
             AND ps.id = d.site_id
             AND rm.id = d.prod_id
             AND um.id = d.uom
             AND rm.t_cat_id = tc.id
    --  AND p.id = :prj_id
    -- AND ps.id =  :site_id
    -- AND d.P_DATE BETWEEN  NVL($P{Pfromdate},d.P_DATE)  AND  NVL($P{Ptodate},d.P_DATE)
    ORDER BY t_cat_id,
             prj_id,
             site_id DESC,
             p_date;


DROP VIEW TMS.V_PROD_USED;

/* Formatted on 9/20/2026 11:06:42 PM (QP5 v5.362) */
CREATE OR REPLACE FORCE VIEW TMS.V_PROD_USED
(
    PRJ_ID,
    PROJ_NAME,
    SITE_ID,
    SITE_NAME,
    CAT_ID,
    CAT,
    PROD_ID,
    PRODUCT,
    UMID,
    UOM,
    QTY,
    PRICE,
    TOTAL,
    NOTES,
    P_TYP
)
BEQUEATH DEFINER
AS
    SELECT PRJ_ID,
           PROJ_NAME,
           SITE_ID,
           SITE_NAME,
           CAT_ID,
           CAT,
           PROD_ID,
           PRODUCT,
           UMID,
           UOM,
           qty,
           PRICE,
           TOTAL,
           NOTES,
           P_TYP
      FROM v_product_corporate cp
    UNION ALL
    SELECT PRJ_ID,
           PROJ_NAME,
           SITE_ID,
           SITE_NAME,
           CAT_ID,
           CAT,
           PROD_ID,
           PRODUCT,
           UMID,
           UOM,
           qty,
           PRICE,
           TOTAL,
           NOTES,
           P_TYP
      FROM v_product_local lp
    ORDER BY cat_id;
