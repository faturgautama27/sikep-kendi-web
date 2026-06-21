import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderProgress,
  WorkOrderEvidence,
} from '@shared/models';

export interface WorkOrderFilter {
  status?: WorkOrderStatus;
  vendorId?: string;
}

export interface WorkOrderDataPort {
  list(filter?: WorkOrderFilter): Observable<WorkOrder[]>;
  getById(id: string): Observable<WorkOrder>;
  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder>;
  addProgress(
    workOrderId: string,
    progress: Omit<WorkOrderProgress, 'id'>,
  ): Observable<WorkOrderProgress>;
  addEvidence(
    workOrderId: string,
    evidence: Omit<WorkOrderEvidence, 'id'>,
  ): Observable<WorkOrderEvidence>;
  complete(workOrderId: string, notes: string): Observable<WorkOrder>;
  validate(workOrderId: string, accepted: boolean, reason?: string): Observable<WorkOrder>;
}

export const WORKORDER_DATA = new InjectionToken<WorkOrderDataPort>('WORKORDER_DATA');
