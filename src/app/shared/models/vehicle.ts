import type { Uuid, Timestamp } from './common';
import type { Image } from './image';

export type VehicleStatus = 'active' | 'in_repair' | 'retired';
export type VehicleType = 'mobil' | 'motor' | 'truk' | 'bus' | 'lainnya';

export interface Vehicle {
  id: Uuid;
  nomorPolisi: string;
  nomorInventaris: string;
  merk: string;
  tipe: string;
  tahun: number;
  nomorRangka: string;
  nomorMesin: string;
  jenisKendaraan: VehicleType;
  unitKerja: string;
  status: VehicleStatus;
  odometerCurrent: number; // KM
  baselinePhotos: Image[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type DocumentType = 'STNK' | 'KIR' | 'BPKB' | 'PAJAK_TAHUNAN' | 'ASURANSI';
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired';

export interface VehicleDocument {
  id: Uuid;
  vehicleId: Uuid;
  jenis: DocumentType;
  nomor: string;
  tanggalTerbit: Timestamp;
  tanggalKadaluarsa: Timestamp;
  scanImageId: Uuid | null;
  status: DocumentStatus;
  daysToExpiry: number;
}

export interface OdometerReading {
  id: Uuid;
  vehicleId: Uuid;
  valueKm: number;
  recordedAt: Timestamp;
  recordedBy: Uuid; // userId
  recordedByName: string;
  source: 'manual' | 'fuel_transaction' | 'checklist';
}
