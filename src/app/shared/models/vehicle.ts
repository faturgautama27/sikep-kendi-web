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
  tanggalHabisPajak?: string;
  tanggalHabisSTNK?: string;
  // Early warning fields
  intervalServisHari?: number | null; // jumlah hari antar servis berkala
  intervalServisKm?: number | null; // jarak km antar servis berkala
  odometerServisTerakhir?: number | null; // odometer saat servis terakhir
  paguTahunan?: number | null; // pagu anggaran tahunan kendaraan (Rp)
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

export type KomponenEweStatus = 'HIJAU' | 'KUNING' | 'MERAH';

export interface Komponen {
  id: string;
  kendaraanId: string;
  namaKomponen: string;
  tanggalPasang: string; // ISO date
  umurEstimasiBulan: number;
  kmGantiEstimasi: number;
  eweStatus: KomponenEweStatus;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
