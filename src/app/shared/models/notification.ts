import type { Uuid, Timestamp, Severity } from './common';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms';
export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed' | 'retrying';
export type TriggerKind =
  | 'document_expiring'
  | 'document_expired'
  | 'sim_expiring'
  | 'sim_expired'
  | 'service_due_km'
  | 'service_due_time'
  | 'deviation_unresponded'
  | 'pengajuan_stuck'
  | 'budget_threshold'
  | 'spj_unmatched_7d'
  | 'spj_unmatched_14d'
  | 'recurring_deviation'
  | 'over_quota_bbm';

export interface ChannelStatus {
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempts: number;
  lastAttemptAt: Timestamp | null;
  errorMessage: string | null;
}

export interface Notification {
  id: Uuid;
  recipientId: Uuid;
  recipientName: string;
  severity: Severity;
  triggerKind: TriggerKind;
  title: string;
  message: string;
  entityKind: string | null;
  entityId: Uuid | null;
  entityRef: string | null; // human-readable like 'B 1234 ABC'
  channelStatus: ChannelStatus[];
  createdAt: Timestamp;
  readAt: Timestamp | null;
  escalatedAt: Timestamp | null;
  link: string | null; // route untuk deep-link
}

export interface NotificationPreference {
  userId: Uuid;
  severity: Severity;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationThresholds {
  documentExpiringDaysBefore: number;
  simExpiringDaysBefore: number;
  pengajuanStuckBusinessDays: number;
  unreadCriticalEscalationHours: number;
  budgetThresholdPercent: number;
}
