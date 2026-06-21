import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';
import type { VehicleDataPort } from '../ports/vehicle-data.port';
import { APP_ENV } from '../app-env.token';

interface VehicleListResponse {
  success?: boolean;
  data?: ApiVehicle[];
  meta?: { nextCursor?: number | null };
  nextCursor?: number | null;
}

interface VehicleItemResponse {
  success?: boolean;
  data?: ApiVehicle;
}

interface OdometerListResponse {
  success?: boolean;
  data?: ApiOdometerReading[];
}

interface OdometerItemResponse {
  success?: boolean;
  data?: ApiOdometerReading;
}

interface ApiVehicle {
  id: number | string;
  nomorPolisi?: string;
  nomorInventaris?: string;
  merk?: string;
  model?: string;
  tipe?: string;
  tahun?: number;
  nomorRangka?: string;
  nomorMesin?: string;
  jenisKendaraan?: string;
  unitKerja?: string;
  status?: string;
  odometerSaatIni?: number;
  odometerCurrent?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiOdometerReading {
  id: number | string;
  kendaraanId?: number | string;
  vehicleId?: number | string;
  nilaiKm?: number;
  valueKm?: number;
  recordedAt?: string;
  pencatatId?: number | string;
  recordedBy?: number | string;
}

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

  private mapStatus(status: string | undefined): Vehicle['status'] {
    switch ((status ?? '').toUpperCase()) {
      case 'AKTIF':
        return 'active';
      case 'DALAM_PERBAIKAN':
        return 'in_repair';
      case 'NONAKTIF':
        return 'retired';
      default:
        return 'active';
    }
  }

  private mapJenis(jenis: string | undefined): Vehicle['jenisKendaraan'] {
    const normalized = (jenis ?? '').toLowerCase();
    if (normalized === 'mobil' || normalized === 'motor' || normalized === 'truk' || normalized === 'bus') {
      return normalized;
    }
    return 'lainnya';
  }

  private mapVehicle(raw: ApiVehicle): Vehicle {
    const nowIso = new Date().toISOString();
    return {
      id: String(raw.id),
      nomorPolisi: raw.nomorPolisi ?? '-',
      nomorInventaris: raw.nomorInventaris ?? String(raw.id),
      merk: raw.merk ?? '-',
      tipe: raw.tipe ?? raw.model ?? '-',
      tahun: Number(raw.tahun ?? 0),
      nomorRangka: raw.nomorRangka ?? '-',
      nomorMesin: raw.nomorMesin ?? '-',
      jenisKendaraan: this.mapJenis(raw.jenisKendaraan),
      unitKerja: raw.unitKerja ?? '-',
      status: this.mapStatus(raw.status),
      odometerCurrent: Number(raw.odometerCurrent ?? raw.odometerSaatIni ?? 0),
      baselinePhotos: [],
      createdAt: raw.createdAt ?? nowIso,
      updatedAt: raw.updatedAt ?? nowIso,
    };
  }

  private mapOdometer(raw: ApiOdometerReading, vehicleId: string): OdometerReading {
    return {
      id: String(raw.id),
      vehicleId,
      valueKm: Number(raw.valueKm ?? raw.nilaiKm ?? 0),
      recordedAt: raw.recordedAt ?? new Date().toISOString(),
      recordedBy: String(raw.recordedBy ?? raw.pencatatId ?? 'system'),
      recordedByName: 'System',
      source: 'manual',
    };
  }

  list(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[] | VehicleListResponse>(this.url('/vehicles')).pipe(
      map((resp) => {
        const rows = Array.isArray(resp) ? resp : (resp.data ?? []);
        return rows.map((item) => this.mapVehicle(item as ApiVehicle));
      }),
    );
  }

  getById(id: string): Observable<Vehicle> {
    return this.http.get<ApiVehicle | VehicleItemResponse>(this.url(`/vehicles/${id}`)).pipe(
      map((resp) => {
        const row = (resp as VehicleItemResponse).data ?? (resp as ApiVehicle);
        return this.mapVehicle(row);
      }),
    );
  }

  create(input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Observable<Vehicle> {
    return this.http.post<ApiVehicle | VehicleItemResponse>(this.url('/vehicles'), input).pipe(
      map((resp) => {
        const row = (resp as VehicleItemResponse).data ?? (resp as ApiVehicle);
        return this.mapVehicle(row);
      }),
    );
  }

  update(id: string, patch: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.patch<ApiVehicle | VehicleItemResponse>(this.url(`/vehicles/${id}`), patch).pipe(
      map((resp) => {
        const row = (resp as VehicleItemResponse).data ?? (resp as ApiVehicle);
        return this.mapVehicle(row);
      }),
    );
  }

  retire(id: string): Observable<Vehicle> {
    return this.http.patch<ApiVehicle | VehicleItemResponse>(this.url(`/vehicles/${id}`), { status: 'NONAKTIF' }).pipe(
      map((resp) => {
        const row = (resp as VehicleItemResponse).data ?? (resp as ApiVehicle);
        return this.mapVehicle(row);
      }),
    );
  }

  listDocuments(vehicleId: string): Observable<VehicleDocument[]> {
    return of([]);
  }

  addDocument(
    vehicleId: string,
    doc: Omit<VehicleDocument, 'id'>,
  ): Observable<VehicleDocument> {
    return of({ ...doc, id: `doc-${Date.now()}` });
  }

  listOdometerReadings(vehicleId: string): Observable<OdometerReading[]> {
    return this.http.get<ApiOdometerReading[] | OdometerListResponse>(this.url(`/vehicles/${vehicleId}/odometer`)).pipe(
      map((resp) => {
        const rows = Array.isArray(resp) ? resp : ((resp as OdometerListResponse).data ?? []);
        return rows.map((row) => this.mapOdometer(row, vehicleId));
      }),
    );
  }

  addOdometerReading(
    vehicleId: string,
    reading: Omit<OdometerReading, 'id'>,
  ): Observable<OdometerReading> {
    return this.http.post<ApiOdometerReading | OdometerItemResponse>(
      this.url(`/vehicles/${vehicleId}/odometer`),
      reading,
    ).pipe(
      map((resp) => {
        const row = (resp as OdometerItemResponse).data ?? (resp as ApiOdometerReading);
        return this.mapOdometer(row, vehicleId);
      }),
    );
  }
}
