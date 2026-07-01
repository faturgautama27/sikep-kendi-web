import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { DaruratDataPort, DaruratFilter, DaruratCreateInput } from '../ports/darurat-data.port';
import { LaporanDarurat } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class PreviewDaruratData implements DaruratDataPort {
  list(query?: DaruratFilter): Observable<LaporanDarurat[]> {
    return of([]);
  }

  detail(id: string): Observable<LaporanDarurat> {
    return of({ id } as unknown as LaporanDarurat);
  }

  create(payload: DaruratCreateInput): Observable<LaporanDarurat> {
    return of(payload as unknown as LaporanDarurat);
  }

  update(id: string, payload: Partial<DaruratCreateInput>): Observable<LaporanDarurat> {
    return of({ id, ...payload } as unknown as LaporanDarurat);
  }

  verifikasiFaseA(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return of({ id, status: approved ? 'DISETUJUI_PB' : 'DITOLAK_PB', alasan, komentar } as unknown as LaporanDarurat);
  }

  submitReimbursement(id: string, payload: { totalReimbursement: number, fotoNotaIds: number[], fotoSetelahPerbaikanIds: number[] }): Observable<LaporanDarurat> {
    return of({ id, status: 'REIMBURSEMENT_DIAJUKAN', ...payload } as unknown as LaporanDarurat);
  }

  inputShs(id: string, items: any[]): Observable<LaporanDarurat> {
    return of({ id, status: 'SHS_DIKERJAKAN' } as unknown as LaporanDarurat);
  }

  verifikasiVerifikator(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return of({ id, status: approved ? 'MENUNGGU_PPTK' : 'DITOLAK_VERIFIKATOR', alasan, komentar } as unknown as LaporanDarurat);
  }

  pptkApprove(id: string, approved: boolean, alasan?: string, komentar?: string): Observable<LaporanDarurat> {
    return of({ id, status: approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK', alasan, komentar } as unknown as LaporanDarurat);
  }

  uploadBuktiPembayaran(id: string, imageId: number): Observable<LaporanDarurat> {
    return of({ id, status: 'DIBAYAR' } as unknown as LaporanDarurat);
  }
}
