export type ToastSeverity = 'info' | 'success' | 'warn' | 'error';

export interface ToastPayload {
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  life?: number; // ms
}

export class ShowToast {
  static readonly type = '[UI] Show Toast';
  readonly type = ShowToast.type;
  constructor(public readonly toast: ToastPayload) {}
}

export class DismissToast {
  static readonly type = '[UI] Dismiss Toast';
  readonly type = DismissToast.type;
  constructor(public readonly id: string) {}
}

export class SetGlobalLoading {
  static readonly type = '[UI] Set Global Loading';
  readonly type = SetGlobalLoading.type;
  constructor(public readonly loading: boolean) {}
}

export type SyncStatus = 'idle' | 'queued' | 'syncing' | 'error';

export class SetSyncStatus {
  static readonly type = '[UI] Set Sync Status';
  readonly type = SetSyncStatus.type;
  constructor(public readonly status: SyncStatus, public readonly queueCount: number = 0) {}
}
