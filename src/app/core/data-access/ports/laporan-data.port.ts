import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface LaporanBiayaFilter {
  startDate?: string;
  endDate?: string;
  kendaraanId?: number;
}

export interface LaporanBiayaResponse {
  summary: {
    totalKeseluruhan: number;
    totalNormatif: number;
    totalDarurat: number;
  };
  details: {
    normatif: any[];
    darurat: any[];
  };
}

export interface LaporanDataPort {
  getLaporanBiaya(filter: LaporanBiayaFilter): Observable<LaporanBiayaResponse>;
}

export const LAPORAN_DATA = new InjectionToken<LaporanDataPort>('LAPORAN_DATA');
