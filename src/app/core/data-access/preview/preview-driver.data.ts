/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';
import type { DriverDataPort } from '../ports/driver-data.port';

/**
 * Preview-mode implementation of DriverDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.5.
 */
@Injectable({ providedIn: 'root' })
export class PreviewDriverData implements DriverDataPort {
  list(): Observable<Driver[]> {
    return of([]);
  }

  getById(id: string): Observable<Driver> {
    return of({ id } as unknown as Driver);
  }

  create(input: Omit<Driver, 'id' | 'createdAt'>): Observable<Driver> {
    return of({ ...input, id: 'preview', createdAt: '' } as unknown as Driver);
  }

  update(id: string, patch: Partial<Driver>): Observable<Driver> {
    return of({ ...patch, id } as unknown as Driver);
  }

  listAssignments(driverId: string): Observable<DriverAssignment[]> {
    return of([]);
  }

  assignToVehicle(
    driverId: string,
    assignment: Omit<DriverAssignment, 'id'>,
  ): Observable<DriverAssignment> {
    return of({ ...assignment, id: 'preview' } as unknown as DriverAssignment);
  }

  endAssignment(assignmentId: string): Observable<DriverAssignment> {
    return of({ id: assignmentId } as unknown as DriverAssignment);
  }

  listViolations(driverId: string): Observable<DriverViolation[]> {
    return of([]);
  }

  recordViolation(
    driverId: string,
    violation: Omit<DriverViolation, 'id'>,
  ): Observable<DriverViolation> {
    return of({ ...violation, id: 'preview' } as unknown as DriverViolation);
  }
}
