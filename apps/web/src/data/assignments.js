import legacyEmployees from '../../../../Data/EMPLOYEES.json';
import legacyProjectAssignments from '../../../../Data/EMPLOYEES_P.json';
import legacySiteAssignments from '../../../../Data/EMPLOYEES_S.json';
import { projects } from './projects';
import { projectSites } from './projectSites';
const employees = legacyEmployees.recordset;
const projectLinks = legacyProjectAssignments.recordset;
const siteLinks = legacySiteAssignments.recordset;
export const employeeAssignments = employees.map((employee) => {
    const projectIds = new Set([
        ...projectLinks.filter((link) => Number(link.EMPID) === Number(employee.ID)).map((link) => Number(link.PRJ_ID)),
        ...siteLinks.filter((link) => Number(link.EMPID) === Number(employee.ID)).map((link) => Number(link.PRJ_ID)),
    ]);
    return {
        id: Number(employee.ID),
        employeeCode: employee.EMP_ID?.trim() || `EMP-${employee.ID}`,
        name: `${employee.FIRSTNAME ?? ''} ${employee.LASTNAME ?? ''}`.replace(/\s+/g, ' ').trim(),
        phone: employee.PHONE ?? '',
        email: employee.EMAIL ?? '',
        address: employee.ADDRESS ?? '',
        status: 'active',
        projects: [...projectIds].map((id) => projects.find((project) => project.id === id)).filter(Boolean).map((project) => ({ id: project.id, code: project.code, name: project.name })),
        sites: siteLinks
            .filter((link) => Number(link.EMPID) === Number(employee.ID))
            .map((link) => projectSites.find((site) => site.id === Number(link.SITE_ID)))
            .filter(Boolean)
            .map((site) => ({ id: site.id, projectId: site.projectId, projectCode: site.projectCode, projectName: site.projectName, name: site.name, address: site.address })),
    };
});
export const employeeOptions = employeeAssignments.map(({ id, employeeCode, name, phone }) => ({ id, employeeCode, name, phone }));
