import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { LaporanDataPort, LaporanBiayaFilter, LaporanBiayaResponse } from '../ports/laporan-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiLaporanData implements LaporanDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  getLaporanBiaya(filter: LaporanBiayaFilter): Observable<LaporanBiayaResponse> {
    let params = new HttpParams();
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.kendaraanId) params = params.set('kendaraanId', filter.kendaraanId);

    return this.http.get<any>(this.url('/laporan/biaya'), { params }).pipe(map(res => res.data ? res.data : res));
  }
}
