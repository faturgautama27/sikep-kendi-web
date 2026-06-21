import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuditLog } from '@shared/models';

export interface AuditFilter {
  from?: string;
  to?: string;
  actorId?: string;
  role?: string;
  entity?: string;
  action?: string;
}

export interface AuditPagination {
  cursor?: string;
  limit?: number;
}

export interface AuditListResult {
  data: AuditLog[];
  nextCursor: string | null;
}

export type AuditExportFormat = 'csv' | 'pdf';

export type AuditExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AuditExportStatus {
  jobId: string;
  status: AuditExportJobStatus;
  downloadUrl?: string;
  hash?: string;
}

export interface AuditDataPort {
  list(filter?: AuditFilter, pagination?: AuditPagination): Observable<AuditListResult>;
  getById(id: string): Observable<AuditLog>;
  requestExport(
    format: AuditExportFormat,
    filter?: { from?: string; to?: string },
  ): Observable<{ jobId: string }>;
  getExportStatus(jobId: string): Observable<AuditExportStatus>;
}

export const AUDIT_DATA = new InjectionToken<AuditDataPort>('AUDIT_DATA');
