import legacyExpenseTypes from '../../../../Data/EXPCOST.json';
import legacyExpensePayments from '../../../../Data/EXPAY_MST.json';
import legacyExpenseLines from '../../../../Data/EXPAY_DTL.json';
import { projects } from './projects';
const legacyTypes = legacyExpenseTypes.recordset;
const legacyLines = legacyExpenseLines.recordset;
export const expenseTypes = legacyTypes.map((item) => ({
    id: Number(item.ID),
    name: item.EXPNAME,
    phase: item.COST_TIME === 'Before' ? 'pre_award' : 'execution',
    refundable: item.TYP === 'YES',
    defaultRate: item.RATE,
    defaultAmount: item.AMT,
    defaultReturnAmount: item.RET,
    active: true,
    usageCount: legacyLines.filter((line) => Number(line.COST_ID) === Number(item.ID)).length,
}));
export const expenseRecords = legacyExpensePayments.recordset.map((item) => {
    const project = projects.find((projectItem) => projectItem.id === Number(item.PRJ_ID));
    const lines = legacyLines.filter((line) => Number(line.PID) === Number(item.ID)).map((line) => {
        const type = expenseTypes.find((typeItem) => typeItem.id === Number(line.COST_ID));
        return {
            id: Number(line.ID), expenseTypeId: Number(line.COST_ID || 0), expenseTypeName: type?.name ?? 'Unspecified expense',
            phase: type?.phase ?? 'pre_award', refundable: type?.refundable ?? false, quantity: line.QTY,
            unitName: line.UOM ?? '', amount: Number(line.AMT ?? 0), discount: Number(line.DISCOUNT ?? 0),
            returnedAmount: Number(line.RTN_AMT ?? 0), totalAmount: Number(line.TOTAL ?? 0),
            returnDate: line.RTN_DATE ?? '', notes: line.NOTES ?? '',
        };
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
