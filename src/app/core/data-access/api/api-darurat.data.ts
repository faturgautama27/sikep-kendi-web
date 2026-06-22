import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import type { DaruratDataPort, DaruratFilter, DaruratCreateInput } from '../ports/darurat-data.port';
import { APP_ENV } from '../app-env.token';
import { LaporanDarurat } from '@shared/models';

interface ApiEnvelope<T> {
  data: T;
  meta?: any;
}

@Injectable({ providedIn: 'root' })
export class ApiDaruratData implements DaruratDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  private unwrapOne(res: any): LaporanDarurat {
    return res.data ? res.data : res;
  }

  private unwrapList(res: any): LaporanDarurat[] {
    return res.data ? res.data : res;
  }

  list(query?: DaruratFilter): Observable<LaporanDarurat[]> {
    let params = new HttpParams();
    if (query) {
      if (query.status) params = params.set('status', query.status);
      if (query.limit) params = params.set('limit', query.limit);
      if (query.cursor) params = params.set('cursor', query.cursor);
    }
    return this.http.get<any>(this.url('/darurat'), { params }).pipe(
      map(res => this.unwrapList(res))
    );
  }

  detail(id: string): Observable<LaporanDarurat> {
    return this.http.get<any>(this.url(`/darurat/${id}`)).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  create(payload: DaruratCreateInput): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url('/darurat'), {
      ...payload,
      clientUuid: crypto.randomUUID(),
      kendaraanId: Number(payload.kendaraanId),
      fotoKerusakanIds: payload.fotoKerusakanIds || [],
      fotoInvoiceIds: payload.fotoInvoiceIds || [],
    }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  update(id: string, payload: Partial<DaruratCreateInput>): Observable<LaporanDarurat> {
    const formatted: any = { ...payload };
    if (formatted.kendaraanId) formatted.kendaraanId = Number(formatted.kendaraanId);
    
    return this.http.patch<any>(this.url(`/darurat/${id}`), formatted).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  verifikasi(id: string, approved: boolean, alasan?: string): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/verifikasi`), { approved, alasan }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  approveReimbursement(id: string): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/approve-reimbursement`), {}).pipe(
      map(res => this.unwrapOne(res))
    );
  }
}
