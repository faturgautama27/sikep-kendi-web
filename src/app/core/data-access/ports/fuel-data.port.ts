import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { FuelTransaction, FuelQuota, QuotaScope } from '@shared/models';

export interface FuelTransactionFilter {
  vehicleId?: string;
  from?: string;
  to?: string;
}

export interface FuelQuotaFilter {
  scope?: QuotaScope;
  scopeId?: string;
}

export interface VehicleFuelUsage {
  totalLiter: number;
  totalNominal: number;
  transactions: FuelTransaction[];
}

export interface FuelDataPort {
  listTransactions(filter?: FuelTransactionFilter): Observable<FuelTransaction[]>;
  getTransaction(id: string): Observable<FuelTransaction>;
  recordTransaction(
    input: Omit<FuelTransaction, 'id' | 'createdAt'>,
  ): Observable<FuelTransaction>;
  listQuotas(filter?: FuelQuotaFilter): Observable<FuelQuota[]>;
  getVehicleUsage(
    vehicleId: string,
    period: { from: string; to: string },
  ): Observable<VehicleFuelUsage>;
}

export const FUEL_DATA = new InjectionToken<FuelDataPort>('FUEL_DATA');
