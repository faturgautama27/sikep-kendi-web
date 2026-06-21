/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { User } from '@shared/models';
import type { AuthDataPort } from '../ports/auth-data.port';

/**
 * Preview-mode implementation of AuthDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.1.
 */
@Injectable({ providedIn: 'root' })
export class PreviewAuthData implements AuthDataPort {
  login(username: string, password: string): Observable<User> {
    return of({ username } as unknown as User);
  }

  logout(): Observable<void> {
    return of(void 0);
  }

  getCurrentUser(): Observable<User | null> {
    return of(null);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return of(void 0);
  }
}
