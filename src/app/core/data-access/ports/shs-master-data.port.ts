import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ShsMaster } from '@shared/models/shs-master';

export type ShsMasterCreateInput = Omit<ShsMaster, 'id' | 'createdAt' | 'updatedAt'>;

export interface ShsMasterDataPort {
  list(): Observable<ShsMaster[]>;
  getById(id: number): Observable<ShsMaster>;
  create(payload: ShsMasterCreateInput): Observable<ShsMaster>;
  update(id: number, payload: Partial<ShsMasterCreateInput>): Observable<ShsMaster>;
  delete(id: number): Observable<void>;
}

export const SHS_MASTER_DATA = new InjectionToken<ShsMasterDataPort>('SHS_MASTER_DATA');
