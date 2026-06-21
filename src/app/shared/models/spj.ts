import type { Uuid, Timestamp, Money } from './common';

export type SpjKategori = 'BBM' | 'pemeliharaan' | 'lainnya';
export type SpjStatus = 'unmatched' | 'matched' | 'ambiguous' | 'needs_follow_up';
export type SpjMatchType = 'exact' | 'manual' | 'partial';
export type InternalKind = 'work_order' | 'fuel_transaction';

export interface SpjExternal {
  id: Uuid;
  nomorSpj: string;
  vendorId: Uuid;
  vendorNama: string;
  tanggalSpj: Timestamp;
  nominal: Money;
  kategori: SpjKategori;
  scanFileRef: string;
  uploadedBy: Uuid;
  uploadedByName: string;
  uploadedAt: Timestamp;
  status: SpjStatus;
  daysSinceUpload: number;
  match: SpjMatch | null;
  followUp: SpjFollowUp | null;
  candidates: SpjCandidate[];
}

export interface SpjMatch {
  id: Uuid;
  spjId: Uuid;
  internalKind: InternalKind;
  internalId: Uuid;
  internalRef: string;
  matchType: SpjMatchType;
  confidence: number; // 0-1
  decidedBy: Uuid;
  decidedByName: string;
  decidedAt: Timestamp;
  internalAmount: Money;
  diffAmount: Money;
}

export interface SpjCandidate {
  internalKind: InternalKind;
  internalId: Uuid;
  internalRef: string;
  vendor: string;
  tanggal: Timestamp;
  nominal: Money;
  matchScore: number;
  matchedCriteria: string[];
}

export interface SpjFollowUp {
  id: Uuid;
  spjId: Uuid;
  alasan: string;
  langkahTindakLanjut: string;
  setBy: Uuid;
  setByName: string;
  setAt: Timestamp;
}

export interface SpjReportPeriode {
  from: Timestamp;
  to: Timestamp;
  total: { count: number; nominal: Money };
  matched: { count: number; nominal: Money };
  ambiguous: { count: number; nominal: Money };
  unmatched: { count: number; nominal: Money };
  needsFollowUp: { count: number; nominal: Money };
  internalTotalMatched: Money;
  selisih: Money;
  isKlop: boolean;
}
