/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { FuelTransaction, FuelQuota } from '@shared/models';
import type {
  FuelDataPort,
  FuelTransactionFilter,
  FuelQuotaFilter,
  VehicleFuelUsage,
} from '../ports/fuel-data.port';

/**
 * Preview-mode implementation of FuelDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.8.
 */
@Injectable({ providedIn: 'root' })
export class PreviewFuelData implements FuelDataPort {
  listTransactions(filter?: FuelTransactionFilter): Observable<FuelTransaction[]> {
    return of([]);
  }

  getTransaction(id: string): Observable<FuelTransaction> {
    return of({ id } as unknown as FuelTransaction);
  }

  recordTransaction(
    input: Omit<FuelTransaction, 'id' | 'createdAt'>,
  ): Observable<FuelTransaction> {
    return of({ ...input, id: 'preview', createdAt: '' } as unknown as FuelTransaction);
  }

  listQuotas(filter?: FuelQuotaFilter): Observable<FuelQuota[]> {
    return of([]);
  }

  getVehicleUsage(
    vehicleId: string,
    period: { from: string; to: string },
  ): Observable<VehicleFuelUsage> {
    return of({ totalLiter: 0, totalNominal: 0, transactions: [] });
  }
}
