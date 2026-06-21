import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Notification,
  NotificationPreference,
  NotificationThresholds,
} from '@shared/models';
import type { NotificationDataPort } from '../ports/notification-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of NotificationDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiNotificationData implements NotificationDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  inbox(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.url('/notifications/inbox'));
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.post<Notification>(this.url(`/notifications/${id}/read`), {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(this.url('/notifications/read-all'), {});
  }

  getPreferences(): Observable<NotificationPreference[]> {
    return this.http.get<NotificationPreference[]>(this.url('/notifications/preferences'));
  }

  updatePreferences(
    preferences: NotificationPreference[],
  ): Observable<NotificationPreference[]> {
    return this.http.put<NotificationPreference[]>(
      this.url('/notifications/preferences'),
      preferences,
    );
  }

  getThresholds(): Observable<NotificationThresholds> {
    return this.http.get<NotificationThresholds>(this.url('/notifications/thresholds'));
  }

  updateThresholds(thresholds: NotificationThresholds): Observable<NotificationThresholds> {
    return this.http.put<NotificationThresholds>(
      this.url('/notifications/thresholds'),
      thresholds,
    );
  }
}
