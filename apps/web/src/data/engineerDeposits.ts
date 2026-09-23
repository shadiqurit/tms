import legacyAccountsJson from '../../../../Data/DEPOSIT.json';
import legacyDepositsJson from '../../../../Data/DEPOSIT_DTL.json';
import legacyPurchaseHeadersJson from '../../../../Data/PURCHASE_MST.json';
import legacyMaterialLinesJson from '../../../../Data/PURCHASE_DTL.json';
import legacyExpenseLinesJson from '../../../../Data/PURCHASE_DTL1.json';
import { employeeOptions } from './assignments';
import { projects } from './projects';
import { projectSites } from './projectSites';
import { expenseHeadOptions, materialOptions, unitOptions } from './sitePurchases';

export interface EngineerAccountSummary {
  walletId: number | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  projectCount: number;
  depositCount: number;
  deposited: number;
  purchaseCount: number;
  materialTotal: number;
  expenseTotal: number;
  purchased: number;
  balance: number;
  lastActivityDate: string | null;
}

export interface EngineerLedgerTransaction {
  id: number;
  type: 'deposit' | 'material' | 'expense';
  transactionDate: string | null;
  referenceNo: string;
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  siteId: number | null;
  siteName: string;
  description: string;
  notes: string;
  purchaseId: number;
  credit: number;
  debit: number;
  balance: number;
}

export interface EngineerLedger {
  walletId: number | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  deposited: number;
  purchased: number;
  balance: number;
}

export interface DepositInput {
  employeeId: number;
  depositDate: string;
  amount: number;
  referenceNo: string;
  notes: string;
}

interface LegacyAccount { ID: number; ENG_ID: number; CDATE: string; PRJ_ID: number }
interface LegacyDeposit { ID: number; PID: number; DDATE: string | null; AMT: number | null; SITE_ID: number | null }
interface LegacyPurchase { ID: number; PUR_NO: string | null; ODATE: string; PRJ_ID: number; SE_ID: number }
interface LegacyMaterial { ID: number; PID: number; PROD_ID: number | null; UOM: number | null; QTY: number | null; TOTAL: number | null; NOTES: string | null; SITE_ID: number | null; P_DATE: string | null }
interface LegacyExpense { ID: number; PID: number; OTHER_EXP: number | null; TOTAL: number | null; NOTES: string | null; SITE_ID: number | null; P_DATE: string | null }

const legacyAccounts = (legacyAccountsJson as { recordset: LegacyAccount[] }).recordset;
const purchaseHeaders = (legacyPurchaseHeadersJson as { recordset: LegacyPurchase[] }).recordset;
const materialLines = (legacyMaterialLinesJson as { recordset: LegacyMaterial[] }).recordset;
const expenseLines = (legacyExpenseLinesJson as { recordset: LegacyExpense[] }).recordset;
type DemoDeposit = LegacyDeposit & { engineerId: number; referenceNo: string; notes: string };
export const demoEngineerDeposits: DemoDeposit[] = (legacyDepositsJson as { recordset: LegacyDeposit[] }).recordset.map((item) => ({
  ...item, engineerId: legacyAccounts.find((account) => account.ID === item.PID)?.ENG_ID ?? 0, referenceNo: '', notes: '',
}));
const round = (value: number) => Math.round(value * 100) / 100;

function identity(employeeId: number) {
  const employee = employeeOptions.find((item) => item.id === employeeId);
  return {
    employeeId, employeeCode: employee?.employeeCode ?? '', employeeName: employee?.name ?? `Engineer #${employeeId}`,
  };
}

