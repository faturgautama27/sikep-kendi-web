import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { FuelTransaction, FuelQuota } from '@shared/models';
import type {
  FuelDataPort,
  FuelTransactionFilter,
  FuelQuotaFilter,
  VehicleFuelUsage,
} from '../ports/fuel-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of FuelDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiFuelData implements FuelDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  listTransactions(filter?: FuelTransactionFilter): Observable<FuelTransaction[]> {
    let params = new HttpParams();
    if (filter?.vehicleId) params = params.set('vehicleId', filter.vehicleId);
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    return this.http.get<FuelTransaction[]>(this.url('/fuel-transactions'), { params });
  }

  getTransaction(id: string): Observable<FuelTransaction> {
    return this.http.get<FuelTransaction>(this.url(`/fuel-transactions/${id}`));
  }

  recordTransaction(
    input: Omit<FuelTransaction, 'id' | 'createdAt'>,
  ): Observable<FuelTransaction> {
    return this.http.post<FuelTransaction>(this.url('/fuel-transactions'), input);
  }

  listQuotas(filter?: FuelQuotaFilter): Observable<FuelQuota[]> {
    let params = new HttpParams();
    if (filter?.scope) params = params.set('scope', filter.scope);
    if (filter?.scopeId) params = params.set('scopeId', filter.scopeId);
    return this.http.get<FuelQuota[]>(this.url('/fuel-quotas'), { params });
  }

  getVehicleUsage(
    vehicleId: string,
    period: { from: string; to: string },
  ): Observable<VehicleFuelUsage> {
    const params = new HttpParams().set('from', period.from).set('to', period.to);
    return this.http.get<VehicleFuelUsage>(
      this.url(`/vehicles/${vehicleId}/fuel-usage`),
      { params },
    );
  }
}
