import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  SpjExternal,
  SpjStatus,
  SpjReportPeriode,
  InternalKind,
} from '@shared/models';

export interface SpjFilter {
  status?: SpjStatus;
  vendorId?: string;
  from?: string;
  to?: string;
}

export type SpjUploadInput = Omit<
  SpjExternal,
  | 'id'
  | 'status'
  | 'uploadedAt'
  | 'daysSinceUpload'
  | 'match'
  | 'followUp'
  | 'candidates'
> & { fileBlob?: Blob };

export interface SpjDataPort {
  list(filter?: SpjFilter): Observable<SpjExternal[]>;
  getById(id: string): Observable<SpjExternal>;
  upload(input: SpjUploadInput): Observable<SpjExternal>;
  resolveAmbiguous(
    spjId: string,
    candidateRef: { kind: InternalKind; id: string },
  ): Observable<SpjExternal>;
  markNeedsFollowUp(spjId: string, alasan: string, langkah: string): Observable<SpjExternal>;
  getReport(period: { from: string; to: string }): Observable<SpjReportPeriode>;
}

export const SPJ_DATA = new InjectionToken<SpjDataPort>('SPJ_DATA');
