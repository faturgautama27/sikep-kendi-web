import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  DashboardSummary,
  CostBreakdown,
  TopDeviationVehicle,
  VendorPerformance,
} from '@shared/models';

export interface DashboardDataPort {
  getSummary(): Observable<DashboardSummary>;
  getCostBreakdown(period: { from: string; to: string }): Observable<CostBreakdown>;
  getTopDeviationVehicles(): Observable<TopDeviationVehicle[]>;
  getVendorPerformance(): Observable<VendorPerformance[]>;
}

export const DASHBOARD_DATA = new InjectionToken<DashboardDataPort>('DASHBOARD_DATA');
