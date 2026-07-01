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
  'kendaraanId' | 'deskripsiDarurat' | 'lokasiKejadian' | 'estimasiBiaya'
> & { fotoKerusakanIds?: number[]; latitude?: number; longitude?: number };

export interface DaruratDataPort {
  list(query?: DaruratFilter): Observable<LaporanDarurat[]>;
  detail(id: string): Observable<LaporanDarurat>;
  create(payload: DaruratCreateInput): Observable<LaporanDarurat>;
  update(id: string, payload: Partial<DaruratCreateInput>): Observable<LaporanDarurat>;
  verifikasiFaseA(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat>;
  submitReimbursement(id: string, payload: { totalReimbursement: number, fotoNotaIds: number[], fotoSetelahPerbaikanIds: number[] }): Observable<LaporanDarurat>;
  inputShs(id: string, items: any[]): Observable<LaporanDarurat>;
  verifikasiVerifikator(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat>;
  pptkApprove(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat>;
  uploadBuktiPembayaran(id: string, imageId: number): Observable<LaporanDarurat>;
}

export const DARURAT_DATA = new InjectionToken<DaruratDataPort>('DARURAT_DATA');