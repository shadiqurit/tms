import legacyPurchases from '../../../../Data/PURCHASE_MST.json';
import legacySuppliers from '../../../../Data/SUPPLIER.json';
import legacyMaterials from '../../../../Data/RAW_MATERIAL.json';
import legacyUnits from '../../../../Data/T_UOM.json';
import legacyExpenseHeads from '../../../../Data/ENG_EXPHEAD.json';
import legacyEmployeeProjects from '../../../../Data/EMPLOYEES_P.json';
import legacyEmployeeSites from '../../../../Data/EMPLOYEES_S.json';
import { projects } from './projects';
import { employeeOptions } from './assignments';
import { projectSites } from './projectSites';
const purchaseSummary = {
    1: [921, 7299314.81, 2697, 4738642], 2: [49, 459256, 149, 245487], 3: [136, 921396, 370, 596441],
    4: [313, 2444015.4, 1068, 1786594], 5: [237, 2240397, 2065, 4631636], 6: [83, 691024, 594, 780012],
    7: [286, 3337487.8, 1034, 2213124], 8: [449, 5522657.02, 1672, 3576971], 9: [6, 573213, 26, 1056155],
    10: [5, 1273260, 31, 2116247], 11: [274, 2316988.4, 717, 1181275],
};
export const supplierOptions = legacySuppliers.recordset.map((item) => ({ id: Number(item.ID), code: item.CODE, name: item.SNAME, address: [item.ADDRESS_1, item.ADDRESS_2].filter(Boolean).join(', '), phone: item.PHONE ?? '' }));
export const unitOptions = legacyUnits.recordset.map((item) => ({ id: Number(item.ID), name: item.UMNAME, code: item.CODE }));
export const materialOptions = legacyMaterials.recordset.map((item) => ({ id: Number(item.ID), name: item.RMNAME, unitId: item.UOM, unitName: unitOptions.find((unit) => unit.id === Number(item.UOM))?.name ?? '' }));
export const expenseHeadOptions = legacyExpenseHeads.recordset.map((item) => ({ id: Number(item.ID), name: item.EXPNAME }));
export const employeeProjectOptions = [
    ...legacyEmployeeProjects.recordset,
    ...legacyEmployeeSites.recordset,
].map((item) => ({ employeeId: Number(item.EMPID), projectId: Number(item.PRJ_ID) })).filter((item, index, all) => all.findIndex((entry) => entry.employeeId === item.employeeId && entry.projectId === item.projectId) === index);
export const sitePurchaseRecords = legacyPurchases.recordset.map((item) => {
    const project = projects.find((entry) => entry.id === Number(item.PRJ_ID));
    const employee = employeeOptions.find((entry) => entry.id === Number(item.SE_ID));
    const supplier = supplierOptions.find((entry) => entry.id === Number(item.SUPP_ID));
    const summary = purchaseSummary[Number(item.ID)] ?? [0, 0, 0, 0];
    return {
        id: Number(item.ID), projectId: Number(item.PRJ_ID), projectCode: project?.code ?? `#${item.PRJ_ID}`,
        projectName: project?.name ?? 'Unknown project', employeeId: Number(item.SE_ID),
        employeeName: employee?.name ?? 'Unknown employee', employeeCode: employee?.employeeCode ?? '',
        supplierId: item.SUPP_ID ? Number(item.SUPP_ID) : null, supplierName: supplier?.name ?? item.LOC_SUPP ?? 'Local supplier',
        purchaseNo: item.PUR_NO ?? '', localSupplier: item.LOC_SUPP ?? '', supplierAddress: item.SUP_ADD ?? '',
        purchaseDate: item.ODATE, purchaseType: item.PUR_TYPE === 'C' ? 'corporate' : 'local',
        challanNo: item.CHALLAN ?? '', challanDate: item.CH_DATE ?? '', notes: item.NOTES ?? '', status: 'posted',
        materialCount: summary[0], materialTotal: summary[1], expenseCount: summary[2], expenseTotal: summary[3],
    };
});
export const demoMaterialLines = [
    { id: 83, purchaseId: 1, materialId: 8, materialName: materialOptions.find((item) => item.id === 8)?.name ?? 'Material', unitId: 3, unitName: 'CFT', siteId: 38, siteName: projectSites.find((item) => item.id === 38)?.name ?? 'Project site', entryDate: '2024-04-20', quantity: 140, unitPrice: 17.8571, discount: 0, totalAmount: 2500, notes: '' },
    { id: 84, purchaseId: 1, materialId: 9, materialName: materialOptions.find((item) => item.id === 9)?.name ?? 'Material', unitId: 3, unitName: 'CFT', siteId: 38, siteName: projectSites.find((item) => item.id === 38)?.name ?? 'Project site', entryDate: '2024-04-20', quantity: 50, unitPrice: 42.6, discount: 0, totalAmount: 2130, notes: '' },
];
export const demoExpenseLines = [
    { id: 253, purchaseId: 1, expenseHeadId: 40, expenseHeadName: expenseHeadOptions.find((item) => item.id === 40)?.name ?? 'Mason cost', siteId: null, siteName: '', entryDate: '2024-04-08', amount: 4000, notes: 'Setabganj water line mason' },
    { id: 254, purchaseId: 1, expenseHeadId: 28, expenseHeadName: expenseHeadOptions.find((item) => item.id === 28)?.name ?? 'Transport cost', siteId: 20, siteName: projectSites.find((item) => item.id === 20)?.name ?? 'Project site', entryDate: '2024-04-08', amount: 500, notes: '' },
];
export function nextSitePurchaseId() { return Math.max(0, ...sitePurchaseRecords.map((item) => item.id)) + 1; }
export function nextMaterialLineId() { return Math.max(0, ...demoMaterialLines.map((item) => item.id)) + 1; }
export function nextSiteExpenseLineId() { return Math.max(0, ...demoExpenseLines.map((item) => item.id)) + 1; }
