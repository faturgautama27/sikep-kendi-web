import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { VerifikasiDataPort } from '../ports/verifikasi-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiVerifikasiData implements VerifikasiDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  detail(woId: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/work-orders/${woId}/verifikasi-detail`));
  }

  shs(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/verifikasi/shs`), payload);
  }

  approve(woId: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/verifikasi/approve`), {});
  }

  revisi(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/verifikasi/revisi`), payload);
  }

  pptkApprove(woId: string, approved: boolean, alasan?: string, komentar?: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/verifikasi/pptk-approve`), { approved, alasan, komentar });
  }
}
