import legacyEmployees from '../../../../Data/EMPLOYEES.json';
import legacyProjectAssignments from '../../../../Data/EMPLOYEES_P.json';
import legacySiteAssignments from '../../../../Data/EMPLOYEES_S.json';
const projectLinks = legacyProjectAssignments.recordset;
const siteLinks = legacySiteAssignments.recordset;
export const employeeRecords = legacyEmployees.recordset.map((employee) => {
    const projectIds = new Set([
        ...projectLinks.filter((link) => Number(link.EMPID) === Number(employee.ID)).map((link) => Number(link.PRJ_ID)),
        ...siteLinks.filter((link) => Number(link.EMPID) === Number(employee.ID)).map((link) => Number(link.PRJ_ID)),
    ]);
    const firstName = employee.FIRSTNAME?.trim() ?? '';
    const lastName = employee.LASTNAME?.trim() ?? '';
    return {
        id: Number(employee.ID),
        employeeCode: employee.EMP_ID?.trim() || `EMP-${employee.ID}`,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim(),
        dateOfBirth: employee.DOB ?? '',
        phone: employee.PHONE ?? '',
        email: employee.EMAIL ?? '',
        hireDate: employee.HIREDATE ?? '',
        salary: employee.SALARY === null ? null : Number(employee.SALARY),
        department: employee.DEPARTMENT ?? '',
        address: employee.ADDRESS ?? '',
        status: 'active',
        projectCount: projectIds.size,
        siteCount: siteLinks.filter((link) => Number(link.EMPID) === Number(employee.ID)).length,
    };
});
export function nextEmployeeId() {
    return Math.max(0, ...employeeRecords.map((employee) => employee.id)) + 1;
}
