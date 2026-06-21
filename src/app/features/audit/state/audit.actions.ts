export class LoadAuditLogs {
  static readonly type = '[Audit] Load Logs';
  readonly type = LoadAuditLogs.type;
}

export class FilterAuditLogs {
  static readonly type = '[Audit] Filter Logs';
  readonly type = FilterAuditLogs.type;
  constructor(
    public readonly filter: {
      from?: string;
      to?: string;
      actorId?: string;
      role?: string;
      entity?: string;
      action?: string;
    },
  ) {}
}

export class ExportAuditLog {
  static readonly type = '[Audit] Export Log';
  readonly type = ExportAuditLog.type;
  constructor(public readonly format: 'csv' | 'pdf') {}
}
