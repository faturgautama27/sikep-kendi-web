import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { RoleName, User } from '@shared/models';

import {
  LoadCurrentUser,
  Login,
  Logout,
  SetCurrentUser,
} from './auth.actions';

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
    ctx.patchState({ knownUsers: action.payload.users as User[] });
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
  login(ctx: StateContext<AuthStateModel>, action: Login): void {
    const known = ctx.getState().knownUsers;
    const user = known.find((u) => u.username === action.username);
    if (!user) {
      ctx.patchState({ user: null, token: null });
      return;
    }
    ctx.patchState({
      user,
      token: `preview-token-${user.id}-${Date.now()}`,
    });
  }

  /** Reset sesi ke unauthenticated. `knownUsers` cache dipertahankan. */
  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>): void {
    ctx.patchState({ user: null, token: null });
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
  ): void {
    const user =
      ctx.getState().knownUsers.find((u) => u.id === action.userId) ?? null;
    ctx.patchState({ user });
  }

  /** Set user dan token secara eksplisit. */
  @Action(SetCurrentUser)
  setCurrentUser(
    ctx: StateContext<AuthStateModel>,
    action: SetCurrentUser,
  ): void {
    ctx.patchState({ user: action.user, token: action.token });
  }
}
