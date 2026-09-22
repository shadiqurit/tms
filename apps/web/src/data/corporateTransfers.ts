import legacyTransfers from '../../../../Data/COR_TRANSFER_MST.json';
import legacyLines from '../../../../Data/COR_TRANSFER_DTL.json';
import { projects } from './projects';
import { projectSites } from './projectSites';
import { unitOptions } from './sitePurchases';
import { corporateCategories, corporateProducts } from './corporatePurchases';

export interface CorporateTransferRecord {
  id: number; transferNo: string; transferDate: string; notes?: string;
  fromProjectId: number; fromProjectName: string; fromProjectCode: string;
  fromSiteId: number | null; fromSiteName: string;
  receiveProjectId: number; receiveProjectName: string; receiveProjectCode: string;
  receiveSiteId: number | null; receiveSiteName: string;
  status: 'draft' | 'posted' | 'cancelled'; itemCount: number; totalQuantity: number; totalAmount: number;
}

export interface CorporateTransferLineRecord {
  id: number; transferId?: number; categoryId: number | null; categoryName: string;
  productId: number | null; productName: string; unitId: number | null; unitName: string;
  destinationSiteId: number | null; destinationSiteName: string; quantity: number; unitPrice: number;
  otherCost: number; otherExpense: number; totalAmount: number; notes: string; transferDate: string;
}

interface LegacyTransfer { ID: number; TRN_NO: string | null; FRM_PRJ_ID: number; FRM_SITE_ID: number | null; RCV_PRJ_ID: number; RCV_SITE_ID: number | null; TRNSF_DATE: string; NOTES: string | null }
interface LegacyLine { ID: number; PID: number; CAT_ID: number | null; PROD_ID: number | null; UOM: number | null; QTY: number | null; PRICE: number | null; OTHER_COST: number | null; OTHER_EXP: number | null; TOTAL: number | null; NOTES: string | null; TDT: string | null; S_ID: number | null }

export const corporateTransferLines: CorporateTransferLineRecord[] = (legacyLines.recordset as LegacyLine[]).map((item) => {
  const category = corporateCategories.find((entry) => entry.id === Number(item.CAT_ID));
  const product = corporateProducts.find((entry) => entry.id === Number(item.PROD_ID));
  const unit = unitOptions.find((entry) => entry.id === Number(item.UOM));
  const site = projectSites.find((entry) => entry.id === Number(item.S_ID));
  return {
    id: Number(item.ID), transferId: Number(item.PID), categoryId: item.CAT_ID ? Number(item.CAT_ID) : null,
    categoryName: category?.name ?? '', productId: item.PROD_ID ? Number(item.PROD_ID) : null,
    productName: product?.name ?? category?.name ?? 'Legacy item (product not recorded)',
    unitId: item.UOM ? Number(item.UOM) : null, unitName: unit?.name ?? '',
    destinationSiteId: item.S_ID ? Number(item.S_ID) : null, destinationSiteName: site?.name ?? '',
    quantity: Number(item.QTY ?? 0), unitPrice: Number(item.PRICE ?? 0), otherCost: Number(item.OTHER_COST ?? 0),
    otherExpense: Number(item.OTHER_EXP ?? 0), totalAmount: Number(item.TOTAL ?? 0), notes: item.NOTES ?? '',
    transferDate: item.TDT ?? '',
  };
});

export const corporateTransferRecords: CorporateTransferRecord[] = (legacyTransfers.recordset as LegacyTransfer[]).map((item) => {
  const fromProject = projects.find((entry) => entry.id === Number(item.FRM_PRJ_ID));
  const receiveProject = projects.find((entry) => entry.id === Number(item.RCV_PRJ_ID));
  const fromSite = projectSites.find((entry) => entry.id === Number(item.FRM_SITE_ID));
  const receiveSite = projectSites.find((entry) => entry.id === Number(item.RCV_SITE_ID));
  const lines = corporateTransferLines.filter((entry) => entry.transferId === Number(item.ID));
  return {
    id: Number(item.ID), transferNo: item.TRN_NO ?? '', transferDate: item.TRNSF_DATE, notes: item.NOTES ?? '',
    fromProjectId: Number(item.FRM_PRJ_ID), fromProjectName: fromProject?.name ?? 'Unknown project',
    fromProjectCode: fromProject?.code ?? `#${item.FRM_PRJ_ID}`, fromSiteId: item.FRM_SITE_ID ? Number(item.FRM_SITE_ID) : null,
    fromSiteName: fromSite?.name ?? '', receiveProjectId: Number(item.RCV_PRJ_ID),
    receiveProjectName: receiveProject?.name ?? 'Unknown project', receiveProjectCode: receiveProject?.code ?? `#${item.RCV_PRJ_ID}`,
    receiveSiteId: item.RCV_SITE_ID ? Number(item.RCV_SITE_ID) : null, receiveSiteName: receiveSite?.name ?? '',
    status: 'posted', itemCount: lines.length, totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: lines.reduce((sum, line) => sum + line.totalAmount, 0),
  };
});

export function nextCorporateTransferId() { return Math.max(0, ...corporateTransferRecords.map((item) => item.id)) + 1; }
export function nextCorporateTransferLineId() { return Math.max(0, ...corporateTransferLines.map((item) => item.id)) + 1; }
