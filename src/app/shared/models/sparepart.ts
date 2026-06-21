import type { Uuid, Timestamp, Money } from './common';
import type { VehicleType } from './vehicle';

export type SparepartCategory =
  | 'oli'
  | 'rem'
  | 'ban'
  | 'lampu'
  | 'elektrikal'
  | 'mesin'
  | 'body'
  | 'lainnya';

export interface Sparepart {
  id: Uuid;
  kode: string;
  nama: string;
  kategori: SparepartCategory;
  satuan: string; // 'pcs', 'liter', 'set'
  hargaReferensi: Money;
  kompatibilitas: VehicleType[];
  active: boolean;
  createdAt: Timestamp;
}

export interface SparepartPriceHistory {
  id: Uuid;
  sparepartId: Uuid;
  hargaLama: Money;
  hargaBaru: Money;
  changedAt: Timestamp;
  changedBy: Uuid;
  changedByName: string;
}

export interface Vendor {
  id: Uuid;
  nama: string;
  npwp: string;
  alamat: string;
  kontak: string;
  email: string;
  kategoriDilayani: SparepartCategory[];
  active: boolean;
  rating: number; // 0-5
  createdAt: Timestamp;
}
