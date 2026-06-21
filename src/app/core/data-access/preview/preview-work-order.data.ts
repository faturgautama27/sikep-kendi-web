/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type {
  WorkOrder,
  WorkOrderProgress,
  WorkOrderEvidence,
} from '@shared/models';
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

  addProgress(
    workOrderId: string,
    progress: Omit<WorkOrderProgress, 'id'>,
  ): Observable<WorkOrderProgress> {
    return of({ ...progress, id: 'preview' } as unknown as WorkOrderProgress);
  }

  addEvidence(
    workOrderId: string,
    evidence: Omit<WorkOrderEvidence, 'id'>,
  ): Observable<WorkOrderEvidence> {
    return of({ ...evidence, id: 'preview' } as unknown as WorkOrderEvidence);
  }

  complete(workOrderId: string, notes: string): Observable<WorkOrder> {
    return of({ id: workOrderId, status: 'completed' } as unknown as WorkOrder);
  }

  validate(
    workOrderId: string,
    accepted: boolean,
    reason?: string,
  ): Observable<WorkOrder> {
    return of({
      id: workOrderId,
      status: accepted ? 'validated_accepted' : 'validated_rejected',
    } as unknown as WorkOrder);
  }
}
