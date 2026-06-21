/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { AuditLog } from '@shared/models';
import type {
  AuditDataPort,
  AuditFilter,
  AuditPagination,
  AuditListResult,
  AuditExportFormat,
  AuditExportStatus,
} from '../ports/audit-data.port';

/**
 * Preview-mode implementation of AuditDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.11.
 */
@Injectable({ providedIn: 'root' })
export class PreviewAuditData implements AuditDataPort {
  list(
    filter?: AuditFilter,
    pagination?: AuditPagination,
  ): Observable<AuditListResult> {
    return of({ data: [], nextCursor: null });
  }

  getById(id: string): Observable<AuditLog> {
    return of({ id } as unknown as AuditLog);
  }

  requestExport(
    format: AuditExportFormat,
    filter?: { from?: string; to?: string },
  ): Observable<{ jobId: string }> {
    return of({ jobId: 'preview' });
  }

  getExportStatus(jobId: string): Observable<AuditExportStatus> {
    return of({ jobId, status: 'completed' });
  }
}
