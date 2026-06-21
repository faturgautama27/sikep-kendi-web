import type { User } from '@shared/models';

/**
 * Action: dispatched ketika user submit form login.
 *
 * Preview Mode: handler menerima `username` apapun dan resolve user dari
 * `knownUsers` (di-seed via {@link HydrateFromFixtures}). Bila tidak ditemukan,
 * state tetap unauthenticated. Password diabaikan di Preview tetapi tetap
 * diterima agar kontrak action konsisten ketika diganti dengan API call
 * di Fase 4.
 */
export class Login {
  static readonly type = '[Auth] Login';
  readonly type = Login.type;

  constructor(
    public readonly username: string,
    public readonly password: string,
  ) {}
}

/**
 * Action: dispatched ketika user logout.
 *
 * Reset state ke default unauthenticated (`user=null`, `token=null`).
 * `knownUsers` cache tetap dipertahankan agar login berikutnya tidak perlu
 * re-hydrate.
 */
export class Logout {
  static readonly type = '[Auth] Logout';
  readonly type = Logout.type;
}

/**
 * Action: load user aktif berdasarkan id, biasanya dipanggil setelah
 * page reload atau resume session di Preview Mode.
 */
export class LoadCurrentUser {
  static readonly type = '[Auth] Load Current User';
  readonly type = LoadCurrentUser.type;

  constructor(public readonly userId: string) {}
}

/**
 * Action: set current user secara eksplisit (mis. setelah API call atau
 * impersonation di tooling internal).
 */
export class SetCurrentUser {
  static readonly type = '[Auth] Set Current User';
  readonly type = SetCurrentUser.type;

  constructor(
    public readonly user: User | null,
    public readonly token: string | null,
  ) {}
}
