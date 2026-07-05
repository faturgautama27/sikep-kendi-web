import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';

import { AuthState } from '@features/login/state';
import { AUTH_DATA, type AuthDataPort } from '@core/data-access/ports/auth-data.port';

/**
 * SiKeP KenDI — Halaman Profile.
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
  imports: [
    FormsModule,
    AvatarModule,
    ButtonModule,
    CardModule,
    DialogModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly authData = inject<AuthDataPort>(AUTH_DATA);
  private readonly messageService = inject(MessageService);

  /** User aktif (signal) — `null` bila belum login. */
  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly changePasswordVisible = signal(false);
  protected readonly submittingPassword = signal(false);
  protected readonly oldPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

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
    this.oldPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.changePasswordVisible.set(true);
  }

  protected submitChangePassword(): void {
    if (this.submittingPassword()) return;

    const oldPassword = this.oldPassword().trim();
    const newPassword = this.newPassword().trim();
    const confirmPassword = this.confirmPassword().trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validasi',
        detail: 'Semua field password wajib diisi.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validasi',
        detail: 'Konfirmasi password tidak cocok.',
      });
      return;
    }

    this.submittingPassword.set(true);
    this.authData.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.submittingPassword.set(false);
        this.changePasswordVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'Password berhasil diubah.',
        });
      },
      error: () => {
        this.submittingPassword.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Gagal',
          detail: 'Password lama salah atau request gagal.',
        });
      },
    });
  }
}
