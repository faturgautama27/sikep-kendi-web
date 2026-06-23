import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { APP_ENV } from '../app-env.token';
import type { EarlyWarningConfig, User, VendorAdmin, RoleName } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class AdminDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private readonly baseUrl = `${this.env.apiBaseUrl}/admin`;

  // --- Users ---
  getUsers(): Observable<User[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`).pipe(
      map(users => users.map((u: any) => this.mapUser(u)))
    );
  }

  createUser(payload: { username: string; fullName: string; email: string; roles: string[] }): Observable<User> {
    return this.http.post<any>(`${this.baseUrl}/users`, payload).pipe(
      map(u => this.mapUser(u))
    );
  }

  updateUser(id: string | number, payload: { isActive?: boolean; roles?: string[] }): Observable<User> {
    return this.http.patch<any>(`${this.baseUrl}/users/${id}`, payload).pipe(
      map(u => this.mapUser(u))
    );
  }

  private mapUser(u: any): User {
    if (!u) return u;
    return {
      ...u,
      roles: Array.isArray(u.roles) ? u.roles.map((r: any) => r.role?.name || r) : [],
    };
  }

  resetPassword(id: string | number): Observable<{ reset: boolean }> {
    return this.http.patch<{ reset: boolean }>(`${this.baseUrl}/users/${id}/reset-password`, {});
  }

  getRoles(): Observable<{ name: string; description: string }[]> {
    return this.http.get<{ name: string; description: string }[]>(`${this.baseUrl}/roles`);
  }

  // --- Vendors ---
  getVendors(): Observable<VendorAdmin[]> {
    return this.http.get<VendorAdmin[]>(`${this.baseUrl}/vendors`);
  }

  createVendor(payload: { namaVendor: string; alamat: string; kontak: string; email: string }): Observable<VendorAdmin> {
    return this.http.post<VendorAdmin>(`${this.baseUrl}/vendors`, payload);
  }

  updateVendor(id: string | number, payload: { namaVendor?: string; alamat?: string; kontak?: string; email?: string; isAktif?: boolean }): Observable<VendorAdmin> {
    return this.http.patch<VendorAdmin>(`${this.baseUrl}/vendors/${id}`, payload);
  }

  // --- Early Warning ---
  getEwConfigs(): Observable<EarlyWarningConfig[]> {
    return this.http.get<EarlyWarningConfig[]>(`${this.baseUrl}/early-warning-configs`);
  }

  updateEwConfig(id: string | number, payload: { ambangBulan?: number; ambangKm?: number; ambangHari?: number; isActive: boolean }): Observable<EarlyWarningConfig> {
    return this.http.patch<EarlyWarningConfig>(`${this.baseUrl}/early-warning-configs/${id}`, payload);
  }
}
