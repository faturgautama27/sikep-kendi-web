import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { VerifikasiDataPort } from '../ports/verifikasi-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewVerifikasiData implements VerifikasiDataPort {
  detail(woId: string): Observable<unknown> {
    return of({ woId });
  }

  shs(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, ...payload });
  }

  approve(woId: string): Observable<unknown> {
    return of({ woId, status: 'DISETUJUI' });
  }

  revisi(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, status: 'REVISI_DIMINTA', ...payload });
  }

  pptkApprove(woId: string, approved: boolean, alasan?: string, komentar?: string): Observable<unknown> {
    return of({ woId, status: approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK', alasan, komentar });
  }
}
