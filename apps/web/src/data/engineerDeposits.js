import legacyAccountsJson from '../../../../Data/DEPOSIT.json';
import legacyDepositsJson from '../../../../Data/DEPOSIT_DTL.json';
import legacyPurchaseHeadersJson from '../../../../Data/PURCHASE_MST.json';
import legacyMaterialLinesJson from '../../../../Data/PURCHASE_DTL.json';
import legacyExpenseLinesJson from '../../../../Data/PURCHASE_DTL1.json';
import { employeeOptions } from './assignments';
import { projects } from './projects';
import { projectSites } from './projectSites';
import { expenseHeadOptions, materialOptions, unitOptions } from './sitePurchases';
const legacyAccounts = legacyAccountsJson.recordset;
const purchaseHeaders = legacyPurchaseHeadersJson.recordset;
const materialLines = legacyMaterialLinesJson.recordset;
const expenseLines = legacyExpenseLinesJson.recordset;
const pairKey = (employeeId, projectId) => `${employeeId}:${projectId}`;
export const demoEngineerDeposits = legacyDepositsJson.recordset.map((item) => ({ ...item, referenceNo: '', notes: '' }));
function identity(employeeId, projectId) {
    const employee = employeeOptions.find((item) => item.id === employeeId);
    const project = projects.find((item) => item.id === projectId);
    return {
        employeeId, employeeCode: employee?.employeeCode ?? '', employeeName: employee?.name ?? `Engineer #${employeeId}`,
        projectId, projectCode: project?.code ?? `#${projectId}`, projectName: project?.name ?? `Project #${projectId}`,
    };
}
export function buildDemoEngineerAccounts() {
    const pairs = new Map();
    for (const account of legacyAccounts)
        pairs.set(pairKey(account.ENG_ID, account.PRJ_ID), { employeeId: account.ENG_ID, projectId: account.PRJ_ID, accountId: account.ID });
    for (const purchase of purchaseHeaders) {
        const key = pairKey(purchase.SE_ID, purchase.PRJ_ID);
        if (!pairs.has(key))
            pairs.set(key, { employeeId: purchase.SE_ID, projectId: purchase.PRJ_ID, accountId: null });
    }
    return [...pairs.values()].map((pair) => {
        const accountIds = legacyAccounts.filter((item) => item.ENG_ID === pair.employeeId && item.PRJ_ID === pair.projectId).map((item) => item.ID);
        const deposits = demoEngineerDeposits.filter((item) => accountIds.includes(item.PID));
        const purchases = purchaseHeaders.filter((item) => item.SE_ID === pair.employeeId && item.PRJ_ID === pair.projectId);
        const purchaseIds = purchases.map((item) => item.ID);
        const materials = materialLines.filter((item) => purchaseIds.includes(item.PID));
        const expenses = expenseLines.filter((item) => purchaseIds.includes(item.PID));
        const deposited = deposits.reduce((sum, item) => sum + Number(item.AMT || 0), 0);
        const materialTotal = materials.reduce((sum, item) => sum + Number(item.TOTAL || 0), 0);
        const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.TOTAL || 0), 0);
        const dates = [...deposits.map((item) => item.DDATE ?? ''), ...materials.map((item) => item.P_DATE ?? ''), ...expenses.map((item) => item.P_DATE ?? '')].filter(Boolean).sort();
        return {
            ...identity(pair.employeeId, pair.projectId), accountId: pair.accountId,
            depositCount: deposits.length, deposited, purchaseCount: purchases.length,
            materialTotal, expenseTotal, purchased: materialTotal + expenseTotal,
            balance: deposited - materialTotal - expenseTotal, lastActivityDate: dates.at(-1) ?? null,
        };
    }).sort((a, b) => a.employeeName.localeCompare(b.employeeName) || b.projectId - a.projectId);
}
export function getDemoEngineerLedger(employeeId, projectId) {
    const account = legacyAccounts.find((item) => item.ENG_ID === employeeId && item.PRJ_ID === projectId);
    const accountIds = legacyAccounts.filter((item) => item.ENG_ID === employeeId && item.PRJ_ID === projectId).map((item) => item.ID);
    const purchases = purchaseHeaders.filter((item) => item.SE_ID === employeeId && item.PRJ_ID === projectId);
    const purchaseIds = purchases.map((item) => item.ID);
    const transactions = [];
    for (const item of demoEngineerDeposits.filter((row) => accountIds.includes(row.PID))) {
        const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
        transactions.push({ id: item.ID, type: 'deposit', transactionDate: item.DDATE, referenceNo: item.referenceNo, siteId: item.SITE_ID, siteName: site?.name ?? '', description: item.notes || 'Funds received', notes: item.notes, purchaseId: 0, credit: Number(item.AMT), debit: 0, balance: 0 });
    }
    for (const item of materialLines.filter((row) => purchaseIds.includes(row.PID))) {
        const header = purchases.find((row) => row.ID === item.PID);
        const material = materialOptions.find((row) => row.id === Number(item.PROD_ID));
        const unit = unitOptions.find((row) => row.id === Number(item.UOM));
        const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
        transactions.push({ id: item.ID, type: 'material', transactionDate: item.P_DATE ?? header.ODATE, referenceNo: header.PUR_NO ?? `PUR-${header.ID}`, siteId: item.SITE_ID, siteName: site?.name ?? '', description: `${material?.name ?? 'Unspecified legacy material'}${item.QTY ? ` · ${item.QTY} ${unit?.code ?? unit?.name ?? ''}` : ''}`, notes: item.NOTES ?? '', purchaseId: header.ID, credit: 0, debit: Number(item.TOTAL || 0), balance: 0 });
    }
    for (const item of expenseLines.filter((row) => purchaseIds.includes(row.PID))) {
        const header = purchases.find((row) => row.ID === item.PID);
        const head = expenseHeadOptions.find((row) => row.id === Number(item.OTHER_EXP));
        const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
        transactions.push({ id: item.ID, type: 'expense', transactionDate: item.P_DATE ?? header.ODATE, referenceNo: header.PUR_NO ?? `PUR-${header.ID}`, siteId: item.SITE_ID, siteName: site?.name ?? '', description: head?.name ?? item.NOTES ?? 'Other site expense', notes: item.NOTES ?? '', purchaseId: header.ID, credit: 0, debit: Number(item.TOTAL || 0), balance: 0 });
    }
    transactions.sort((a, b) => String(a.transactionDate ?? '').localeCompare(String(b.transactionDate ?? '')) || (a.type === 'deposit' ? -1 : b.type === 'deposit' ? 1 : a.type.localeCompare(b.type)) || a.id - b.id);
    let runningBalance = 0;
    for (const item of transactions) {
        runningBalance += item.credit - item.debit;
        item.balance = runningBalance;
    }
    const deposited = transactions.reduce((sum, item) => sum + item.credit, 0);
    const purchased = transactions.reduce((sum, item) => sum + item.debit, 0);
    return {
        ledger: { ...identity(employeeId, projectId), accountId: account?.ID ?? null, openedOn: account?.CDATE ?? null, deposited, purchased, balance: deposited - purchased },
        transactions: transactions.reverse(),
    };
}
export function addDemoEngineerDeposit(input) {
    let account = legacyAccounts.find((item) => item.ENG_ID === input.employeeId && item.PRJ_ID === input.projectId);
    if (!account) {
        account = { ID: Math.max(0, ...legacyAccounts.map((item) => item.ID)) + 1, ENG_ID: input.employeeId, PRJ_ID: input.projectId, CDATE: input.depositDate };
        legacyAccounts.push(account);
    }
    const id = Math.max(0, ...demoEngineerDeposits.map((item) => item.ID)) + 1;
    demoEngineerDeposits.push({ ID: id, PID: account.ID, DDATE: input.depositDate, AMT: input.amount, SITE_ID: input.siteId, referenceNo: input.referenceNo, notes: input.notes });
    return id;
}
export function updateDemoEngineerDeposit(id, input) {
    const item = demoEngineerDeposits.find((row) => row.ID === id);
    if (!item)
        return false;
    Object.assign(item, { DDATE: input.depositDate, AMT: input.amount, SITE_ID: input.siteId, referenceNo: input.referenceNo, notes: input.notes });
    return true;
}
export function deleteDemoEngineerDeposit(id) {
    const index = demoEngineerDeposits.findIndex((item) => item.ID === id);
    if (index < 0)
        return false;
    demoEngineerDeposits.splice(index, 1);
    return true;
}
