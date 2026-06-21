import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  WorkOrder,
  WorkOrderProgress,
  WorkOrderEvidence,
} from '@shared/models';
import type {
  WorkOrderDataPort,
  WorkOrderFilter,
} from '../ports/work-order-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of WorkOrderDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiWorkOrderData implements WorkOrderDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(filter?: WorkOrderFilter): Observable<WorkOrder[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.vendorId) params = params.set('vendorId', filter.vendorId);
    return this.http.get<WorkOrder[]>(this.url('/work-orders'), { params });
  }

  getById(id: string): Observable<WorkOrder> {
    return this.http.get<WorkOrder>(this.url(`/work-orders/${id}`));
  }

  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(this.url(`/work-orders/${workOrderId}/assign`), {
      vendorId,
    });
  }

  addProgress(
    workOrderId: string,
    progress: Omit<WorkOrderProgress, 'id'>,
  ): Observable<WorkOrderProgress> {
    return this.http.post<WorkOrderProgress>(
      this.url(`/work-orders/${workOrderId}/progress`),
      progress,
    );
  }

  addEvidence(
    workOrderId: string,
    evidence: Omit<WorkOrderEvidence, 'id'>,
  ): Observable<WorkOrderEvidence> {
    return this.http.post<WorkOrderEvidence>(
      this.url(`/work-orders/${workOrderId}/evidence`),
      evidence,
    );
  }

  complete(workOrderId: string, notes: string): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(this.url(`/work-orders/${workOrderId}/complete`), {
      notes,
    });
  }

  validate(
    workOrderId: string,
    accepted: boolean,
    reason?: string,
  ): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(this.url(`/work-orders/${workOrderId}/validate`), {
      accepted,
      reason,
    });
  }
}
