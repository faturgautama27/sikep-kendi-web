import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export type BastStatus = 'DRAFT' | 'VENDOR_SIGNED' | 'COMPLETE';

export interface BastRecord {
  id: string;
  workOrderId: string;
  nomorBast: string;
  tanggalBast: string;
  status: BastStatus;
  // TTD Vendor
  vendorTtdImageId?: number | null;
  vendorTtdUrl?: string | null;
  vendorTtdAt?: string | null;
  // TTD PPTK
  pptkTtdImageId?: number | null;
  pptkTtdUrl?: string | null;
  pptkTtdAt?: string | null;
  pptkId?: string | null;
  // PDF
  pdfImageId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BastDataPort {
  /** Ambil data BAST untuk WO tertentu (null jika belum dibuat) */
  getByWorkOrder(woId: string): Observable<BastRecord | null>;
  /** Generate/re-generate PDF BAST dari data WO */
  generate(woId: string): Observable<BastRecord>;
  /** Vendor upload TTD */
  uploadVendorTtd(woId: string, imageId: number): Observable<BastRecord>;
  /** PPTK upload TTD */
  uploadPptkTtd(woId: string, imageId: number): Observable<BastRecord>;
  /** Download PDF BAST — returns blob URL */
  getDownloadUrl(woId: string): string;
}

export const BAST_DATA = new InjectionToken<BastDataPort>('BAST_DATA');
