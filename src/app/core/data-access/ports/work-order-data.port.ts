import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  WorkOrder,
  WorkOrderStatus,
} from '@shared/models';

export interface WorkOrderFilter {
  status?: WorkOrderStatus;
  vendorId?: string;
}

export interface ShsItemInput {
  namaItem: string;
  hargaVendor: number;
  hargaStandart: number;
  shsMasterId?: number;
  keterangan?: string;
}

export interface WorkOrderDataPort {
  list(filter?: WorkOrderFilter): Observable<WorkOrder[]>;
  getById(id: string): Observable<WorkOrder>;
  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder>;
  approvePPTK(workOrderId: string): Observable<WorkOrder>;
  rejectPPTK(workOrderId: string, catatan: string): Observable<WorkOrder>;
  // Step D: PB input SHS
  saveShsMapping(workOrderId: string, items: ShsItemInput[]): Observable<any>;
  // Step D: PB review (approve/reject)
  pbReviewShs(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder>;
  // Step E: Vendor submit invoice
  submitInvoice(workOrderId: string, invoiceImageId: number, invoiceDraftImageId?: number, dokumentasiImageIds?: number[], dokumentasiKategori?: string[]): Observable<WorkOrder>;
  // Step F: Verifikator review
  verifikatorReview(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder>;
  // Step G: PPTK approve (updated)
  pptkApprove(workOrderId: string, approved: boolean, komentar?: string, alasan?: string): Observable<WorkOrder>;
}

export const WORKORDER_DATA = new InjectionToken<WorkOrderDataPort>('WORKORDER_DATA');
