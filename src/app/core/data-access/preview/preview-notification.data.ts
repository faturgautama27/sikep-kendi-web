/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type {
  Notification,
  NotificationPreference,
  NotificationThresholds,
} from '@shared/models';
import type { NotificationDataPort } from '../ports/notification-data.port';

/**
 * Preview-mode implementation of NotificationDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.10.
 */
@Injectable({ providedIn: 'root' })
export class PreviewNotificationData implements NotificationDataPort {
  inbox(): Observable<Notification[]> {
    return of([]);
  }

  markAsRead(id: string): Observable<Notification> {
    return of({ id } as unknown as Notification);
  }

  markAllAsRead(): Observable<void> {
    return of(void 0);
  }

  getPreferences(): Observable<NotificationPreference[]> {
    return of([]);
  }

  updatePreferences(
    preferences: NotificationPreference[],
  ): Observable<NotificationPreference[]> {
    return of(preferences);
  }

  getThresholds(): Observable<NotificationThresholds> {
    return of({
      documentExpiringDaysBefore: 30,
      simExpiringDaysBefore: 30,
      pengajuanStuckBusinessDays: 3,
      unreadCriticalEscalationHours: 24,
      budgetThresholdPercent: 80,
    });
  }

  updateThresholds(thresholds: NotificationThresholds): Observable<NotificationThresholds> {
    return of(thresholds);
  }
}
