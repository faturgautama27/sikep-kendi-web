import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { User } from '@shared/models';

export interface AuthSession {
  accessToken: string;
  user: {
    id: string | number;
    username: string;
    fullName: string;
    email: string;
    roles: string[];
    permissions: string[];
    forceChangePassword?: boolean;
    contact?: string | null;
    unitKerja?: string;
    active?: boolean;
    lastLoginAt?: string | null;
    createdAt?: string;
  };
}

export interface AuthDataPort {
  login(username: string, password: string): Observable<AuthSession>;
  logout(): Observable<void>;
  getCurrentUser(): Observable<AuthSession['user'] | null>;
  changePassword(oldPassword: string, newPassword: string): Observable<void>;
}

export const AUTH_DATA = new InjectionToken<AuthDataPort>('AUTH_DATA');
