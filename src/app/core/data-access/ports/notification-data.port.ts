import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Notification,
  NotificationPreference,
  NotificationThresholds,
} from '@shared/models';

export interface NotificationDataPort {
  inbox(): Observable<Notification[]>;
  markAsRead(id: string): Observable<Notification>;
  markAllAsRead(): Observable<void>;
  getPreferences(): Observable<NotificationPreference[]>;
  updatePreferences(
    preferences: NotificationPreference[],
  ): Observable<NotificationPreference[]>;
  getThresholds(): Observable<NotificationThresholds>;
  updateThresholds(thresholds: NotificationThresholds): Observable<NotificationThresholds>;
}

export const NOTIFICATION_DATA = new InjectionToken<NotificationDataPort>('NOTIFICATION_DATA');
