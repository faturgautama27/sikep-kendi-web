import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { PenawaranDataPort } from '../ports/penawaran-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiPenawaranData implements PenawaranDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  listByWorkOrder(woId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url(`/work-orders/${woId}/penawaran`));
  }

  detail(woId: string, id: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/work-orders/${woId}/penawaran/${id}`));
  }

  create(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/penawaran`), payload);
  }

  uploadInvoice(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/penawaran/${id}/invoice`), payload);
  }

  submit(woId: string, id: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/penawaran/${id}/submit`), {});
  }

  requestRevisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/penawaran/${id}/request-revisi`), payload);
  }

  revisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/penawaran/${id}/revisi`), payload);
  }
}
