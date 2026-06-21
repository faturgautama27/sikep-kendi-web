import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';
import type { VehicleDataPort } from '../ports/vehicle-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of VehicleDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4 (Task 30.1).
 */
@Injectable({ providedIn: 'root' })
export class ApiVehicleData implements VehicleDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.url('/vehicles'));
  }

  getById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(this.url(`/vehicles/${id}`));
  }

  create(input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.url('/vehicles'), input);
  }

  update(id: string, patch: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.patch<Vehicle>(this.url(`/vehicles/${id}`), patch);
  }

  retire(id: string): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.url(`/vehicles/${id}/retire`), {});
  }

  listDocuments(vehicleId: string): Observable<VehicleDocument[]> {
    return this.http.get<VehicleDocument[]>(this.url(`/vehicles/${vehicleId}/documents`));
  }

  addDocument(
    vehicleId: string,
    doc: Omit<VehicleDocument, 'id'>,
  ): Observable<VehicleDocument> {
    return this.http.post<VehicleDocument>(
      this.url(`/vehicles/${vehicleId}/documents`),
      doc,
    );
  }

  listOdometerReadings(vehicleId: string): Observable<OdometerReading[]> {
    return this.http.get<OdometerReading[]>(this.url(`/vehicles/${vehicleId}/odometer`));
  }

  addOdometerReading(
    vehicleId: string,
    reading: Omit<OdometerReading, 'id'>,
  ): Observable<OdometerReading> {
    return this.http.post<OdometerReading>(
      this.url(`/vehicles/${vehicleId}/odometer`),
      reading,
    );
  }
}