export function buildDemoEngineerAccounts(): EngineerAccountSummary[] {
  const engineerIds = new Set([...legacyAccounts.map((item) => item.ENG_ID), ...purchaseHeaders.map((item) => item.SE_ID), ...demoEngineerDeposits.map((item) => item.engineerId)]);
  return [...engineerIds].map((employeeId) => {
    const deposits = demoEngineerDeposits.filter((item) => item.engineerId === employeeId);
    const purchases = purchaseHeaders.filter((item) => item.SE_ID === employeeId);
    const purchaseIds = purchases.map((item) => item.ID);
    const materials = materialLines.filter((item) => purchaseIds.includes(item.PID));
    const expenses = expenseLines.filter((item) => purchaseIds.includes(item.PID));
    const deposited = deposits.reduce((sum, item) => sum + Number(item.AMT || 0), 0);
    const materialTotal = materials.reduce((sum, item) => sum + Number(item.TOTAL || 0), 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.TOTAL || 0), 0);
    const dates = [...deposits.map((item) => item.DDATE ?? ''), ...materials.map((item) => item.P_DATE ?? ''), ...expenses.map((item) => item.P_DATE ?? '')].filter(Boolean).sort();
    return {
      ...identity(employeeId), walletId: employeeId, projectCount: new Set(purchases.map((item) => item.PRJ_ID)).size,
      depositCount: deposits.length, deposited: round(deposited), purchaseCount: purchases.length,
      materialTotal: round(materialTotal), expenseTotal: round(expenseTotal), purchased: round(materialTotal + expenseTotal),
      balance: round(deposited - materialTotal - expenseTotal), lastActivityDate: dates.at(-1) ?? null,
    };
  }).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function getDemoEngineerLedger(employeeId: number) {
  const purchases = purchaseHeaders.filter((item) => item.SE_ID === employeeId);
  const purchaseIds = purchases.map((item) => item.ID);
  const transactions: EngineerLedgerTransaction[] = [];
  for (const item of demoEngineerDeposits.filter((row) => row.engineerId === employeeId)) {
    const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
    transactions.push({ id: item.ID, type: 'deposit', transactionDate: item.DDATE, referenceNo: item.referenceNo, projectId: null, projectCode: null, projectName: null, siteId: item.SITE_ID, siteName: site?.name ?? '', description: item.notes || 'Funds received by engineer', notes: item.notes, purchaseId: 0, credit: Number(item.AMT || 0), debit: 0, balance: 0 });
  }
  for (const item of materialLines.filter((row) => purchaseIds.includes(row.PID))) {
    const header = purchases.find((row) => row.ID === item.PID)!;
    const material = materialOptions.find((row) => row.id === Number(item.PROD_ID));
    const unit = unitOptions.find((row) => row.id === Number(item.UOM));
    const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
    const project = projects.find((row) => row.id === header.PRJ_ID);
    transactions.push({ id: item.ID, type: 'material', transactionDate: item.P_DATE ?? header.ODATE, referenceNo: header.PUR_NO ?? `PUR-${header.ID}`, projectId: header.PRJ_ID, projectCode: project?.code ?? `#${header.PRJ_ID}`, projectName: project?.name ?? '', siteId: item.SITE_ID, siteName: site?.name ?? '', description: `${material?.name ?? 'Unspecified legacy material'}${item.QTY ? ` · ${item.QTY} ${unit?.code ?? unit?.name ?? ''}` : ''}`, notes: item.NOTES ?? '', purchaseId: header.ID, credit: 0, debit: Number(item.TOTAL || 0), balance: 0 });
  }
  for (const item of expenseLines.filter((row) => purchaseIds.includes(row.PID))) {
    const header = purchases.find((row) => row.ID === item.PID)!;
    const head = expenseHeadOptions.find((row) => row.id === Number(item.OTHER_EXP));
    const site = projectSites.find((row) => row.id === Number(item.SITE_ID));
    const project = projects.find((row) => row.id === header.PRJ_ID);
    transactions.push({ id: item.ID, type: 'expense', transactionDate: item.P_DATE ?? header.ODATE, referenceNo: header.PUR_NO ?? `PUR-${header.ID}`, projectId: header.PRJ_ID, projectCode: project?.code ?? `#${header.PRJ_ID}`, projectName: project?.name ?? '', siteId: item.SITE_ID, siteName: site?.name ?? '', description: head?.name ?? item.NOTES ?? 'Other site expense', notes: item.NOTES ?? '', purchaseId: header.ID, credit: 0, debit: Number(item.TOTAL || 0), balance: 0 });
  }
  transactions.sort((a, b) => String(a.transactionDate ?? '').localeCompare(String(b.transactionDate ?? '')) || (a.type === 'deposit' ? -1 : b.type === 'deposit' ? 1 : a.type.localeCompare(b.type)) || a.id - b.id);
  let runningCents = 0;
  for (const item of transactions) { runningCents += Math.round(item.credit * 100) - Math.round(item.debit * 100); item.balance = runningCents / 100; }
  const deposited = transactions.reduce((sum, item) => sum + Math.round(item.credit * 100), 0) / 100;
  const purchased = transactions.reduce((sum, item) => sum + Math.round(item.debit * 100), 0) / 100;
  return {
    ledger: { ...identity(employeeId), walletId: employeeId, deposited, purchased, balance: runningCents / 100 } as EngineerLedger,
    transactions: transactions.reverse(),
  };
}

export function addDemoEngineerDeposit(input: DepositInput) {
  const id = Math.max(0, ...demoEngineerDeposits.map((item) => item.ID)) + 1;
  demoEngineerDeposits.push({ ID: id, PID: 0, engineerId: input.employeeId, DDATE: input.depositDate, AMT: input.amount, SITE_ID: null, referenceNo: input.referenceNo, notes: input.notes });
  return id;
}

export function updateDemoEngineerDeposit(id: number, input: DepositInput) {
  const item = demoEngineerDeposits.find((row) => row.ID === id);
  if (!item) return false;
  Object.assign(item, { DDATE: input.depositDate, AMT: input.amount, referenceNo: input.referenceNo, notes: input.notes });
  return true;
}

export function deleteDemoEngineerDeposit(id: number) {
  const index = demoEngineerDeposits.findIndex((item) => item.ID === id);
  if (index < 0) return false;
  demoEngineerDeposits.splice(index, 1);
  return true;
}
