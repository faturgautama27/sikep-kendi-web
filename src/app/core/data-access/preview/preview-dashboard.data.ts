/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type {
  DashboardSummary,
  CostBreakdown,
  TopDeviationVehicle,
  VendorPerformance,
} from '@shared/models';
import type { DashboardDataPort } from '../ports/dashboard-data.port';

/**
 * Preview-mode implementation of DashboardDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.11.
 */
@Injectable({ providedIn: 'root' })
export class PreviewDashboardData implements DashboardDataPort {
  getSummary(): Observable<DashboardSummary> {
    return of({
      totalVehicles: 0,
      activeVehicles: 0,
      inRepairVehicles: 0,
      retiredVehicles: 0,
      documentsExpiringSoon: 0,
      simExpiringSoon: 0,
      pendingPengajuan: 0,
      unmatchedSpj: 0,
      totalCostThisMonth: 0,
      fuelCostThisMonth: 0,
      maintenanceCostThisMonth: 0,
      notificationCriticalUnread: 0,
    });
  }

  getCostBreakdown(period: { from: string; to: string }): Observable<CostBreakdown> {
    return of({
      period: `${period.from}/${period.to}`,
      total: 0,
      byCategory: [],
      byVehicle: [],
    });
  }

  getTopDeviationVehicles(): Observable<TopDeviationVehicle[]> {
    return of([]);
  }

  getVendorPerformance(): Observable<VendorPerformance[]> {
    return of([]);
  }
}
