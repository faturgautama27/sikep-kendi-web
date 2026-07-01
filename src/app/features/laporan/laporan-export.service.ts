import { Injectable } from '@angular/core';
import * as xlsx from 'xlsx';
import type { LaporanBiayaResponse } from '@core/data-access/ports/laporan-data.port';

@Injectable({ providedIn: 'root' })
export class LaporanExportService {
  
  exportBiayaPerbaikan(data: LaporanBiayaResponse, filename: string = 'Laporan_Biaya_Perbaikan') {
    const wb = xlsx.utils.book_new();

    // 1. Sheet Ringkasan
    const ringkasanData = [
      ['Ringkasan Biaya Pemeliharaan'],
      [],
      ['Total Keseluruhan', data.summary.totalKeseluruhan],
      ['Total Servis Normatif', data.summary.totalNormatif],
      ['Total Perbaikan Darurat', data.summary.totalDarurat],
    ];

    const wsRingkasan = xlsx.utils.aoa_to_sheet(ringkasanData);
    
    // Formatting currency and styling for Ringkasan
    wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 20 }];
    const currencyFmt = '"Rp"#,##0';
    if (wsRingkasan['B3']) wsRingkasan['B3'].z = currencyFmt;
    if (wsRingkasan['B4']) wsRingkasan['B4'].z = currencyFmt;
    if (wsRingkasan['B5']) wsRingkasan['B5'].z = currencyFmt;

    xlsx.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

    // 2. Sheet Detail (Gabungan Normatif & Darurat atau pisah? Task: "Ringkasan dan Per Kendaraan")
    const detailData: any[][] = [
      ['Tipe Laporan', 'Plat Nomor', 'Pengemudi', 'Tanggal', 'Deskripsi', 'Total Biaya']
    ];

    // Map normatif
    data.details.normatif.forEach(n => {
      detailData.push([
        'Normatif',
        n.vehiclePlate || '-',
        n.driverName || '-',
        new Date(n.createdAt).toLocaleDateString('id-ID'),
        n.deskripsi || '-',
        n.total || 0
      ]);
    });

    // Map darurat
    data.details.darurat.forEach(d => {
      detailData.push([
        'Darurat',
        d.vehiclePlate || '-',
        d.driverName || '-',
        new Date(d.createdAt).toLocaleDateString('id-ID'),
        d.deskripsi || '-',
        d.total || 0
      ]);
    });

    const wsDetail = xlsx.utils.aoa_to_sheet(detailData);
    
    // Formatting column widths
    wsDetail['!cols'] = [
      { wch: 15 }, // Tipe
      { wch: 15 }, // Plat
      { wch: 20 }, // Pengemudi
      { wch: 15 }, // Tanggal
      { wch: 40 }, // Deskripsi
      { wch: 20 }, // Total
    ];

    // Format currency for Total Biaya column (F)
    const range = xlsx.utils.decode_range(wsDetail['!ref'] || 'A1:F1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellAddress = xlsx.utils.encode_cell({ r: R, c: 5 }); // F column
      if (wsDetail[cellAddress]) {
        wsDetail[cellAddress].z = currencyFmt;
      }
    }

    xlsx.utils.book_append_sheet(wb, wsDetail, 'Detail Per Kendaraan');

    // Generate buffer and trigger download
    xlsx.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
  }
}
