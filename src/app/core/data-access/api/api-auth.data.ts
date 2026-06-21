import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AuthDataPort, AuthSession } from '../ports/auth-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of AuthDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiAuthData implements AuthDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.http.post<AuthSession>(this.url('/auth/login'), { username, password });
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.url('/auth/logout'), {});
  }

  getCurrentUser(): Observable<AuthSession['user'] | null> {
    return this.http.get<AuthSession['user'] | null>(this.url('/auth/me'));
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(this.url('/auth/change-password'), {
      oldPassword,
      newPassword,
    });
  }
}
