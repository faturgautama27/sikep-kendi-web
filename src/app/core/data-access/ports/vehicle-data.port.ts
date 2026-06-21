import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';

export interface VehicleDataPort {
  list(): Observable<Vehicle[]>;
  getById(id: string): Observable<Vehicle>;
  create(input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Observable<Vehicle>;
  update(id: string, patch: Partial<Vehicle>): Observable<Vehicle>;
  retire(id: string): Observable<Vehicle>;
  listDocuments(vehicleId: string): Observable<VehicleDocument[]>;
  addDocument(vehicleId: string, doc: Omit<VehicleDocument, 'id'>): Observable<VehicleDocument>;
  listOdometerReadings(vehicleId: string): Observable<OdometerReading[]>;
  addOdometerReading(
    vehicleId: string,
    reading: Omit<OdometerReading, 'id'>,
  ): Observable<OdometerReading>;
}

export const VEHICLE_DATA = new InjectionToken<VehicleDataPort>('VEHICLE_DATA');
