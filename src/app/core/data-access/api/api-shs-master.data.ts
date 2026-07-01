import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { ShsMasterDataPort, ShsMasterCreateInput } from '../ports/shs-master-data.port';
import { APP_ENV } from '../app-env.token';
import { ShsMaster } from '@shared/models/shs-master';

@Injectable({ providedIn: 'root' })
export class ApiShsMasterData implements ShsMasterDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  private unwrap(res: any): any {
    return res.data ? res.data : res;
  }

  list(): Observable<ShsMaster[]> {
    return this.http.get<any>(this.url('/shs-master')).pipe(map(res => this.unwrap(res)));
  }

  getById(id: number): Observable<ShsMaster> {
    return this.http.get<any>(this.url(`/shs-master/${id}`)).pipe(map(res => this.unwrap(res)));
  }

  create(payload: ShsMasterCreateInput): Observable<ShsMaster> {
    return this.http.post<any>(this.url('/shs-master'), payload).pipe(map(res => this.unwrap(res)));
  }

  update(id: number, payload: Partial<ShsMasterCreateInput>): Observable<ShsMaster> {
    return this.http.patch<any>(this.url(`/shs-master/${id}`), payload).pipe(map(res => this.unwrap(res)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/shs-master/${id}`));
  }
}
