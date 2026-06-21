import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
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
  load(_ctx: StateContext<NotificationsStateModel>) {}

  @Action(MarkAsRead)
  markRead(ctx: StateContext<NotificationsStateModel>, action: MarkAsRead) {
    ctx.patchState({
      inbox: ctx.getState().inbox.map((n) =>
        n.id === action.id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    });
  }

  @Action(MarkAllAsRead)
  markAllRead(ctx: StateContext<NotificationsStateModel>) {
    const now = new Date().toISOString();
    ctx.patchState({
      inbox: ctx.getState().inbox.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)),
    });
  }

  @Action(LoadNotificationPreferences)
  loadPrefs(_ctx: StateContext<NotificationsStateModel>) {}

  @Action(UpdatePreference)
  updatePref(ctx: StateContext<NotificationsStateModel>, action: UpdatePreference) {
    ctx.patchState({ preferences: action.preferences });
  }
}
