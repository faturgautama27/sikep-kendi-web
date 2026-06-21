import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';
import type { DriverDataPort } from '../ports/driver-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of DriverDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiDriverData implements DriverDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(): Observable<Driver[]> {
    return this.http.get<Driver[]>(this.url('/drivers'));
  }

  getById(id: string): Observable<Driver> {
    return this.http.get<Driver>(this.url(`/drivers/${id}`));
  }

  create(input: Omit<Driver, 'id' | 'createdAt'>): Observable<Driver> {
    return this.http.post<Driver>(this.url('/drivers'), input);
  }

  update(id: string, patch: Partial<Driver>): Observable<Driver> {
    return this.http.patch<Driver>(this.url(`/drivers/${id}`), patch);
  }

  listAssignments(driverId: string): Observable<DriverAssignment[]> {
    return this.http.get<DriverAssignment[]>(
      this.url(`/drivers/${driverId}/assignments`),
    );
  }

  assignToVehicle(
    driverId: string,
    assignment: Omit<DriverAssignment, 'id'>,
  ): Observable<DriverAssignment> {
    return this.http.post<DriverAssignment>(
      this.url(`/drivers/${driverId}/assignments`),
      assignment,
    );
  }

  endAssignment(assignmentId: string): Observable<DriverAssignment> {
    return this.http.post<DriverAssignment>(
      this.url(`/driver-assignments/${assignmentId}/end`),
      {},
    );
  }

  listViolations(driverId: string): Observable<DriverViolation[]> {
    return this.http.get<DriverViolation[]>(
      this.url(`/drivers/${driverId}/violations`),
    );
  }

  recordViolation(
    driverId: string,
    violation: Omit<DriverViolation, 'id'>,
  ): Observable<DriverViolation> {
    return this.http.post<DriverViolation>(
      this.url(`/drivers/${driverId}/violations`),
      violation,
    );
  }
}
