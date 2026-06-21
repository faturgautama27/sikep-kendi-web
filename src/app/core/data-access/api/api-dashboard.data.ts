import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type {
  DashboardSummary,
  CostBreakdown,
  TopDeviationVehicle,
  VendorPerformance,
} from '@shared/models';
import type { DashboardDataPort } from '../ports/dashboard-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of DashboardDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiDashboardData implements DashboardDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  private mapSummary(raw: Record<string, unknown>): DashboardSummary {
    return {
      totalVehicles: Number(raw['totalVehicles'] ?? raw['totalKendaraan'] ?? 0),
      activeVehicles: Number(raw['activeVehicles'] ?? raw['kendaraanAktif'] ?? 0),
      inRepairVehicles: Number(raw['inRepairVehicles'] ?? raw['kendaraanDalamPerbaikan'] ?? 0),
      retiredVehicles: Number(raw['retiredVehicles'] ?? 0),
      documentsExpiringSoon: Number(raw['documentsExpiringSoon'] ?? 0),
      simExpiringSoon: Number(raw['simExpiringSoon'] ?? 0),
      pendingPengajuan: Number(raw['pendingPengajuan'] ?? raw['pengajuanMenunggu'] ?? 0),
      unmatchedSpj: Number(raw['unmatchedSpj'] ?? 0),
      totalCostThisMonth: Number(raw['totalCostThisMonth'] ?? 0),
      fuelCostThisMonth: Number(raw['fuelCostThisMonth'] ?? 0),
      maintenanceCostThisMonth: Number(raw['maintenanceCostThisMonth'] ?? 0),
      notificationCriticalUnread: Number(raw['notificationCriticalUnread'] ?? 0),
    };
  }

  private mapCostBreakdown(
    raw: Array<{ month?: string; jumlahPengajuan?: number; jumlahDisetujui?: number; jumlahDitolak?: number }>,
    period: { from: string; to: string },
  ): CostBreakdown {
    const byCategory = raw.map((row) => ({
      kategori: row.month ?? '-',
      nominal: Number(row.jumlahPengajuan ?? 0),
    }));

    return {
      period: `${period.from}/${period.to}`,
      total: byCategory.reduce((sum, row) => sum + row.nominal, 0),
      byCategory,
      byVehicle: [],
    };
  }

  private mapTopDeviation(
    raw: Array<{ status?: string; _count?: { _all?: number } }>,
  ): TopDeviationVehicle[] {
    return raw.map((row, idx) => ({
      vehicleId: `status-${row.status ?? idx}`,
      vehiclePlate: row.status ?? '-',
      merk: 'Status Armada',
      tipe: row.status ?? '-',
      deviationCount: Number(row._count?._all ?? 0),
      lastDeviationAt: new Date().toISOString(),
    }));
  }

  private mapVendorPerf(raw: unknown): VendorPerformance[] {
    if (Array.isArray(raw)) {
      return raw as VendorPerformance[];
    }
    return [];
  }

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<Record<string, unknown>>(this.url('/dashboard/summary')).pipe(
      map((raw) => this.mapSummary(raw)),
    );
  }

  getCostBreakdown(period: { from: string; to: string }): Observable<CostBreakdown> {
    const params = new HttpParams().set('from', period.from).set('to', period.to);
    return this.http
      .get<Array<{ month?: string; jumlahPengajuan?: number; jumlahDisetujui?: number; jumlahDitolak?: number }>>(
        this.url('/dashboard/pengajuan-chart'),
        { params },
      )
      .pipe(
        map((raw) => this.mapCostBreakdown(raw, period)),
      );
  }

  getTopDeviationVehicles(): Observable<TopDeviationVehicle[]> {
    return this.http
      .get<Array<{ status?: string; _count?: { _all?: number } }>>(this.url('/dashboard/kendaraan-status'))
      .pipe(
        map((raw) => this.mapTopDeviation(raw)),
      );
  }

  getVendorPerformance(): Observable<VendorPerformance[]> {
    return this.http.get<unknown>(this.url('/dashboard/vendor')).pipe(
      map((raw) => this.mapVendorPerf(raw)),
    );
  }
}
