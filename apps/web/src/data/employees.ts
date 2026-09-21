import legacyEmployees from '../../../../Data/EMPLOYEES.json';
import legacyProjectAssignments from '../../../../Data/EMPLOYEES_P.json';
import legacySiteAssignments from '../../../../Data/EMPLOYEES_S.json';

export interface EmployeeRecord {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  hireDate: string;
  salary: number | null;
  department: string;
  address: string;
  status: 'active' | 'inactive';
  projectCount: number;
  siteCount: number;
}

interface LegacyEmployee {
  ID: number;
  EMP_ID: string | null;
  FIRSTNAME: string;
  LASTNAME: string;
  DOB: string | null;
  PHONE: string | null;
  EMAIL: string | null;
  HIREDATE: string | null;
  SALARY: number | null;
  DEPARTMENT: string | null;
  ADDRESS: string | null;
}

interface LegacyProjectAssignment { EMPID: number; PRJ_ID: number }
interface LegacySiteAssignment { EMPID: number; SITE_ID: number; PRJ_ID: number }

const projectLinks = legacyProjectAssignments.recordset as LegacyProjectAssignment[];
const siteLinks = legacySiteAssignments.recordset as LegacySiteAssignment[];

export const employeeRecords: EmployeeRecord[] = (legacyEmployees.recordset as LegacyEmployee[]).map((employee) => {
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
