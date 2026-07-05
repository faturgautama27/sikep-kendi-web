import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { NOTIFICATION_DATA, type NotificationDataPort } from '@core/data-access/ports/notification-data.port';
import type {
  Notification,
  NotificationPreference,
  NotificationThresholds,
  Severity,
} from '@shared/models';

import {
  LoadNotifications,
  MarkAsRead,
  MarkAllAsRead,
  LoadNotificationPreferences,
  UpdatePreference,
} from './notifications.actions';

export interface NotificationsStateModel {
  inbox: Notification[];
  preferences: NotificationPreference[];
  thresholds: NotificationThresholds;
}

const INITIAL: NotificationsStateModel = {
  inbox: [],
  preferences: [],
  thresholds: {
    documentExpiringDaysBefore: 30,
    simExpiringDaysBefore: 30,
    pengajuanStuckBusinessDays: 3,
    unreadCriticalEscalationHours: 24,
    budgetThresholdPercent: 80,
  },
};

@State<NotificationsStateModel>({ name: 'notifications', defaults: INITIAL })
@Injectable()
export class NotificationsState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<NotificationDataPort>(NOTIFICATION_DATA);

  @Selector()
  static inbox(state: NotificationsStateModel): Notification[] {
    return state.inbox;
  }

  @Selector()
  static unreadCount(state: NotificationsStateModel): number {
    return state.inbox.filter((n) => n.readAt === null).length;
  }

  @Selector()
  static unreadBySeverity(state: NotificationsStateModel) {
    return (severity: Severity): number =>
      state.inbox.filter((n) => n.readAt === null && n.severity === severity).length;
  }

  @Selector()
  static preferences(state: NotificationsStateModel): NotificationPreference[] {
    return state.preferences;
  }

  @Selector()
  static thresholds(state: NotificationsStateModel): NotificationThresholds {
    return state.thresholds;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<NotificationsStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({
      inbox: action.payload.notifications as Notification[],
      preferences: action.payload.notificationPreferences as NotificationPreference[],
      thresholds: action.payload.notificationThresholds as NotificationThresholds,
    });
  }

  @Action(LoadNotifications)
  load(ctx: StateContext<NotificationsStateModel>) {
    if (this.env.previewMode) return;
    return this.data.inbox().pipe(
      tap((inbox) => ctx.patchState({ inbox })),
    );
  }

  @Action(MarkAsRead)
  markRead(ctx: StateContext<NotificationsStateModel>, action: MarkAsRead) {
    // Optimistic local update
    ctx.patchState({
      inbox: ctx.getState().inbox.map((n) =>
        n.id === action.id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    });
    if (this.env.previewMode) return;
    return this.data.markAsRead(action.id);
  }

  @Action(MarkAllAsRead)
  markAllRead(ctx: StateContext<NotificationsStateModel>) {
    const now = new Date().toISOString();
    // Optimistic local update
    ctx.patchState({
      inbox: ctx.getState().inbox.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)),
    });
    if (this.env.previewMode) return;
    return this.data.markAllAsRead();
  }

  @Action(LoadNotificationPreferences)
  loadPrefs(ctx: StateContext<NotificationsStateModel>) {
    if (this.env.previewMode) return;
    return this.data.getPreferences().pipe(
      tap((preferences) => ctx.patchState({ preferences })),
    );
  }

  @Action(UpdatePreference)
  updatePref(ctx: StateContext<NotificationsStateModel>, action: UpdatePreference) {
    ctx.patchState({ preferences: action.preferences });
    if (this.env.previewMode) return;
    return this.data.updatePreferences(action.preferences);
  }
}
