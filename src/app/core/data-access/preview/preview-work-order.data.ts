/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { WorkOrder } from '@shared/models';
import type {
  WorkOrderDataPort,
  WorkOrderFilter,
} from '../ports/work-order-data.port';

/**
 * Preview-mode implementation of WorkOrderDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.8.
 */
@Injectable({ providedIn: 'root' })
export class PreviewWorkOrderData implements WorkOrderDataPort {
  list(filter?: WorkOrderFilter): Observable<WorkOrder[]> {
    return of([]);
  }

  getById(id: string): Observable<WorkOrder> {
    return of({ id } as unknown as WorkOrder);
  }

  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder> {
    return of({ id: workOrderId, vendorId } as unknown as WorkOrder);
  }

  approvePPTK(workOrderId: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: 'DISETUJUI_PPTK' } as unknown as WorkOrder);
  }

  rejectPPTK(workOrderId: string, catatan: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: 'DITOLAK_PPTK', rejectedReason: catatan } as unknown as WorkOrder);
  }

  saveShsMapping(workOrderId: string, items: import('../ports/work-order-data.port').ShsItemInput[]): Observable<any> {
    return of({ success: true });
  }

  pbReviewShs(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: approved ? 'MENUNGGU_INVOICE_VENDOR' : 'DITOLAK_PB' } as unknown as WorkOrder);
  }

  submitInvoice(workOrderId: string, invoiceImageId: number, invoiceDraftImageId?: number): Observable<WorkOrder> {
    return of({ id: workOrderId, status: 'MENUNGGU_VERIFIKATOR' } as unknown as WorkOrder);
  }

  verifikatorReview(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: approved ? 'MENUNGGU_PPTK' : 'DITOLAK_VERIFIKATOR' } as unknown as WorkOrder);
  }

  pptkApprove(workOrderId: string, approved: boolean, komentar?: string, alasan?: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK' } as unknown as WorkOrder);
  }
}
