import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { LaporanDarurat, DaruratStatus } from '@shared/models';

export interface DaruratFilter {
  status?: DaruratStatus;
  pengemudiId?: string;
  limit?: number;
  cursor?: number;
}

export type DaruratCreateInput = Pick<
  LaporanDarurat,
  'kendaraanId' | 'deskripsiDarurat' | 'lokasiKejadian' | 'totalPengeluaran'
> & { fotoKerusakanIds?: number[]; fotoInvoiceIds?: number[] };

export interface DaruratDataPort {
  list(query?: DaruratFilter): Observable<LaporanDarurat[]>;
  detail(id: string): Observable<LaporanDarurat>;
  create(payload: DaruratCreateInput): Observable<LaporanDarurat>;
  update(id: string, payload: Partial<DaruratCreateInput>): Observable<LaporanDarurat>;
  verifikasi(id: string, approved: boolean, alasan?: string): Observable<LaporanDarurat>;
  approveReimbursement(id: string): Observable<LaporanDarurat>;
}

export const DARURAT_DATA = new InjectionToken<DaruratDataPort>('DARURAT_DATA');