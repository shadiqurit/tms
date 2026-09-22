import legacyPurchases from '../../../../Data/COR_PURCHASE_MST.json';
import legacyLines from '../../../../Data/COR_PURCHASE_DTL.json';
import legacyProducts from '../../../../Data/CORP_PRODUCTS.json';
import legacyCategories from '../../../../Data/T_CATEGORIES.json';
import { projects } from './projects';
import { projectSites } from './projectSites';
import { supplierOptions, unitOptions, type PurchaseOption } from './sitePurchases';

export interface CorporatePurchaseRecord {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  siteId: number | null;
  siteName: string;
  supplierId: number | null;
  supplierName: string;
  purchaseNo: string;
  localSupplier: string;
  supplierAddress: string;
  purchaseDate: string;
  purchaseType: string;
  challanNo: string;
  challanDate: string;
  notes: string;
  status: 'draft' | 'posted' | 'cancelled';
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface CorporateCategoryOption { id: number; name: string }
export interface CorporateProductOption extends PurchaseOption { categoryId: number | null; defaultPrice: number | null; description?: string }
export interface CorporateLineRecord {
  id: number;
  purchaseId?: number;
  categoryId: number | null;
  categoryName: string;
  productId: number | null;
  productName: string;
  unitId: number | null;
  unitName: string;
  siteId: number | null;
  siteName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  notes: string;
}

interface LegacyPurchase { ID: number; PUR_NO: string | null; SUPP_ID: number | null; LOC_SUPP: string | null; SUP_ADD: string | null; ODATE: string | null; PUR_TYPE: string | null; CHALLAN: string | null; CH_DATE: string | null; NOTES: string | null; PRJ_ID: number; SITE_ID: number | null }
interface LegacyLine { ID: number; PID: number; CAT_ID: number | null; SUB_CAT_ID: number | null; PROD_ID: number | null; UOM: number | null; QTY: number | null; PRICE: number | null; DISCOUNT: number | null; TOTAL: number | null; NOTES: string | null; SITE_ID: number | null }
interface LegacyProduct { ID: number; CAT_ID: number | null; PNAME: string; DESCRIPTION: string | null; PRICE: number | null; UOM: number | null }
interface LegacyCategory { ID: number; CNAME: string }

export const corporateCategories: CorporateCategoryOption[] = (legacyCategories.recordset as LegacyCategory[]).map((item) => ({ id: Number(item.ID), name: item.CNAME }));
export const corporateProducts: CorporateProductOption[] = (legacyProducts.recordset as LegacyProduct[]).map((item) => ({
  id: Number(item.ID), name: item.PNAME, categoryId: item.CAT_ID ? Number(item.CAT_ID) : null,
  unitId: item.UOM ? Number(item.UOM) : null, unitName: unitOptions.find((unit) => unit.id === Number(item.UOM))?.name ?? '',
  defaultPrice: item.PRICE === null ? null : Number(item.PRICE), description: item.DESCRIPTION ?? '',
}));

export const corporateLines: CorporateLineRecord[] = (legacyLines.recordset as LegacyLine[]).map((item) => {
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

export const corporatePurchaseRecords: CorporatePurchaseRecord[] = (legacyPurchases.recordset as LegacyPurchase[]).map((item) => {
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
