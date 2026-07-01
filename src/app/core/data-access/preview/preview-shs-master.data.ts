import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { ShsMasterDataPort, ShsMasterCreateInput } from '../ports/shs-master-data.port';
import { ShsMaster } from '@shared/models/shs-master';

@Injectable({ providedIn: 'root' })
export class PreviewShsMasterData implements ShsMasterDataPort {
  list(): Observable<ShsMaster[]> {
    return of([]);
  }

  getById(id: number): Observable<ShsMaster> {
    return of({ id } as ShsMaster);
  }

  create(payload: ShsMasterCreateInput): Observable<ShsMaster> {
    return of({ id: 1, ...payload } as ShsMaster);
  }

  update(id: number, payload: Partial<ShsMasterCreateInput>): Observable<ShsMaster> {
    return of({ id, ...payload } as ShsMaster);
  }

  delete(id: number): Observable<void> {
    return of(undefined);
  }
}
