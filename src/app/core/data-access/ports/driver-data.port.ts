import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';

export interface DriverDataPort {
  list(): Observable<Driver[]>;
  getById(id: string): Observable<Driver>;
  create(input: Omit<Driver, 'id' | 'createdAt'>): Observable<Driver>;
  update(id: string, patch: Partial<Driver>): Observable<Driver>;
  listAssignments(driverId: string): Observable<DriverAssignment[]>;
  assignToVehicle(
    driverId: string,
    assignment: Omit<DriverAssignment, 'id'>,
  ): Observable<DriverAssignment>;
  endAssignment(assignmentId: string): Observable<DriverAssignment>;
  listViolations(driverId: string): Observable<DriverViolation[]>;
  recordViolation(
    driverId: string,
    violation: Omit<DriverViolation, 'id'>,
  ): Observable<DriverViolation>;
}

export const DRIVER_DATA = new InjectionToken<DriverDataPort>('DRIVER_DATA');
