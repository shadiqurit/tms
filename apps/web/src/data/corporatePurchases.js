import legacyPurchases from '../../../../Data/COR_PURCHASE_MST.json';
import legacyLines from '../../../../Data/COR_PURCHASE_DTL.json';
import legacyProducts from '../../../../Data/CORP_PRODUCTS.json';
import legacyCategories from '../../../../Data/T_CATEGORIES.json';
import { projects } from './projects';
import { projectSites } from './projectSites';
import { supplierOptions, unitOptions } from './sitePurchases';
export const corporateCategories = legacyCategories.recordset.map((item) => ({ id: Number(item.ID), name: item.CNAME }));
export const corporateProducts = legacyProducts.recordset.map((item) => ({
    id: Number(item.ID), name: item.PNAME, categoryId: item.CAT_ID ? Number(item.CAT_ID) : null,
    unitId: item.UOM ? Number(item.UOM) : null, unitName: unitOptions.find((unit) => unit.id === Number(item.UOM))?.name ?? '',
    defaultPrice: item.PRICE === null ? null : Number(item.PRICE), description: item.DESCRIPTION ?? '',
}));
export const corporateLines = legacyLines.recordset.map((item) => {
    const category = corporateCategories.find((entry) => entry.id === Number(item.CAT_ID));
    const product = corporateProducts.find((entry) => entry.id === Number(item.PROD_ID));
    const unit = unitOptions.find((entry) => entry.id === Number(item.UOM));
    const site = projectSites.find((entry) => entry.id === Number(item.SITE_ID));
    return {
        id: Number(item.ID), purchaseId: Number(item.PID), categoryId: item.CAT_ID ? Number(item.CAT_ID) : null,
        categoryName: category?.name ?? '', productId: item.PROD_ID ? Number(item.PROD_ID) : null,
        productName: product?.name ?? category?.name ?? 'Unspecified item', unitId: item.UOM ? Number(item.UOM) : null,
        unitName: unit?.name ?? '', siteId: item.SITE_ID ? Number(item.SITE_ID) : null, siteName: site?.name ?? '',
        quantity: Number(item.QTY ?? 0), unitPrice: Number(item.PRICE ?? 0), discount: Number(item.DISCOUNT ?? 0),
        totalAmount: Number(item.TOTAL ?? 0), notes: item.NOTES ?? '',
    };
});
export const corporatePurchaseRecords = legacyPurchases.recordset.map((item) => {
    const project = projects.find((entry) => entry.id === Number(item.PRJ_ID));
    const site = projectSites.find((entry) => entry.id === Number(item.SITE_ID));
    const supplier = supplierOptions.find((entry) => entry.id === Number(item.SUPP_ID));
    const lines = corporateLines.filter((entry) => entry.purchaseId === Number(item.ID));
    return {
        id: Number(item.ID), projectId: Number(item.PRJ_ID), projectCode: project?.code ?? `#${item.PRJ_ID}`,
        projectName: project?.name ?? 'Unknown project', siteId: item.SITE_ID ? Number(item.SITE_ID) : null,
        siteName: site?.name ?? '', supplierId: item.SUPP_ID ? Number(item.SUPP_ID) : null,
        supplierName: supplier?.name ?? item.LOC_SUPP ?? 'Unspecified supplier', purchaseNo: item.PUR_NO ?? '',
        localSupplier: item.LOC_SUPP ?? '', supplierAddress: item.SUP_ADD ?? '', purchaseDate: item.ODATE ?? item.CH_DATE ?? '',
        purchaseType: item.PUR_TYPE ?? 'corporate', challanNo: item.CHALLAN ?? '', challanDate: item.CH_DATE ?? '',
        notes: item.NOTES ?? '', status: 'posted', itemCount: lines.length,
        totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        totalAmount: lines.reduce((sum, line) => sum + line.totalAmount, 0),
    };
});
export function nextCorporatePurchaseId() { return Math.max(0, ...corporatePurchaseRecords.map((item) => item.id)) + 1; }
export function nextCorporateLineId() { return Math.max(0, ...corporateLines.map((item) => item.id)) + 1; }
