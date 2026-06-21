import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.url('/dashboard/summary'));
  }

  getCostBreakdown(period: { from: string; to: string }): Observable<CostBreakdown> {
    const params = new HttpParams().set('from', period.from).set('to', period.to);
    return this.http.get<CostBreakdown>(this.url('/dashboard/cost-breakdown'), {
      params,
    });
  }

  getTopDeviationVehicles(): Observable<TopDeviationVehicle[]> {
    return this.http.get<TopDeviationVehicle[]>(this.url('/dashboard/top-deviation'));
  }

  getVendorPerformance(): Observable<VendorPerformance[]> {
    return this.http.get<VendorPerformance[]>(this.url('/dashboard/vendor-performance'));
  }
}
