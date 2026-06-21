import type { Uuid, Timestamp } from './common';

export type RoleName =
  | 'pengemudi'
  | 'vendor'
  | 'pengurus_barang'
  | 'verifikator'
  | 'bendahara'
  | 'admin_sistem'
;

export interface User {
  id: Uuid;
  username: string;
  fullName: string;
  email: string;
  contact: string | null;
  unitKerja: string;
  roles: RoleName[];
  permissions: string[]; // format 'resource.action'
  active: boolean;
  forceChangePassword: boolean;
  lastLoginAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface Role {
  id: Uuid;
  name: RoleName;
  displayName: string;
  permissionIds: Uuid[];
}

export interface Permission {
  id: Uuid;
  name: string; // 'resource.action'
  description: string;
}
