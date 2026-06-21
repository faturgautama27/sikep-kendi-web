import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { PembayaranDataPort } from '../ports/pembayaran-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewPembayaranData implements PembayaranDataPort {
  detail(woId: string): Observable<unknown> {
    return of({ woId });
  }

  proses(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, status: 'MENUNGGU', ...payload });
  }

  bukti(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, status: 'PAID', ...payload });
  }
}
