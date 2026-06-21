import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { AuthState } from '@features/login/state';

/**
 * ARMADIN — Halaman Profile.
 *
 * Menampilkan ringkas profil user aktif (avatar, nama, role, email, kontak,
 * unit kerja) dari `AuthState.user`. Menyediakan dua aksi:
 * - **Ubah Password**: tombol placeholder (modal akan dibuat di task 26.x).
 * - **Pengaturan Notifikasi**: navigasi ke `/profile/notification-preferences`.
 *
 * Phase 1 read-only; mutasi password belum diimplementasi.
 *
 * Referensi: Requirement 12.4 (preferensi notifikasi user).
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AvatarModule, ButtonModule, CardModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  /** User aktif (signal) — `null` bila belum login. */
  protected readonly user = this.store.selectSignal(AuthState.user);

  /** Inisial dua karakter dari `fullName` untuk fallback avatar. */
  protected readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    if (!name) {
      return 'U';
    }
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase() || 'U';
  });

  /**
   * Label role pertama yang ditampilkan di header. Mengubah `admin_sistem`
   * → "Admin Sistem", `pengurus_barang` → "Pengurus Barang", dst.
   */
  protected readonly primaryRole = computed(() => {
    const roles = this.user()?.roles ?? [];
    if (roles.length === 0) {
      return '-';
    }
    return roles[0]
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  });

  protected openNotificationPreferences(): void {
    void this.router.navigateByUrl('/profile/notification-preferences');
  }

  protected openChangePassword(): void {
    // Placeholder — modal change password dibangun di task 26.x.
  }
}
