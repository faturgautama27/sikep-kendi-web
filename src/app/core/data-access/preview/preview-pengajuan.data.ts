/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Pengajuan, ApprovalPolicy } from '@shared/models';
import type {
  PengajuanDataPort,
  PengajuanFilter,
  PengajuanCreateInput,
} from '../ports/pengajuan-data.port';

/**
 * Preview-mode implementation of PengajuanDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.7.
 */
@Injectable({ providedIn: 'root' })
export class PreviewPengajuanData implements PengajuanDataPort {
  list(filter?: PengajuanFilter): Observable<Pengajuan[]> {
    return of([]);
  }

  getById(id: string): Observable<Pengajuan> {
    return of({ id } as unknown as Pengajuan);
  }

  create(input: PengajuanCreateInput): Observable<Pengajuan> {
    return of({ ...input, id: 'preview', status: 'draft' } as unknown as Pengajuan);
  }

  submit(id: string): Observable<Pengajuan> {
    return of({ id, status: 'submitted' } as unknown as Pengajuan);
  }

  approve(id: string, vendorId: string, komentarVerifikasi?: string): Observable<Pengajuan> {
    return of({ id, status: 'approved' } as unknown as Pengajuan);
  }

  reject(id: string, reason: string): Observable<Pengajuan> {
    return of({ id, status: 'rejected' } as unknown as Pengajuan);
  }

  listApprovalPolicies(): Observable<ApprovalPolicy[]> {
    return of([]);
  }

  updateApprovalPolicies(policies: ApprovalPolicy[]): Observable<ApprovalPolicy[]> {
    return of(policies);
  }
}
