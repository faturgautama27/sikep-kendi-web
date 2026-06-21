import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import {
  NgApexchartsModule,
  type ApexAxisChartSeries,
  type ApexChart,
  type ApexXAxis,
  type ApexTooltip,
  type ApexGrid,
  type ApexDataLabels,
  type ApexPlotOptions,
  type ApexYAxis,
} from 'ng-apexcharts';

import { AuthState } from '@features/login/state';
import { DashboardState } from '@features/dashboard/state';
import { NotificationsState } from '@features/notifications/state';
import { WorkOrdersState } from '@features/work-orders/state';
import type { DashboardSummary, VendorPerformance } from '@shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgApexchartsModule, DatePipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly store = inject(Store);

  private safeArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  protected readonly userName = computed(
    () => this.store.selectSignal(AuthState.user)()?.fullName?.split(' ')[0] ?? 'User',
  );

  protected readonly summary = this.store.selectSignal(DashboardState.summary);
  protected readonly topDeviation = this.store.selectSignal(DashboardState.topDeviation);
  protected readonly vendorPerf = this.store.selectSignal(DashboardState.vendorPerformance);
  protected readonly unread = this.store.selectSignal(NotificationsState.unreadCount);
  protected readonly workOrders = this.store.selectSignal(WorkOrdersState.list);

  protected readonly activeWorkOrders = computed(
    () => this.workOrders().filter((wo) => ['assigned', 'received', 'in_progress'].includes(wo.status)).length,
  );

  protected readonly activeEwe = computed(() => this.topDeviation().length);

  protected num(s: DashboardSummary | null, key: keyof DashboardSummary): number {
    return s ? Number(s[key] ?? 0) : 0;
  }

  protected formatRupiah(v: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(v ?? 0);
  }

  protected formatShort(v: number): string {
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
    if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
    return `Rp ${v}`;
  }

  // ── Operasional bulan ini: Donut chart ───────────────────────────────
  protected readonly donutSeries = computed(() => [
    this.activeWorkOrders(),
    this.num(this.summary(), 'pendingPengajuan'),
    this.activeEwe(),
  ]);

  protected readonly donutOptions = {
    chart: { type: 'donut' as const, height: 220, sparkline: { enabled: false } },
    labels: ['WO Aktif', 'Pengajuan Pending', 'EWE Aktif'],
    colors: ['#2563eb', '#f59e0b', '#ef4444'],
    legend: { show: true, position: 'bottom' as const, fontSize: '11px' },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '11px',
              color: '#64748b',
              formatter: (w: { globals: { seriesTotals: number[] } }) =>
                `${w.globals.seriesTotals.reduce((a, b) => a + b, 0)} item`,
            },
          },
        },
      },
    },
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    tooltip: {
      y: { formatter: (v: number) => `${v} item` },
    },
  };

  // ── Armada status: Bar ────────────────────────────────────────────────
  protected readonly barSeries = computed<ApexAxisChartSeries>(() => [
    {
      name: 'Jumlah',
      data: [
        this.num(this.summary(), 'activeVehicles'),
        this.num(this.summary(), 'inRepairVehicles'),
        this.num(this.summary(), 'retiredVehicles'),
      ],
    },
  ]);

  protected readonly barOptions = {
    chart: { type: 'bar' as const, height: 160, toolbar: { show: false }, sparkline: { enabled: false } } as ApexChart,
    plotOptions: {
      bar: { horizontal: false, columnWidth: '40%', borderRadius: 6, borderRadiusApplication: 'end' as const },
    } as ApexPlotOptions,
    xaxis: {
      categories: ['Aktif', 'Perbaikan', 'Pensiun'],
      labels: { style: { fontSize: '11px', colors: ['#94a3b8', '#94a3b8', '#94a3b8'] } },
    } as ApexXAxis,
    yaxis: { labels: { style: { fontSize: '10px' } } } as ApexYAxis,
    colors: ['#2563eb', '#f59e0b', '#94a3b8'],
    dataLabels: { enabled: false } as ApexDataLabels,
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 } as ApexGrid,
    tooltip: { y: { formatter: (v: number) => `${v} unit` } } as ApexTooltip,
  };

  // ── Vendor performa: Radial ───────────────────────────────────────────
  protected readonly radialSeries = computed(() =>
    this.safeArray<VendorPerformance>(this.vendorPerf()).slice(0, 4).map(v => Math.round((1 - v.rejectionRate) * 100))
  );

  protected readonly radialOptions = computed(() => ({
    chart: { type: 'radialBar' as const, height: 220 },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: -90,
        endAngle: 90,
        hollow: { size: '30%' },
        dataLabels: { name: { fontSize: '10px' }, value: { fontSize: '12px', fontWeight: 700 } },
      },
    },
    labels: this.safeArray<VendorPerformance>(this.vendorPerf()).slice(0, 4).map(v => v.vendorNama.split(' ').slice(0, 2).join(' ')),
    colors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'],
    legend: { show: true, position: 'bottom' as const, fontSize: '10px' },
  }));

  protected greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Selamat Pagi' : h < 17 ? 'Selamat Siang' : 'Selamat Sore';
  }
}
