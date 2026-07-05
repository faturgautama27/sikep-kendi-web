import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DaruratState, LoadDarurat } from '@features/darurat/state';
import { PengajuanState, LoadPengajuan } from '@features/pengajuan/state';
import { WorkOrdersState, LoadWorkOrders } from '@features/work-orders/state';
import { VehiclesState } from '@features/vehicles/state';
import { LaporanState } from './state/laporan.state';
import { LoadLaporanBiaya } from './state/laporan.actions';
import { LaporanExportService } from './laporan-export.service';
import type { LaporanDarurat } from '@shared/models';
import type { Pengajuan } from '@shared/models';
import type { WorkOrder } from '@shared/models';
import type { Vehicle, OdometerReading } from '@shared/models';

export type ReportType =
  | 'summary_darurat'
  | 'summary_pengajuan'
  | 'detail_darurat'
  | 'detail_pengajuan'
  | 'per_kendaraan'
  | 'rekap_work_order'
  | 'kinerja_vendor'
  | 'biaya_normatif'
  | 'status_kendaraan'
  | 'odometer';

interface ReportTypeOption {
  value: ReportType;
  label: string;
  group: string;
  hasPhotos?: boolean;
}

const REPORT_TYPES: ReportTypeOption[] = [
  { value: 'summary_darurat', label: 'Summary Laporan Darurat', group: 'Darurat' },
  { value: 'detail_darurat', label: 'Detail Laporan Darurat', group: 'Darurat', hasPhotos: true },
  { value: 'summary_pengajuan', label: 'Summary Pengajuan Pemeliharaan', group: 'Pengajuan' },
  {
    value: 'detail_pengajuan',
    label: 'Detail Pengajuan Pemeliharaan',
    group: 'Pengajuan',
    hasPhotos: true,
  },
  { value: 'per_kendaraan', label: 'Biaya Perbaikan Per Kendaraan Dinas', group: 'Kendaraan' },
  { value: 'status_kendaraan', label: 'Status & Dokumen Kendaraan', group: 'Kendaraan' },
  { value: 'odometer', label: 'Riwayat Odometer Per Kendaraan', group: 'Kendaraan' },
  { value: 'rekap_work_order', label: 'Rekapitulasi Work Order', group: 'Work Order' },
  { value: 'kinerja_vendor', label: 'Kinerja Vendor', group: 'Work Order' },
  { value: 'biaya_normatif', label: 'Laporan Biaya Pemeliharaan Normatif', group: 'Biaya' },
];

