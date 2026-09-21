import legacyProjectSites from '../../../../Data/PROJECT_SITE.json';
import { projects } from './projects';

export interface ProjectSiteRecord {
  id: number;
  projectId: number;
  projectName: string;
  projectCode: string;
  name: string;
  address: string;
  status: 'active' | 'completed' | 'on_hold';
}

interface LegacyProjectSite {
  ID: number;
  PID: number;
  SNAME: string;
  ADDRESS: string | null;
}

export const projectSites: ProjectSiteRecord[] = (legacyProjectSites.recordset as LegacyProjectSite[]).map((site) => {
  const project = projects.find((item) => item.id === Number(site.PID));
  return {
    id: Number(site.ID),
    projectId: Number(site.PID),
    projectName: project?.name ?? `Legacy project #${site.PID}`,
    projectCode: project?.code ?? `#${site.PID}`,
    name: site.SNAME,
    address: site.ADDRESS ?? '',
    status: 'active',
  };
});

export function nextProjectSiteId() {
  return Math.max(0, ...projectSites.map((site) => site.id)) + 1;
}
