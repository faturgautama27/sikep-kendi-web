import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { AuditLog } from '@shared/models';
import type {
  AuditDataPort,
  AuditFilter,
  AuditPagination,
  AuditListResult,
  AuditExportFormat,
  AuditExportStatus,
} from '../ports/audit-data.port';
import { APP_ENV } from '../app-env.token';

interface AuditEnvelope<T> {
  success?: boolean;
  data?: T;
  meta?: { nextCursor?: string | number | null };
}

/**
 * Production HttpClient-based implementation of AuditDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiAuditData implements AuditDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(
    filter?: AuditFilter,
    pagination?: AuditPagination,
  ): Observable<AuditListResult> {
    let params = new HttpParams();
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    if (filter?.actorId) params = params.set('actorId', filter.actorId);
    if (filter?.role) params = params.set('role', filter.role);
    if (filter?.entity) params = params.set('entity', filter.entity);
    if (filter?.action) params = params.set('action', filter.action);
    if (pagination?.cursor) params = params.set('cursor', pagination.cursor);
    if (pagination?.limit !== undefined) {
      params = params.set('limit', String(pagination.limit));
    }
    return this.http
      .get<AuditListResult | AuditEnvelope<AuditLog[]>>(this.url('/audit-logs'), { params })
      .pipe(
        // Keep adapter output stable even if backend response envelope changes.
        // This avoids touching consumers in state/components.
        map((resp) => {
          if ((resp as AuditEnvelope<AuditLog[]>).success) {
            const env = resp as AuditEnvelope<AuditLog[]>;
            return {
              data: env.data ?? [],
              nextCursor:
                env.meta?.nextCursor !== undefined && env.meta.nextCursor !== null
                  ? String(env.meta.nextCursor)
                  : null,
            };
          }
          return resp as AuditListResult;
        }),
      );
  }

  getById(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(this.url(`/audit-logs/${id}`));
  }

  requestExport(
    format: AuditExportFormat,
    filter?: { from?: string; to?: string },
  ): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(this.url('/audit-logs/export'), {
      format,
      filter,
    });
  }

  getExportStatus(jobId: string): Observable<AuditExportStatus> {
    return this.http.get<AuditExportStatus>(this.url(`/audit-logs/export/${jobId}`));
  }
}
