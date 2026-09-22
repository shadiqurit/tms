export interface Role {
  id: number;
  key: string;
  name: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: Role;
}

export interface NavItem {
  id: number;
  label: string;
  route?: string;
  icon: string;
  badge?: string;
  permission?: string | string[];
  children?: NavItem[];
}
