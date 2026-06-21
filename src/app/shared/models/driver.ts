import type { Uuid, Timestamp } from './common';

export type SimType = 'A' | 'A_UMUM' | 'B1' | 'B1_UMUM' | 'B2' | 'B2_UMUM' | 'C' | 'D';
export type DriverStatus = 'active' | 'sim_expired' | 'inactive';

export interface Driver {
  id: Uuid;
  userId: Uuid;
  nama: string;
  nip: string;
  kontak: string;
  simJenis: SimType;
  simNomor: string;
  simKadaluarsa: Timestamp;
  simStatus: 'valid' | 'expiring_soon' | 'expired';
  daysToSimExpiry: number;
  status: DriverStatus;
  createdAt: Timestamp;
}

export type AssignmentMode = 'utama' | 'sementara';

export interface DriverAssignment {
  id: Uuid;
  driverId: Uuid;
  driverName: string;
  vehicleId: Uuid;
  vehiclePlate: string;
  mode: AssignmentMode;
  startAt: Timestamp;
  endAt: Timestamp | null;
  assignedBy: Uuid;
  assignedByName: string;
}

export interface DriverViolation {
  id: Uuid;
  driverId: Uuid;
  jenis: string;
  terjadiAt: Timestamp;
  nominal: number;
  docImageId: Uuid | null;
  description: string;
}
