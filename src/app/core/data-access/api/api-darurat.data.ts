import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { DaruratDataPort } from '../ports/darurat-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiDaruratData implements DaruratDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(query?: Record<string, string | number | boolean | null | undefined>): Observable<unknown> {
    let params = new HttpParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== null && value !== undefined) {
          params = params.set(key, String(value));
        }
      }
    }
    return this.http.get<unknown>(this.url('/darurat'), { params });
  }

  detail(id: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/darurat/${id}`));
  }

  create(payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url('/darurat'), payload);
  }

  verifikasi(id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/darurat/${id}/verifikasi`), payload);
  }

  approveReimbursement(id: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/darurat/${id}/approve-reimbursement`), {});
  }
}
