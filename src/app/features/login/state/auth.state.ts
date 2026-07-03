import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, map, of, tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { AUTH_DATA, type AuthDataPort, type AuthSession } from '@core/data-access/ports/auth-data.port';
import type { RoleName, User } from '@shared/models';

import {
  LoadCurrentUser,
  Login,
  Logout,
  SetCurrentUser,
} from './auth.actions';

const VALID_ROLES: RoleName[] = [
  'pengemudi',
  'pengurus_barang',
  'vendor',
  'verifikator',
  'bendahara',
  'admin_sistem',
  'pptk'
];

/**
 * Shape state slice `auth`.
 *
 * - `user`: data user yang sedang login (atau `null` bila unauthenticated).
 * - `token`: token sesi (preview-token di Preview Mode, Sanctum token di Fase 4).
 * - `knownUsers`: cache koleksi user dari fixture untuk resolusi role lokal
 *   (Preview Mode). Slot ini di-seed sekali via {@link HydrateFromFixtures}
 *   sehingga handler {@link Login} tidak perlu mengakses fixture file langsung.
 */
export interface AuthStateModel {
  user: User | null;
  token: string | null;
  knownUsers: User[];
}

const INITIAL: AuthStateModel = {
  user: null,
  token: null,
  knownUsers: [],
};

/**
 * NGXS state slice `auth`.
 *
 * Mengelola sesi user, token, serta projection role dan permission untuk
 * komponen UI dan guard. Di Preview Mode (Fase 1), seluruh logic resolve user
 * berdasarkan fixture lokal — tidak ada panggilan HTTP keluar.
 *
 * Selectors:
 * - {@link AuthState.user} — user aktif (atau null).
 * - {@link AuthState.token} — token sesi.
 * - {@link AuthState.isAuthenticated} — boolean convenience untuk guard.
 * - {@link AuthState.roles} — daftar role user aktif.
 * - {@link AuthState.permissions} — daftar permission user aktif.
 *
 * @see HydrateFromFixtures
 */
@State<AuthStateModel>({
  name: 'auth',
  defaults: INITIAL,
})
@Injectable()
export class AuthState {
  private readonly env = inject(APP_ENV);
  private readonly authData = inject<AuthDataPort>(AUTH_DATA);

  @Selector()
  static user(state: AuthStateModel): User | null {
    return state.user;
  }

  @Selector()
  static token(state: AuthStateModel): string | null {
    return state.token;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.user !== null && state.token !== null;
  }

  @Selector()
  static roles(state: AuthStateModel): RoleName[] {
    return state.user?.roles ?? [];
  }

  @Selector()
  static permissions(state: AuthStateModel): string[] {
    return state.user?.permissions ?? [];
  }

  /**
   * Seed cache `knownUsers` dari fixture saat startup Preview Mode.
   * Action `HydrateFromFixtures` di-dispatch oleh `FixtureBootstrapService`.
   */
  @Action(HydrateFromFixtures)
  hydrate(
    ctx: StateContext<AuthStateModel>,
    action: HydrateFromFixtures,
  ): void {
    const users = (action.payload.users as User[]).map((user) => this.normalizeUser(user));
    ctx.patchState({ knownUsers: users });
  }

  /**
   * Preview Mode login: resolve user berdasarkan `username` dari fixture.
   *
   * Behaviour:
   * - Jika `username` cocok dengan salah satu `knownUsers`, set `user` dan
   *   generate `token` dummy berformat `preview-token-<userId>-<timestamp>`.
   * - Jika tidak ditemukan, reset state ke unauthenticated. (Komponen UI
   *   bertanggung jawab menampilkan pesan error berdasarkan selector
   *   `isAuthenticated` setelah dispatch.)
   *
   * Password diabaikan di Preview Mode; cukup non-empty saja untuk lewat
   * validasi form.
   */
  @Action(Login)
  login(ctx: StateContext<AuthStateModel>, action: Login) {
    if (!this.env.previewMode) {
      return this.authData.login(action.username.trim(), action.password).pipe(
        tap((session) => {
          ctx.patchState({
            user: this.normalizeApiUser(session.user),
            token: session.accessToken,
          });
        }),
      );
    }

    const known = ctx.getState().knownUsers;
    const username = action.username.trim().toLowerCase();
    const user = known.find((u) => u.username.toLowerCase() === username);
    if (!user) {
      ctx.patchState({ user: null, token: null });
      return;
    }
    ctx.patchState({
      user,
      token: `preview-token-${user.id}-${Date.now()}`,
    });
    return;
  }

  /** Reset sesi ke unauthenticated. `knownUsers` cache dipertahankan. */
  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    if (!this.env.previewMode) {
      return this.authData.logout().pipe(
        catchError(() => of(void 0)),
        tap(() => {
          ctx.patchState({ user: null, token: null });
        }),
      );
    }

    ctx.patchState({ user: null, token: null });
    return;
  }

  /**
   * Resolve user berdasarkan `userId` dari fixture cache. Tidak menyentuh
   * `token` agar bisa dipakai untuk hydrate ulang detail user setelah
   * resume session.
   */
  @Action(LoadCurrentUser)
  loadCurrentUser(
    ctx: StateContext<AuthStateModel>,
    action: LoadCurrentUser,
  ) {
    if (!this.env.previewMode) {
      return this.authData.getCurrentUser().pipe(
        map((user) => (user ? this.normalizeApiUser(user) : null)),
        tap((user) => {
          ctx.patchState({ user });
        }),
      );
    }

    const user =
      ctx.getState().knownUsers.find((u) => u.id === action.userId) ?? null;
    ctx.patchState({ user });
    return;
  }

  /** Set user dan token secara eksplisit. */
  @Action(SetCurrentUser)
  setCurrentUser(
    ctx: StateContext<AuthStateModel>,
    action: SetCurrentUser,
  ): void {
    ctx.patchState({
      user: action.user ? this.normalizeUser(action.user) : null,
      token: action.token,
    });
  }

  private normalizeUser(user: User): User {
    return {
      ...user,
      roles: this.normalizeRoles(user.roles),
      permissions: this.normalizePermissions(user.permissions),
    };
  }

  private normalizeApiUser(raw: AuthSession['user']): User {
    const nowIso = new Date().toISOString();

    return this.normalizeUser({
      id: String(raw.id),
      username: raw.username,
      fullName: raw.fullName,
      email: raw.email,
      contact: raw.contact ?? null,
      unitKerja: raw.unitKerja ?? '-',
      roles: raw.roles as RoleName[],
      permissions: raw.permissions,
      isActive: raw.isActive ?? true,
      forceChangePassword: raw.forceChangePassword ?? false,
      lastLoginAt: raw.lastLoginAt ?? null,
      createdAt: raw.createdAt ?? nowIso,
    });
  }

  private normalizeRoles(roles: unknown): RoleName[] {
    if (!Array.isArray(roles)) return [];
    const valid = new Set(VALID_ROLES);
    const mapped = roles
      .filter((role): role is string => typeof role === 'string')
      .map((role) => role.trim())
      .filter((role): role is RoleName => valid.has(role as RoleName));
    return Array.from(new Set(mapped));
  }

  private normalizePermissions(permissions: unknown): string[] {
    if (!Array.isArray(permissions)) return [];
    const mapped = permissions
      .filter((permission): permission is string => typeof permission === 'string')
      .map((permission) => permission.trim())
      .filter((permission) => permission.length > 0);
    return Array.from(new Set(mapped));
  }
}
