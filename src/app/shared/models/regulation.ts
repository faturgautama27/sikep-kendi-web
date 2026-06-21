import type { Uuid, Timestamp } from './common';
import type { VehicleType } from './vehicle';

export type RegulationCategory =
  | 'interval_servis'
  | 'batas_bbm'
  | 'kewajiban_dokumen'
  | 'pagu_anggaran'
  | 'eskalasi';

export interface Regulation {
  id: Uuid;
  nama: string;
  kategori: RegulationCategory;
  description: string;
  currentVersionId: Uuid;
  createdAt: Timestamp;
}

export interface RegulationVersion {
  id: Uuid;
  regulationId: Uuid;
  versionNo: number;
  effectiveAt: Timestamp;
  publishedAt: Timestamp;
  publishedBy: Uuid;
  publishedByName: string;
  summary: string;
  rules: RegulationRule[];
}

export interface RegulationRule {
  id: Uuid;
  regulationVersionId: Uuid;
  vehicleType: VehicleType | 'all';
  params: Record<string, unknown>; // structured key-value
  description: string;
}

export interface RegulationChangeHistoryEntry {
  id: Uuid;
  regulationId: Uuid;
  versionFromId: Uuid | null;
  versionToId: Uuid;
  occurredAt: Timestamp;
  actorId: Uuid;
  actorName: string;
  reason: string;
}
