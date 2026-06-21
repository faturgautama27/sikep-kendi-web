import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { SpjExternal, SpjReportPeriode, InternalKind } from '@shared/models';
import type {
  SpjDataPort,
  SpjFilter,
  SpjUploadInput,
} from '../ports/spj-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of SpjDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiSpjData implements SpjDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(filter?: SpjFilter): Observable<SpjExternal[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.vendorId) params = params.set('vendorId', filter.vendorId);
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    return this.http.get<SpjExternal[]>(this.url('/spj'), { params });
  }

  getById(id: string): Observable<SpjExternal> {
    return this.http.get<SpjExternal>(this.url(`/spj/${id}`));
  }

  upload(input: SpjUploadInput): Observable<SpjExternal> {
    const form = new FormData();
    const { fileBlob, ...meta } = input;
    form.append('meta', JSON.stringify(meta));
    if (fileBlob) form.append('file', fileBlob);
    return this.http.post<SpjExternal>(this.url('/spj/upload'), form);
  }

  resolveAmbiguous(
    spjId: string,
    candidateRef: { kind: InternalKind; id: string },
  ): Observable<SpjExternal> {
    return this.http.post<SpjExternal>(
      this.url(`/spj/${spjId}/resolve`),
      candidateRef,
    );
  }

  markNeedsFollowUp(
    spjId: string,
    alasan: string,
    langkah: string,
  ): Observable<SpjExternal> {
    return this.http.post<SpjExternal>(this.url(`/spj/${spjId}/follow-up`), {
      alasan,
      langkah,
    });
  }

  getReport(period: { from: string; to: string }): Observable<SpjReportPeriode> {
    const params = new HttpParams().set('from', period.from).set('to', period.to);
    return this.http.get<SpjReportPeriode>(this.url('/spj/report'), { params });
  }
}
