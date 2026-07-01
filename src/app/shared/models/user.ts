import type { Uuid, Timestamp } from './common';

export type RoleName =
  | 'pengemudi'
  | 'vendor'
  | 'pengurus_barang'
  | 'verifikator'
  | 'pptk'
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
  isActive: boolean;
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

export interface VendorAdmin {
  id: string;
  namaVendor: string;
  alamat: string;
  kontak: string;
  email: string;
  isAktif: boolean;
  createdAt?: string;
}

export interface EarlyWarningConfig {
  id: string;
  triggerType: string;
  triggerLabel: string;
  description?: string;
  ambangBulan?: number;
  ambangKm?: number;
  ambangHari?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
