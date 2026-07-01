import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { LaporanDataPort, LaporanBiayaFilter, LaporanBiayaResponse } from '../ports/laporan-data.port';

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
}
