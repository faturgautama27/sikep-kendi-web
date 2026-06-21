import type { NotificationPreference } from '@shared/models';

export class LoadNotifications {
  static readonly type = '[Notifications] Load Inbox';
  readonly type = LoadNotifications.type;
}

export class MarkAsRead {
  static readonly type = '[Notifications] Mark As Read';
  readonly type = MarkAsRead.type;
  constructor(public readonly id: string) {}
}

export class MarkAllAsRead {
  static readonly type = '[Notifications] Mark All As Read';
  readonly type = MarkAllAsRead.type;
}

export class LoadNotificationPreferences {
  static readonly type = '[Notifications] Load Preferences';
  readonly type = LoadNotificationPreferences.type;
}

export class UpdatePreference {
  static readonly type = '[Notifications] Update Preference';
  readonly type = UpdatePreference.type;
  constructor(public readonly preferences: NotificationPreference[]) {}
}
