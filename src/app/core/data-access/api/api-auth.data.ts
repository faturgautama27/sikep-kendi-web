import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { User } from '@shared/models';
import type { AuthDataPort } from '../ports/auth-data.port';
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

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>(this.url('/auth/login'), { username, password });
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.url('/auth/logout'), {});
  }

  getCurrentUser(): Observable<User | null> {
    return this.http.get<User | null>(this.url('/auth/me'));
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(this.url('/auth/change-password'), {
      oldPassword,
      newPassword,
    });
  }
}
