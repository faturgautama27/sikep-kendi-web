import { Injectable } from '@angular/core';
import * as xlsx from 'xlsx';
import type { LaporanBiayaResponse } from '@core/data-access/ports/laporan-data.port';
import type { ReportType } from './laporan-list.component';

@Injectable({ providedIn: 'root' })
export class LaporanExportService {

  /**
   * Buka window baru dengan konten laporan yang diformat untuk cetak/PDF.
   * Browser's "Save as PDF" akan menyertakan gambar dokumentasi jika tersedia.
   */
  printReport(title: string, dateRange: Date[], rows: any[], type: ReportType): void {
    const [from, to] = dateRange;
    const periodeStr = `${from?.toLocaleDateString('id-ID') ?? '-'} s/d ${to?.toLocaleDateString('id-ID') ?? '-'}`;
    const now = new Date().toLocaleString('id-ID');

    const tableHtml = this.buildTableHtml(rows, type);

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    h1 { font-size: 16px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
    .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger  { background: #fee2e2; color: #991b1b; }
    .badge-warn    { background: #fef9c3; color: #854d0e; }
    .badge-info    { background: #dbeafe; color: #1e40af; }
    .photos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .photos img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
    .detail-row { padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .detail-row p { margin-bottom: 2px; }
    footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: right; }
    @media print {
      body { padding: 12px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Periode: ${periodeStr} &nbsp;|&nbsp; Dicetak: ${now} &nbsp;|&nbsp; Jumlah record: ${rows.length}</p>
  ${tableHtml}
  <footer>SiKeP KenDI — Sistem Informasi Kendaraan Pemerintah Daerah</footer>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  private buildTableHtml(rows: any[], type: ReportType): string {
    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);
    const fmtDate = (iso: string | null) =>
      iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    switch (type) {
      case 'summary_darurat':
        return `<table><thead><tr><th>Kendaraan</th><th class="text-center">Jml Laporan</th><th class="text-center">Selesai</th><th class="text-right">Total Reimbursement</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.plate}</td><td class="text-center">${r.count}</td><td class="text-center">${r.selesai}</td><td class="text-right">${fmt(r.total)}</td></tr>`).join('')}
        </tbody></table>`;

      case 'detail_darurat':
        return `<table><thead><tr><th>Tanggal</th><th>Kendaraan</th><th>Pengemudi</th><th>Deskripsi</th><th>Status</th><th class="text-right">Reimbursement</th></tr></thead><tbody>
          ${rows.map(r => `
            <tr><td>${fmtDate(r.createdAt)}</td><td>${r.kendaraan?.nomorPolisi ?? r.kendaraanId}</td><td>${r.pengemudi?.fullName ?? '-'}</td><td>${r.deskripsiDarurat ?? '-'}</td><td>${r.status}</td><td class="text-right">${fmt(r.totalReimbursement ?? r.totalPengeluaran ?? 0)}</td></tr>
            ${r.fotos?.length ? `<tr><td colspan="6" class="detail-row"><div class="photos">${r.fotos.map((f: any) => `<img src="${f.image?.url ?? f.url ?? ''}" alt="${f.tipe}" />`).join('')}</div></td></tr>` : ''}
          `).join('')}
        </tbody></table>`;

      case 'summary_pengajuan':
        return `<table><thead><tr><th>Kendaraan</th><th class="text-center">Jml</th><th class="text-center">Terverifikasi</th><th class="text-center">Ditolak</th><th class="text-right">Total Estimasi</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.plate}</td><td class="text-center">${r.count}</td><td class="text-center">${r.terverifikasi}</td><td class="text-center">${r.ditolak}</td><td class="text-right">${fmt(r.total)}</td></tr>`).join('')}
        </tbody></table>`;

      case 'detail_pengajuan':
        return `<table><thead><tr><th>Nomor</th><th>Kendaraan</th><th>Jenis</th><th>Judul</th><th>Status</th><th class="text-right">Estimasi</th></tr></thead><tbody>
          ${rows.map(r => `
            <tr><td>${r.nomor}</td><td>${r.vehiclePlate}</td><td>${r.jenis}</td><td>${r.judul}</td><td>${r.status}</td><td class="text-right">${fmt(r.totalEstimasi)}</td></tr>
            ${r.photos?.length ? `<tr><td colspan="6" class="detail-row"><div class="photos">${r.photos.map((p: any) => `<img src="${p.url ?? ''}" alt="foto" />`).join('')}</div></td></tr>` : ''}
          `).join('')}
        </tbody></table>`;

      case 'per_kendaraan':
        return `<table><thead><tr><th>Plat / Tipe</th><th class="text-center">Jml WO</th><th class="text-right">Biaya WO</th><th class="text-center">Jml Darurat</th><th class="text-right">Biaya Darurat</th><th class="text-right">Grand Total</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td><b>${r.plate}</b><br/><small>${r.merk}</small></td><td class="text-center">${r.jumlahWO}</td><td class="text-right">${fmt(r.biayaWO)}</td><td class="text-center">${r.jumlahDarurat}</td><td class="text-right">${fmt(r.biayaDarurat)}</td><td class="text-right"><b>${fmt(r.biayaWO + r.biayaDarurat)}</b></td></tr>`).join('')}
        </tbody></table>`;

      case 'rekap_work_order':
        return `<table><thead><tr><th>Nomor WO</th><th>Kendaraan</th><th>Vendor</th><th>Status</th><th>Tgl Dibuat</th><th class="text-right">Total</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.nomor}</td><td>${r.vehiclePlate}</td><td>${r.vendorNama}</td><td>${r.status}</td><td>${fmtDate(r.assignedAt)}</td><td class="text-right">${fmt(r.totalNominal)}</td></tr>`).join('')}
        </tbody></table>`;

      case 'kinerja_vendor':
        return `<table><thead><tr><th>Vendor</th><th class="text-center">Total WO</th><th class="text-center">Selesai</th><th class="text-center">Ditolak</th><th class="text-center">Completion %</th><th class="text-right">Total Biaya</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.vendor}</td><td class="text-center">${r.total}</td><td class="text-center">${r.selesai}</td><td class="text-center">${r.ditolak}</td><td class="text-center">${r.total > 0 ? ((r.selesai / r.total) * 100).toFixed(0) + '%' : '-'}</td><td class="text-right">${fmt(r.biaya)}</td></tr>`).join('')}
        </tbody></table>`;

      case 'status_kendaraan':
        return `<table><thead><tr><th>Plat</th><th>Merk / Tipe</th><th>Status</th><th class="text-center">Pajak Habis</th><th class="text-center">STNK Habis</th><th class="text-right">Odometer</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.nomorPolisi}</td><td>${r.merk} ${r.tipe} (${r.tahun})</td><td>${r.status}</td><td class="text-center">${fmtDate(r.tanggalHabisPajak)}</td><td class="text-center">${fmtDate(r.tanggalHabisSTNK)}</td><td class="text-right">${(r.odometerCurrent ?? 0).toLocaleString('id-ID')} km</td></tr>`).join('')}
        </tbody></table>`;

      default:
        return `<table><thead><tr><th colspan="5">Data</th></tr></thead><tbody>${rows.map(r => `<tr><td colspan="5">${JSON.stringify(r)}</td></tr>`).join('')}</tbody></table>`;
    }
  }

  exportBiayaPerbaikan(data: LaporanBiayaResponse, filename = 'Laporan_Biaya_Perbaikan') {
    const wb = xlsx.utils.book_new();
    const ringkasanData = [
      ['Ringkasan Biaya Pemeliharaan'], [],
      ['Total Keseluruhan', data.summary.totalKeseluruhan],
      ['Total Servis Normatif', data.summary.totalNormatif],
      ['Total Perbaikan Darurat', data.summary.totalDarurat],
    ];
    const wsRingkasan = xlsx.utils.aoa_to_sheet(ringkasanData);
    wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 20 }];
    const currencyFmt = '"Rp"#,##0';
    if (wsRingkasan['B3']) wsRingkasan['B3'].z = currencyFmt;
    if (wsRingkasan['B4']) wsRingkasan['B4'].z = currencyFmt;
    if (wsRingkasan['B5']) wsRingkasan['B5'].z = currencyFmt;
    xlsx.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

    const detailData: any[][] = [['Tipe', 'Plat Nomor', 'Pengemudi', 'Tanggal', 'Deskripsi', 'Total Biaya']];
    data.details.normatif.forEach((n: any) => detailData.push(['Normatif', n.vehiclePlate ?? '-', n.driverName ?? '-', new Date(n.createdAt).toLocaleDateString('id-ID'), n.deskripsi ?? '-', n.total ?? 0]));
    data.details.darurat.forEach((d: any) => detailData.push(['Darurat', d.vehiclePlate ?? '-', d.driverName ?? '-', new Date(d.createdAt).toLocaleDateString('id-ID'), d.deskripsi ?? '-', d.total ?? 0]));
    const wsDetail = xlsx.utils.aoa_to_sheet(detailData);
    wsDetail['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 20 }];
    xlsx.utils.book_append_sheet(wb, wsDetail, 'Detail Per Kendaraan');
    xlsx.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
  }
}
