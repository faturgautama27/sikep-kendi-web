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

  verifikasi(id: string, approved: boolean, alasan?: string): Observable<LaporanDarurat> {
    return of({ id, status: approved ? 'TERVERIFIKASI' : 'DITOLAK', alasan } as unknown as LaporanDarurat);
  }

  approveReimbursement(id: string): Observable<LaporanDarurat> {
    return of({ id, status: 'REIMBURSE_APPROVED' } as unknown as LaporanDarurat);
  }
}
