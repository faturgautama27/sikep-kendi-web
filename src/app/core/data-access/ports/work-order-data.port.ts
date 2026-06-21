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

export interface WorkOrderDataPort {
  list(filter?: WorkOrderFilter): Observable<WorkOrder[]>;
  getById(id: string): Observable<WorkOrder>;
  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder>;
}

export const WORKORDER_DATA = new InjectionToken<WorkOrderDataPort>('WORKORDER_DATA');
