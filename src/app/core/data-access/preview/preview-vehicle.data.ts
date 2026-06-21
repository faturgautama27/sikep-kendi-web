/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';
import type { VehicleDataPort } from '../ports/vehicle-data.port';

/**
 * Preview-mode implementation of VehicleDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.2.
 */
@Injectable({ providedIn: 'root' })
export class PreviewVehicleData implements VehicleDataPort {
  list(): Observable<Vehicle[]> {
    return of([]);
  }

  getById(id: string): Observable<Vehicle> {
    return of({ id } as unknown as Vehicle);
  }

  create(input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Observable<Vehicle> {
    return of({
      ...input,
      id: 'preview',
      createdAt: '',
      updatedAt: '',
    } as unknown as Vehicle);
  }

  update(id: string, patch: Partial<Vehicle>): Observable<Vehicle> {
    return of({ ...patch, id } as unknown as Vehicle);
  }

  retire(id: string): Observable<Vehicle> {
    return of({ id, status: 'retired' } as unknown as Vehicle);
  }

  listDocuments(vehicleId: string): Observable<VehicleDocument[]> {
    return of([]);
  }

  addDocument(
    vehicleId: string,
    doc: Omit<VehicleDocument, 'id'>,
  ): Observable<VehicleDocument> {
    return of({ ...doc, id: 'preview' } as unknown as VehicleDocument);
  }

  listOdometerReadings(vehicleId: string): Observable<OdometerReading[]> {
    return of([]);
  }

  addOdometerReading(
    vehicleId: string,
    reading: Omit<OdometerReading, 'id'>,
  ): Observable<OdometerReading> {
    return of({ ...reading, id: 'preview' } as unknown as OdometerReading);
  }
}
