import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  Notification,
  NotificationPreference,
  NotificationThresholds,
  Severity,
  TriggerKind,
} from '@shared/models';
import type { NotificationDataPort } from '../ports/notification-data.port';
import { APP_ENV } from '../app-env.token';

/** Shape yang dikembalikan backend untuk satu baris notifikasi */
interface BackendNotification {
  id: number;
  recipientId: number;
  title: string;
  message: string;
  severity: string;   // uppercase: INFO | WARNING | CRITICAL
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  entityKind?: string;
  entityId?: number;
  entityRef?: string;
  link?: string;
}

/**
 * Production HttpClient-based implementation of NotificationDataPort.
 *
 * Menyesuaikan response backend yang aktual:
 * - inbox → GET /notifications/inbox  → { data, nextCursor }
 * - markAsRead → POST /notifications/:id/read  (id = number)
 * - markAllAsRead → tidak ada endpoint; no-op (UI sudah update lokal di state)
 * - preferences / thresholds → belum ada endpoint di backend; return default lokal
 */
@Injectable({ providedIn: 'root' })
export class ApiNotificationData implements NotificationDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  /** Konversi row backend ke model frontend */
  private map(raw: BackendNotification): Notification {
    return {
      id: String(raw.id),
      recipientId: String(raw.recipientId),
      recipientName: '',
      severity: raw.severity.toLowerCase() as Severity,
      triggerKind: (raw.entityKind ?? 'deviation_unresponded') as TriggerKind,
      title: raw.title,
      message: raw.message,
      entityKind: raw.entityKind ?? null,
      entityId: raw.entityId != null ? String(raw.entityId) : null,
      entityRef: raw.entityRef ?? null,
      channelStatus: [],
      createdAt: raw.createdAt,
      readAt: raw.isRead ? (raw.updatedAt ?? raw.createdAt) : null,
      escalatedAt: null,
      link: raw.link ?? null,
    };
  }

  inbox(): Observable<Notification[]> {
    return this.http
      .get<{ data: BackendNotification[] }>(this.url('/notifications/inbox'))
      .pipe(map((res) => res.data.map((n) => this.map(n))));
  }

  markAsRead(id: string): Observable<Notification> {
    const numericId = Number(id);
    return this.http
      .post<BackendNotification>(this.url(`/notifications/${numericId}/read`), {})
      .pipe(map((raw) => this.map(raw)));
  }

  /** Backend belum punya endpoint mark-all; state sudah update lokal */
  markAllAsRead(): Observable<void> {
    return of(void 0);
  }

  /** Belum ada endpoint preferences di backend */
  getPreferences(): Observable<NotificationPreference[]> {
    return of([]);
  }

  /** Belum ada endpoint preferences di backend */
  updatePreferences(preferences: NotificationPreference[]): Observable<NotificationPreference[]> {
    return of(preferences);
  }

  /** Belum ada endpoint thresholds di backend */
  getThresholds(): Observable<NotificationThresholds> {
    return of({
      documentExpiringDaysBefore: 30,
      simExpiringDaysBefore: 30,
      pengajuanStuckBusinessDays: 3,
      unreadCriticalEscalationHours: 24,
      budgetThresholdPercent: 80,
    });
  }

  /** Belum ada endpoint thresholds di backend */
  updateThresholds(thresholds: NotificationThresholds): Observable<NotificationThresholds> {
    return of(thresholds);
  }
}
