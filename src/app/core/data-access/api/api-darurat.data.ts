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
      if (query.pengemudiId) params = params.set('pengemudiId', query.pengemudiId);
      if (query.startDate) params = params.set('startDate', query.startDate);
      if (query.endDate) params = params.set('endDate', query.endDate);
      if (query.kendaraanId) params = params.set('kendaraanId', query.kendaraanId);
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

  verifikasiFaseA(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/verifikasi-fase-a`), { approved, alasan, komentar }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  submitReimbursement(id: string, payload: { totalReimbursement: number, fotoNotaIds: number[], fotoSetelahPerbaikanIds: number[] }): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/submit-reimbursement`), payload).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  inputShs(id: string, items: any[]): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/input-shs`), { items }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  verifikasiVerifikator(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/verifikasi-verifikator`), { approved, alasan, komentar }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  pptkApprove(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/pptk-approve`), { approved, alasan, komentar }).pipe(
      map(res => this.unwrapOne(res))
    );
  }

  uploadBuktiPembayaran(id: string, imageId: number): Observable<LaporanDarurat> {
    return this.http.post<any>(this.url(`/darurat/${id}/bukti-pembayaran`), { imageId }).pipe(
      map(res => this.unwrapOne(res))
    );
  }
}
