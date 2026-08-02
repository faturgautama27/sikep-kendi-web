import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type {
  LaporanDataPort,
  LaporanBiayaFilter,
  LaporanBiayaResponse,
  LaporanFilter,
} from '../ports/laporan-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiLaporanData implements LaporanDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  private buildParams(filter?: LaporanFilter): HttpParams {
    let params = new HttpParams();
    if (!filter) return params;
    if (filter.startDate)    params = params.set('startDate',    filter.startDate);
    if (filter.endDate)      params = params.set('endDate',      filter.endDate);
    if (filter.kendaraanId)  params = params.set('kendaraanId',  String(filter.kendaraanId));
    if (filter.vendorId)     params = params.set('vendorId',     String(filter.vendorId));
    if (filter.status)       params = params.set('status',       filter.status);
    if (filter.unitKerja)    params = params.set('unitKerja',    filter.unitKerja);
    if (filter.kondisi)      params = params.set('kondisi',      filter.kondisi);
    return params;
  }

  private buildExportUrl(path: string, filter?: LaporanFilter): string {
    const params = this.buildParams(filter);
    const query  = params.toString();
    return `${this.url(path)}${query ? '?' + query : ''}`;
  }

  // ── Laporan Biaya ────────────────────────────────────────────────────────

  getLaporanBiaya(filter: LaporanBiayaFilter): Observable<LaporanBiayaResponse> {
    const params = this.buildParams(filter);
    return this.http
      .get<any>(this.url('/laporan/biaya'), { params })
      .pipe(map((res) => (res.data ? res.data : res)));
  }

  getExportBiayaUrl(filter?: LaporanFilter): string {
    return this.buildExportUrl('/laporan/biaya/export', filter);
  }

  // ── Work Order ───────────────────────────────────────────────────────────

  getWorkOrder(filter?: LaporanFilter): Observable<any[]> {
    return this.http
      .get<any>(this.url('/laporan/work-order'), { params: this.buildParams(filter) })
      .pipe(map((res) => res?.data ?? res));
  }

  getExportWorkOrderUrl(filter?: LaporanFilter): string {
    return this.buildExportUrl('/laporan/work-order/export', filter);
  }

  // ── Pengajuan ────────────────────────────────────────────────────────────

  getPengajuan(filter?: LaporanFilter): Observable<any[]> {
    return this.http
      .get<any>(this.url('/laporan/pengajuan'), { params: this.buildParams(filter) })
      .pipe(map((res) => res?.data ?? res));
  }

  getExportPengajuanUrl(filter?: LaporanFilter): string {
    return this.buildExportUrl('/laporan/pengajuan/export', filter);
  }

  // ── Daftar Barang Milik Daerah ────────────────────────────────────────────

  getDaftarBarang(filter?: LaporanFilter): Observable<any[]> {
    return this.http
      .get<any>(this.url('/laporan/daftar-barang'), { params: this.buildParams(filter) })
      .pipe(map((res) => res?.data ?? res));
  }

  getExportDaftarBarangUrl(filter?: LaporanFilter): string {
    return this.buildExportUrl('/laporan/daftar-barang/export', filter);
  }

  // ── Hasil Pemeliharaan ────────────────────────────────────────────────────

  getHasilPemeliharaan(filter?: LaporanFilter): Observable<any[]> {
    return this.http
      .get<any>(this.url('/laporan/hasil-pemeliharaan'), { params: this.buildParams(filter) })
      .pipe(map((res) => res?.data ?? res));
  }

  getExportHasilPemeliharaanUrl(filter?: LaporanFilter): string {
    return this.buildExportUrl('/laporan/hasil-pemeliharaan/export', filter);
  }

  // ── Kartu Pemeliharaan per Kendaraan ──────────────────────────────────────

  getKartuPemeliharaan(kendaraanId: string | number): Observable<any> {
    return this.http
      .get<any>(this.url(`/laporan/kartu-pemeliharaan/${kendaraanId}`))
      .pipe(map((res) => res?.data ?? res));
  }

  getExportKartuPemeliharaanUrl(kendaraanId: string | number): string {
    return this.url(`/laporan/kartu-pemeliharaan/${kendaraanId}/export`);
  }
}
