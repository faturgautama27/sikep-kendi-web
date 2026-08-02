import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import type { BastDataPort, BastRecord } from '../ports/bast-data.port';
import { APP_ENV } from '../app-env.token';

function mapBast(raw: any): BastRecord {
  return {
    id:               String(raw.id),
    workOrderId:      String(raw.work_order_id ?? raw.workOrderId),
    nomorBast:        raw.nomor_bast ?? raw.nomorBast ?? '',
    tanggalBast:      raw.tanggal_bast ?? raw.tanggalBast ?? '',
    status:           raw.status ?? 'DRAFT',
    vendorTtdImageId: raw.vendor_ttd_image_id ?? raw.vendorTtdImageId ?? null,
    vendorTtdUrl:     raw.vendor_ttd_url ?? raw.vendorTtdUrl ?? null,
    vendorTtdAt:      raw.vendor_ttd_at ?? raw.vendorTtdAt ?? null,
    pptkTtdImageId:   raw.pptk_ttd_image_id ?? raw.pptkTtdImageId ?? null,
    pptkTtdUrl:       raw.pptk_ttd_url ?? raw.pptkTtdUrl ?? null,
    pptkTtdAt:        raw.pptk_ttd_at ?? raw.pptkTtdAt ?? null,
    pptkId:           raw.pptk_id ? String(raw.pptk_id) : null,
    pdfImageId:       raw.pdf_image_id ?? raw.pdfImageId ?? null,
    createdAt:        raw.created_at ?? raw.createdAt,
    updatedAt:        raw.updated_at ?? raw.updatedAt,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiBastData implements BastDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  getByWorkOrder(woId: string): Observable<BastRecord | null> {
    return this.http.get<any>(this.url(`/work-orders/${woId}/bast`)).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return data ? mapBast(data) : null;
      }),
    );
  }

  generate(woId: string): Observable<BastRecord> {
    return this.http.post<any>(this.url(`/work-orders/${woId}/bast/generate`), {}).pipe(
      map((res) => mapBast(res?.data ?? res)),
    );
  }

  uploadVendorTtd(woId: string, imageId: number): Observable<BastRecord> {
    return this.http
      .post<any>(this.url(`/work-orders/${woId}/bast/vendor-ttd`), { imageId })
      .pipe(map((res) => mapBast(res?.data ?? res)));
  }

  uploadPptkTtd(woId: string, imageId: number): Observable<BastRecord> {
    return this.http
      .post<any>(this.url(`/work-orders/${woId}/bast/pptk-ttd`), { imageId })
      .pipe(map((res) => mapBast(res?.data ?? res)));
  }

  getDownloadUrl(woId: string): string {
    return this.url(`/work-orders/${woId}/bast/download`);
  }
}
