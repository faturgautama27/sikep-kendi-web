import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { PembayaranDataPort } from '../ports/pembayaran-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiPembayaranData implements PembayaranDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  detail(woId: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/work-orders/${woId}/pembayaran-detail`));
  }

  proses(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/pembayaran/proses`), payload);
  }

  bukti(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/pembayaran/bukti`), payload);
  }
}
