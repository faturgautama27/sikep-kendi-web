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

export interface LaporanFilter {
  startDate?: string;
  endDate?: string;
  kendaraanId?: number;
  vendorId?: number;
  status?: string;
  unitKerja?: string;
  kondisi?: string;
}

export interface LaporanDataPort {
  getLaporanBiaya(filter: LaporanBiayaFilter): Observable<LaporanBiayaResponse>;
  // Export URLs — return URL string untuk trigger download langsung via window.open atau anchor
  getExportBiayaUrl(filter?: LaporanFilter): string;
  getExportWorkOrderUrl(filter?: LaporanFilter): string;
  getExportPengajuanUrl(filter?: LaporanFilter): string;
  getExportDaftarBarangUrl(filter?: LaporanFilter): string;
  getExportHasilPemeliharaanUrl(filter?: LaporanFilter): string;
  getExportKartuPemeliharaanUrl(kendaraanId: string | number): string;
  // Data endpoints
  getWorkOrder(filter?: LaporanFilter): Observable<any[]>;
  getPengajuan(filter?: LaporanFilter): Observable<any[]>;
  getDaftarBarang(filter?: LaporanFilter): Observable<any[]>;
  getHasilPemeliharaan(filter?: LaporanFilter): Observable<any[]>;
  getKartuPemeliharaan(kendaraanId: string | number): Observable<any>;
}

export const LAPORAN_DATA = new InjectionToken<LaporanDataPort>('LAPORAN_DATA');
