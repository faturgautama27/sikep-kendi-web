/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { AuthDataPort, AuthSession } from '../ports/auth-data.port';

/**
 * Preview-mode implementation of AuthDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.1.
 */
@Injectable({ providedIn: 'root' })
export class PreviewAuthData implements AuthDataPort {
  login(username: string, password: string): Observable<AuthSession> {
    return of({
      accessToken: `preview-token-${Date.now()}`,
      user: {
        id: username,
        username,
        fullName: username,
        email: `${username}@preview.local`,
        roles: [],
        permissions: [],
        forceChangePassword: false,
      },
    });
  }

  logout(): Observable<void> {
    return of(void 0);
  }

  getCurrentUser(): Observable<AuthSession['user'] | null> {
    return of(null);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return of(void 0);
  }
}
