import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { LaporanDataPort, LaporanBiayaFilter, LaporanBiayaResponse, LaporanFilter } from '../ports/laporan-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewLaporanData implements LaporanDataPort {
  getLaporanBiaya(filter: LaporanBiayaFilter): Observable<LaporanBiayaResponse> {
    return of({
      summary: { totalKeseluruhan: 18500000, totalNormatif: 12000000, totalDarurat: 6500000 },
      details: {
        normatif: [],
        darurat: [
          {
            id: 1,
            createdAt: filter.startDate || new Date().toISOString(),
            vehiclePlate: 'B 1234 CD',
            driverName: 'Budi Santoso',
            deskripsi: 'Ban pecah di jalan tol',
            total: 2500000,
          },
          {
            id: 2,
            createdAt: filter.endDate || new Date().toISOString(),
            vehiclePlate: 'B 5678 EF',
            driverName: 'Andi Pratama',
            deskripsi: 'Aki soak mendadak',
            total: 4000000,
          }
        ]
      }
    });
  }

  getExportBiayaUrl(filter?: LaporanFilter): string {
    return '#preview-export-biaya';
  }

  getExportWorkOrderUrl(filter?: LaporanFilter): string {
    return '#preview-export-workorder';
  }

  getExportPengajuanUrl(filter?: LaporanFilter): string {
    return '#preview-export-pengajuan';
  }

  getExportDaftarBarangUrl(filter?: LaporanFilter): string {
    return '#preview-export-daftar-barang';
  }

  getExportHasilPemeliharaanUrl(filter?: LaporanFilter): string {
    return '#preview-export-hasil-pemeliharaan';
  }

  getExportKartuPemeliharaanUrl(kendaraanId: string | number): string {
    return `#preview-export-kartu-${kendaraanId}`;
  }

  getWorkOrder(filter?: LaporanFilter): Observable<any[]> {
    return of([]);
  }

  getPengajuan(filter?: LaporanFilter): Observable<any[]> {
    return of([]);
  }

  getDaftarBarang(filter?: LaporanFilter): Observable<any[]> {
    return of([]);
  }

  getHasilPemeliharaan(filter?: LaporanFilter): Observable<any[]> {
    return of([]);
  }

  getKartuPemeliharaan(kendaraanId: string | number): Observable<any> {
    return of(null);
  }
}