@Component({
  selector: 'app-laporan-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './laporan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaporanListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly exportService = inject(LaporanExportService);

  // ── State signals ────────────────────────────────────────────────────────
  private readonly daruratList = this.store.selectSignal(DaruratState.list);
  private readonly pengajuanList = this.store.selectSignal(PengajuanState.list);
  private readonly workOrderList = this.store.selectSignal(WorkOrdersState.list);
  private readonly vehicleList = this.store.selectSignal(VehiclesState.list);
  private readonly odometerList = this.store.selectSignal(VehiclesState.odometerReadings);
  private readonly biayaData = this.store.selectSignal(LaporanState.biaya);

  // ── UI state ─────────────────────────────────────────────────────────────
  protected readonly reportTypes = REPORT_TYPES;
  protected readonly selectedType = signal<ReportType>('summary_darurat');
  protected readonly selectedMonth = signal(new Date().getMonth() + 1); // 1–12
  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly filterVehicleId = signal<string | null>(null);
  protected readonly generated = signal(false);

  protected readonly monthOptions = [
    { label: 'Januari', value: 1 },
    { label: 'Februari', value: 2 },
    { label: 'Maret', value: 3 },
    { label: 'April', value: 4 },
    { label: 'Mei', value: 5 },
    { label: 'Juni', value: 6 },
    { label: 'Juli', value: 7 },
    { label: 'Agustus', value: 8 },
    { label: 'September', value: 9 },
    { label: 'Oktober', value: 10 },
    { label: 'November', value: 11 },
    { label: 'Desember', value: 12 },
  ];

  protected readonly yearOptions = computed(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => ({ label: String(cur - i), value: cur - i }));
  });

  /** First day and last day of the selected month — passed to API as startDate/endDate. */
  protected readonly dateRange = computed<Date[]>(() => {
    const m = this.selectedMonth();
    const y = this.selectedYear();
    return [
      new Date(y, m - 1, 1), // 1st of month
      new Date(y, m, 0, 23, 59, 59), // last day of month (day 0 of next month)
    ];
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  protected readonly vehicleOptions = computed(() => [
    { label: 'Semua Kendaraan', value: null },
    ...this.vehicleList().map((v) => ({
      label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`,
      value: v.id,
    })),
  ]);

  protected readonly currentReportConfig = computed(() =>
    REPORT_TYPES.find((r) => r.value === this.selectedType()),
  );

  protected readonly reportRows = computed<any[]>(() => {
    if (!this.generated()) return [];
    const type = this.selectedType();
    const [from, to] = this.dateRange();
    const vehicleId = this.filterVehicleId();

    const inRange = (iso: string | null | undefined): boolean => {
      if (!iso) return false;
      const d = new Date(iso);
      return (!from || d >= from) && (!to || d <= to);
    };

    switch (type) {
      case 'summary_darurat': {
        const byPlate = new Map<
          string,
          { plate: string; pengemudi: string; count: number; selesai: number; total: number }
        >();
        for (const d of this.daruratList()) {
          if (!inRange(d.createdAt)) continue;
          if (vehicleId && d.kendaraanId !== vehicleId) continue;
          const plate = d.kendaraan?.nomorPolisi ?? d.kendaraanId;
          const entry = byPlate.get(plate) ?? {
            plate,
            pengemudi: d.pengemudi?.fullName ?? '-',
            count: 0,
            selesai: 0,
            total: 0,
          };
          entry.count++;
          if (d.status === 'DIBAYAR') entry.selesai++;
          entry.total +=
            parseFloat((d.totalReimbursement as any) ?? 0) ??
            parseFloat((d.totalPengeluaran as any) ?? 0) ??
            0;
          byPlate.set(plate, entry);
        }
        return Array.from(byPlate.values()).sort((a, b) => b.total - a.total);
      }

      case 'detail_darurat':
        return this.daruratList();

      case 'summary_pengajuan': {
        const byPlate = new Map<
          string,
          {
            plate: string;
            jenis: string;
            count: number;
            terverifikasi: number;
            ditolak: number;
            total: number;
          }
        >();
        for (const p of this.pengajuanList()) {
          if (!inRange(p.createdAt)) continue;
          if (vehicleId && p.vehicleId !== vehicleId) continue;
          const plate = p.vehiclePlate;
          const entry = byPlate.get(plate) ?? {
            plate,
            jenis: p.jenis,
            count: 0,
            terverifikasi: 0,
            ditolak: 0,
            total: 0,
          };
          entry.count++;
          if (p.status === 'terverifikasi' || p.status === 'work_order_terbuat')
            entry.terverifikasi++;
          if (p.status === 'ditolak') entry.ditolak++;
          entry.total += p.totalEstimasi ?? 0;
          byPlate.set(plate, entry);
        }
        return Array.from(byPlate.values()).sort((a, b) => b.total - a.total);
      }

      case 'detail_pengajuan':
        return this.pengajuanList()
          .filter((p) => inRange(p.createdAt) && (!vehicleId || p.vehicleId === vehicleId))
          .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

      case 'per_kendaraan': {
        const map = new Map<
          string,
          {
            plate: string;
            merk: string;
            jumlahWO: number;
            biayaWO: number;
            jumlahDarurat: number;
            biayaDarurat: number;
          }
        >();
        for (const v of this.vehicleList()) {
          map.set(v.id, {
            plate: v.nomorPolisi,
            merk: `${v.merk} ${v.tipe}`,
            jumlahWO: 0,
            biayaWO: 0,
            jumlahDarurat: 0,
            biayaDarurat: 0,
          });
        }
        for (const wo of this.workOrderList()) {
          if (!inRange(wo.assignedAt)) continue;
          const entry = map.get(wo.vehicleId);
          if (entry) {
            entry.jumlahWO++;
            entry.biayaWO += wo.totalNominal ?? 0;
          }
        }
        for (const d of this.daruratList()) {
          if (!inRange(d.createdAt)) continue;
          const entry = map.get(d.kendaraanId);
          if (entry) {
            entry.jumlahDarurat++;
            entry.biayaDarurat += d.totalReimbursement ?? d.totalPengeluaran ?? 0;
          }
        }
        return Array.from(map.values())
          .filter((e) => e.jumlahWO > 0 || e.jumlahDarurat > 0)
          .sort((a, b) => b.biayaWO + b.biayaDarurat - (a.biayaWO + a.biayaDarurat));
      }

      case 'rekap_work_order':
        return this.workOrderList()
          .filter((wo) => inRange(wo.assignedAt) && (!vehicleId || wo.vehicleId === vehicleId))
          .sort((a, b) => (b.assignedAt > a.assignedAt ? 1 : -1));

      case 'kinerja_vendor': {
        const map = new Map<
          string,
          { vendor: string; total: number; selesai: number; ditolak: number; biaya: number }
        >();
        for (const wo of this.workOrderList()) {
          if (!inRange(wo.assignedAt)) continue;
          const entry = map.get(wo.vendorId) ?? {
            vendor: wo.vendorNama,
            total: 0,
            selesai: 0,
            ditolak: 0,
            biaya: 0,
          };
          entry.total++;
          if (wo.status === 'DIBAYAR' || wo.status === 'DIVERIFIKASI') entry.selesai++;
          if (
            wo.status === 'DITOLAK_PB' ||
            wo.status === 'DITOLAK_VERIFIKATOR' ||
            wo.status === 'DITOLAK_PPTK'
          )
            entry.ditolak++;
          entry.biaya += wo.totalNominal ?? 0;
          map.set(wo.vendorId, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
      }

      case 'biaya_normatif': {
        const raw = this.biayaData();
        return (raw?.details?.normatif ?? []).filter((n: any) => {
          if (vehicleId && n.vehicleId !== vehicleId) return false;
          return inRange(n.createdAt);
        });
      }

      case 'status_kendaraan':
        return this.vehicleList().map((v) => ({
          ...v,
          pajakExpired: v.tanggalHabisPajak ? new Date(v.tanggalHabisPajak) < new Date() : false,
          pajakWarning: v.tanggalHabisPajak ? this.daysUntil(v.tanggalHabisPajak) <= 30 : false,
          stnkExpired: v.tanggalHabisSTNK ? new Date(v.tanggalHabisSTNK) < new Date() : false,
          stnkWarning: v.tanggalHabisSTNK ? this.daysUntil(v.tanggalHabisSTNK) <= 30 : false,
        }));

      case 'odometer':
        return this.odometerList()
          .filter(
            (o: OdometerReading) =>
              inRange(o.recordedAt) && (!vehicleId || o.vehicleId === vehicleId),
          )
          .sort((a: OdometerReading, b: OdometerReading) => (b.recordedAt > a.recordedAt ? 1 : -1));

      default:
        return [];
    }
  });

  // ── Stats strip ──────────────────────────────────────────────────────────
  protected readonly totalRows = computed(() => this.reportRows().length);
  protected readonly totalBiaya = computed(() =>
    this.reportRows().reduce(
      (sum, r) =>
        sum +
        parseFloat(r.total ?? r.biaya ?? r.biayaWO ?? r.totalNominal ?? r.totalReimbursement ?? 0),
      0,
    ),
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Ensure biaya laporan is loaded for normatif report
    const [from, to] = this.dateRange();
    this.store.dispatch(
      new LoadLaporanBiaya({
        startDate: from?.toISOString().split('T')[0],
        endDate: to?.toISOString().split('T')[0],
      }),
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  protected onGenerate(): void {
    const [from, to] = this.dateRange();
    const fromStr = from?.toISOString();
    const toStr = to?.toISOString();
    const vehicleId = this.filterVehicleId() ?? undefined;
    const type = this.selectedType();

    let payload: any = { startDate: fromStr, endDate: toStr };

    // Dispatch fresh API call with date+vehicle filter for each report type
    switch (type) {
      case 'summary_darurat':
      case 'detail_darurat':
        console.log('vehicleId', vehicleId);
        if (vehicleId) payload.kendaraanId = vehicleId;
        this.store.dispatch(new LoadDarurat({ ...payload, limit: 200 }));
        break;

      case 'summary_pengajuan':
      case 'detail_pengajuan':
        this.store.dispatch(new LoadPengajuan({ from: fromStr, to: toStr, vehicleId }));
        break;

      case 'rekap_work_order':
      case 'kinerja_vendor':
        this.store.dispatch(new LoadWorkOrders({ from: fromStr, to: toStr }));
        break;

      case 'per_kendaraan':
        // Needs both darurat + work order in range
        this.store.dispatch([
          new LoadDarurat({ startDate: fromStr, endDate: toStr, limit: 200 }),
          new LoadWorkOrders({ from: fromStr, to: toStr }),
        ]);
        break;

      case 'biaya_normatif':
        this.store.dispatch(new LoadLaporanBiaya({ startDate: fromStr, endDate: toStr }));
        break;

      // status_kendaraan & odometer read from already-loaded vehicle state (complete dataset)
      default:
        break;
    }

    this.generated.set(true);
  }

  protected onTypeChange(): void {
    this.generated.set(false);
  }

  protected exportPdf(): void {
    const config = this.currentReportConfig();
    if (!config) return;
    this.exportService.printReport(config.label, this.dateRange(), this.reportRows(), config.value);
  }

  protected exportExcel(): void {
    const data = this.biayaData();
    if (data) this.exportService.exportBiayaPerbaikan(data);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  }

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected daruratStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DIBAYAR: 'Dibayar',
      DISETUJUI_PPTK: 'Disetujui PPTK',
      DITOLAK_PB: 'Ditolak PB',
      DITOLAK_PPTK: 'Ditolak PPTK',
      DITOLAK_VERIFIKATOR: 'Ditolak',
      MENUNGGU_VERIFIKASI_PB: 'Menunggu PB',
      MENUNGGU_REIMBURSEMENT: 'Menunggu Reimburse',
      REIMBURSEMENT_DIAJUKAN: 'Diajukan',
    };
    return map[s] ?? s;
  }

  protected daruratSeverity(s: string): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
    if (s === 'DIBAYAR' || s === 'DISETUJUI_PPTK') return 'success';
    if (s.startsWith('DITOLAK')) return 'danger';
    if (s.startsWith('MENUNGGU')) return 'warn';
    return 'info';
  }

  protected woStatusSeverity(s: string): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
    if (s === 'DIBAYAR' || s === 'DIVERIFIKASI' || s === 'DISETUJUI_PPTK') return 'success';
    if (s.startsWith('DITOLAK')) return 'danger';
    if (s.includes('MENUNGGU') || s === 'PENAWARAN' || s === 'DRAFT_CHECKLIST') return 'warn';
    return 'info';
  }

  protected pengajuanSeverity(s: string): 'success' | 'danger' | 'warn' | 'secondary' {
    if (s === 'terverifikasi' || s === 'work_order_terbuat') return 'success';
    if (s === 'ditolak') return 'danger';
    if (s === 'menunggu_verifikasi') return 'warn';
    return 'secondary';
  }

  protected docSeverity(expired: boolean, warning: boolean): 'danger' | 'warn' | 'success' {
    if (expired) return 'danger';
    if (warning) return 'warn';
    return 'success';
  }

  protected needsVehicleFilter(): boolean {
    return [
      'detail_darurat',
      'detail_pengajuan',
      'per_kendaraan',
      'rekap_work_order',
      'biaya_normatif',
      'odometer',
    ].includes(this.selectedType());
  }

  private daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  }
}
