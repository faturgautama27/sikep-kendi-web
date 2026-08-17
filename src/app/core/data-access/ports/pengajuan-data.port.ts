import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Pengajuan,
  PengajuanStatus,
  PengajuanJenis,
  ApprovalPolicy,
} from '@shared/models';

export interface PengajuanFilter {
  status?: PengajuanStatus;
  jenis?: PengajuanJenis;
  vehicleId?: string;
  pengemudiId?: string;
  from?: string;
  to?: string;
}

export type PengajuanCreateInput = Omit<
  Pengajuan,
  | 'id'
  | 'nomor'
  | 'status'
  | 'createdAt'
  | 'approvalSteps'
  | 'workOrderId'
  | 'submittedAt'
  | 'approvedAt'
  | 'rejectedAt'
> & { fotoIds?: number[] };

export interface ServiceIntervalValidation {
  eligible: boolean;
  lastServiceDate?: string;
  lastServiceOdometer?: number;
  currentOdometer?: number;
  requiredIntervalDays?: number;
  requiredIntervalKm?: number;
  daysSinceLastService?: number;
  kmSinceLastService?: number;
  daysEligible?: boolean;
  kmEligible?: boolean;
  daysRemaining?: number;
  kmRemaining?: number;
  message: string;
  details?: string[];
}

export interface PengajuanDataPort {
  list(filter?: PengajuanFilter): Observable<Pengajuan[]>;
  getById(id: string): Observable<Pengajuan>;
  create(input: PengajuanCreateInput): Observable<Pengajuan>;
  update(id: string, input: Partial<PengajuanCreateInput>): Observable<Pengajuan>;
  submit(id: string): Observable<Pengajuan>;
  approve(id: string, vendorId: string, komentarVerifikasi?: string): Observable<Pengajuan>;
  reject(id: string, reason: string): Observable<Pengajuan>;
  listApprovalPolicies(): Observable<ApprovalPolicy[]>;
  updateApprovalPolicies(policies: ApprovalPolicy[]): Observable<ApprovalPolicy[]>;
  validateServiceInterval(payload: {
    kendaraanId: number;
    jenisPengajuan: string;
    odometerSaatPengajuan: number;
  }): Observable<ServiceIntervalValidation>;
}

export const PENGAJUAN_DATA = new InjectionToken<PengajuanDataPort>('PENGAJUAN_DATA');
