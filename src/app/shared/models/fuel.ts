import type { Uuid, Timestamp, Money } from './common';
import type { Image } from './image';

export type FuelType =
  | 'pertalite'
  | 'pertamax'
  | 'pertamax_turbo'
  | 'dexlite'
  | 'pertamina_dex'
  | 'biosolar';

export interface FuelTransaction {
  id: Uuid;
  clientUuid: string;
  vehicleId: Uuid;
  vehiclePlate: string;
  driverId: Uuid;
  driverName: string;
  regulationVersionId: Uuid;
  tanggal: Timestamp;
  jenisBbm: FuelType;
  volumeLiter: number;
  hargaPerLiter: Money;
  totalNominal: Money;
  odometerValue: number;
  evidenceImageId: Uuid | null;
  evidenceImage: Image | null;
  overQuota: boolean;
  notes: string;
  createdAt: Timestamp;
}

export type QuotaScope = 'vehicle' | 'driver';
export type QuotaPeriod = 'daily' | 'weekly' | 'monthly';

export interface FuelQuota {
  id: Uuid;
  scope: QuotaScope;
  scopeId: Uuid;
  scopeName: string; // human-readable
  period: QuotaPeriod;
  kuotaLiter: number;
  realisasiLiter: number;
  sisaLiter: number;
  percentUsed: number;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  regulationVersionId: Uuid;
}
