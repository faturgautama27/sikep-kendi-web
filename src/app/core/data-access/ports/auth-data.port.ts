import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { User } from '@shared/models';

export interface AuthDataPort {
  login(username: string, password: string): Observable<User>;
  logout(): Observable<void>;
  getCurrentUser(): Observable<User | null>;
  changePassword(oldPassword: string, newPassword: string): Observable<void>;
}

export const AUTH_DATA = new InjectionToken<AuthDataPort>('AUTH_DATA');
