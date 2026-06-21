import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Pengajuan, ApprovalPolicy } from '@shared/models';
import type {
  PengajuanDataPort,
  PengajuanFilter,
  PengajuanCreateInput,
} from '../ports/pengajuan-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of PengajuanDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiPengajuanData implements PengajuanDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(filter?: PengajuanFilter): Observable<Pengajuan[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.jenis) params = params.set('jenis', filter.jenis);
    if (filter?.vehicleId) params = params.set('vehicleId', filter.vehicleId);
    return this.http.get<Pengajuan[]>(this.url('/pengajuan'), { params });
  }

  getById(id: string): Observable<Pengajuan> {
    return this.http.get<Pengajuan>(this.url(`/pengajuan/${id}`));
  }

  create(input: PengajuanCreateInput): Observable<Pengajuan> {
    return this.http.post<Pengajuan>(this.url('/pengajuan'), input);
  }

  submit(id: string): Observable<Pengajuan> {
    return this.http.post<Pengajuan>(this.url(`/pengajuan/${id}/submit`), {});
  }

  approve(id: string, jenjangNo: number, comment: string): Observable<Pengajuan> {
    return this.http.post<Pengajuan>(this.url(`/pengajuan/${id}/approve`), {
      jenjangNo,
      comment,
    });
  }

  reject(id: string, reason: string): Observable<Pengajuan> {
    return this.http.post<Pengajuan>(this.url(`/pengajuan/${id}/reject`), { reason });
  }

  listApprovalPolicies(): Observable<ApprovalPolicy[]> {
    return this.http.get<ApprovalPolicy[]>(this.url('/approval-policies'));
  }

  updateApprovalPolicies(policies: ApprovalPolicy[]): Observable<ApprovalPolicy[]> {
    return this.http.put<ApprovalPolicy[]>(this.url('/approval-policies'), policies);
  }
}
