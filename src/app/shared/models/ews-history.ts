import type { Uuid, Timestamp, Severity } from './common';
import type { TriggerKind } from './notification';

export interface EwsHistoryFilter {
  startDate?: string | null;
  endDate?: string | null;
  triggerKind?: TriggerKind | 'all';
  severity?: Severity | 'all';
  entityKind?: string | 'all';
  status?: 'read' | 'unread' | 'all';
  recipientId?: Uuid | null;
}

export interface EwsHistoryItem {
  id: Uuid;
  recipientId: Uuid;
  recipientName: string;
  severity: Severity;
  triggerKind: TriggerKind;
  triggerLabel: string;
  title: string;
  message: string;
  entityKind: string | null;
  entityId: Uuid | null;
  entityRef: string | null;
  channelsSent: string[]; // ['in_app', 'email']
  createdAt: Timestamp;
  readAt: Timestamp | null;
  escalatedAt: Timestamp | null;
  link: string | null;
}

export interface EwsStatistics {
  totalNotifications: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  unreadCount: number;
  escalatedCount: number;
  byTriggerKind: Record<TriggerKind, number>;
  byEntityKind: Record<string, number>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

export interface EwsTrendData {
  date: string;
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface EwsHistoryResponse {
  data: EwsHistoryItem[];
  statistics: EwsStatistics;
  trends: EwsTrendData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Helper constants
export const TRIGGER_KIND_LABELS: Record<TriggerKind, string> = {
  document_expiring: 'Dokumen Akan Kadaluarsa',
  document_expired: 'Dokumen Kadaluarsa',
  sim_expiring: 'SIM Akan Kadaluarsa',
  sim_expired: 'SIM Kadaluarsa',
  service_due_km: 'Servis Jatuh Tempo (KM)',
  service_due_time: 'Servis Jatuh Tempo (Waktu)',
  deviation_unresponded: 'Deviasi Belum Direspon',
  pengajuan_stuck: 'Pengajuan Terhenti',
  budget_threshold: 'Threshold Anggaran',
  spj_unmatched_7d: 'SPJ Belum Match >7 Hari',
  spj_unmatched_14d: 'SPJ Belum Match >14 Hari',
  recurring_deviation: 'Deviasi Berulang',
  over_quota_bbm: 'BBM Melebihi Quota',
};

export const ENTITY_KIND_LABELS: Record<string, string> = {
  Vehicle: 'Kendaraan',
  Driver: 'Pengemudi',
  WorkOrder: 'Work Order',
  Pengajuan: 'Pengajuan',
  SpjExternal: 'SPJ External',
};
