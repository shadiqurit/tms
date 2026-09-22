import legacyExpenseTypes from '../../../../Data/EXPCOST.json';
import legacyExpensePayments from '../../../../Data/EXPAY_MST.json';
import legacyExpenseLines from '../../../../Data/EXPAY_DTL.json';
import { projects } from './projects';

export type ExpensePhase = 'pre_award' | 'execution';

export interface ExpenseTypeRecord {
  id: number;
  name: string;
  phase: ExpensePhase;
  refundable: boolean;
  defaultRate: number | null;
  defaultAmount: number | null;
  defaultReturnAmount: number | null;
  active: boolean;
  usageCount: number;
}

export interface ExpenseLineRecord {
  id: number;
  costId: number;
  costName: string;
  phase: ExpensePhase | null;
  returnable: boolean;
  returnableSource: 'YES' | 'NO' | null;
  quantity: number | null;
  unitName: string;
  amount: number;
  discount: number;
  returnedAmount: number;
  totalAmount: number;
  returnDate: string;
  notes: string;
}

export interface ExpenseRecord {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  paymentNo: string;
  payTo: string;
  payeeAddress: string;
  paymentDate: string;
  paymentType: string;
  referenceNo: string;
  referenceDate: string;
  notes: string;
  status: 'draft' | 'posted' | 'cancelled';
  lines: ExpenseLineRecord[];
}

interface LegacyExpenseType { ID: number; EXPNAME: string; COST_TIME: string | null; TYP: string; RATE: number | null; AMT: number | null; RET: number | null }
interface LegacyExpensePayment { ID: number; PAY_NO: string | null; PAY_TO: string | null; SUP_ADD: string | null; PDATE: string; PAY_TYPE: string | null; CHALLAN: string | null; CH_DATE: string | null; NOTES: string | null; PRJ_ID: number }
interface LegacyExpenseLine { ID: number; PID: number; COST_ID: number | null; CTYPE: string | null; QTY: number | null; UOM: string | null; AMT: number | null; DISCOUNT: number | null; RTN_AMT: number | null; TOTAL: number | null; RTN_DATE: string | null; NOTES: string | null }

const legacyTypes = legacyExpenseTypes.recordset as LegacyExpenseType[];
const legacyLines = legacyExpenseLines.recordset as LegacyExpenseLine[];

export const expenseTypes: ExpenseTypeRecord[] = legacyTypes.map((item) => ({
  id: Number(item.ID),
  name: item.EXPNAME,
  phase: String(item.COST_TIME ?? '').trim().toUpperCase() === 'BEFORE' ? 'pre_award' : 'execution',
  refundable: String(item.TYP ?? '').trim().toUpperCase() === 'YES',
  defaultRate: item.RATE,
  defaultAmount: item.AMT,
  defaultReturnAmount: item.RET,
  active: true,
  usageCount: legacyLines.filter((line) => Number(line.COST_ID) === Number(item.ID)).length,
}));

export const expenseRecords: ExpenseRecord[] = (legacyExpensePayments.recordset as LegacyExpensePayment[]).map((item) => {
  const project = projects.find((projectItem) => projectItem.id === Number(item.PRJ_ID));
  const lines = legacyLines.filter((line) => Number(line.PID) === Number(item.ID)).map((line) => {
    const type = expenseTypes.find((typeItem) => typeItem.id === Number(line.COST_ID));
    return {
      id: Number(line.ID), costId: Number(line.COST_ID || 0), costName: type?.name ?? 'Unspecified expense',
      phase: type?.phase ?? null, returnable: line.CTYPE === 'YES',
      returnableSource: line.CTYPE === 'YES' ? 'YES' : line.CTYPE === 'NO' ? 'NO' : null, quantity: line.QTY,
      unitName: line.UOM ?? '', amount: Number(line.AMT ?? 0), discount: Number(line.DISCOUNT ?? 0),
      returnedAmount: Number(line.RTN_AMT ?? 0), totalAmount: Number(line.TOTAL ?? 0),
      returnDate: line.RTN_DATE ?? '', notes: line.NOTES ?? '',
    } satisfies ExpenseLineRecord;
  });
  return {
    id: Number(item.ID), projectId: Number(item.PRJ_ID), projectCode: project?.code ?? `#${item.PRJ_ID}`,
    projectName: project?.name ?? 'Unknown project', paymentNo: item.PAY_NO ?? '', payTo: item.PAY_TO ?? '',
    payeeAddress: item.SUP_ADD ?? '', paymentDate: item.PDATE, paymentType: item.PAY_TYPE ?? '',
    referenceNo: item.CHALLAN ?? '', referenceDate: item.CH_DATE ?? '', notes: item.NOTES ?? '',
    status: 'posted', lines,
  };
});

export function nextExpenseId() {
  return Math.max(0, ...expenseRecords.map((item) => item.id)) + 1;
}

export function nextExpenseLineId() {
  return Math.max(0, ...expenseRecords.flatMap((item) => item.lines.map((line) => line.id))) + 1;
}
