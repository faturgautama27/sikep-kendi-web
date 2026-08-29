import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';

import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

import { AuthState } from '@features/login/state';
import { AUTH_DATA, type AuthDataPort } from '@core/data-access/ports/auth-data.port';
import { APP_ENV } from '@core/data-access/app-env.token';

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
    InputTextModule,
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
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  /** User aktif (signal) — `null` bila belum login. */
  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly changePasswordVisible = signal(false);
  protected readonly submittingPassword = signal(false);
  protected readonly oldPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  /** Profil vendor (hanya untuk role vendor) */
  protected readonly isVendor = computed(() => this.user()?.roles?.includes('vendor') ?? false);
  protected readonly vendorLoading = signal(false);
  protected readonly vendorSaving = signal(false);
  protected readonly vendorNamaPimpinan = signal('');
  protected readonly vendorSignatureImageUrl = signal<string | null>(null);
  protected readonly vendorSignatureImageId = signal<number | null>(null);
  protected readonly vendorId = signal<number | null>(null);

  constructor() {
    // Muat data vendor saat role vendor
    setTimeout(() => {
      if (this.isVendor()) this.loadVendorProfile();
    }, 100);
  }

  private loadVendorProfile() {
    this.vendorLoading.set(true);
    this.http.get<any>(`${this.env.apiBaseUrl}/vendors/profile/me`).subscribe({
      next: (res) => {
        const v = res?.data ?? res;
        this.vendorId.set(v?.id ?? null);
        this.vendorNamaPimpinan.set(v?.namaPimpinan ?? '');
        this.vendorSignatureImageUrl.set(v?.signatureImageUrl ?? null);
        this.vendorSignatureImageId.set(v?.signatureImageId ?? null);
        this.vendorLoading.set(false);
      },
      error: () => this.vendorLoading.set(false),
    });
  }

  protected onVendorSignatureFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.vendorId()) return;
    const form = new FormData();
    form.append('file', file);
    form.append('category', 'signature');
    this.vendorSaving.set(true);
    this.http.post<any>(`${this.env.apiBaseUrl}/images`, form).subscribe({
      next: (res) => {
        const img = res?.data ?? res;
        this.vendorSignatureImageId.set(img?.imageId ?? img?.id ?? null);
        this.vendorSignatureImageUrl.set(img?.url ?? null);
        this.vendorSaving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Gambar ter-upload. Klik Simpan untuk menyimpan.' });
      },
      error: (err) => {
        this.vendorSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Gagal upload', detail: err?.error?.message ?? 'Error.' });
      },
    });
  }

  protected saveVendorProfile() {
    if (!this.vendorId()) return;
    this.vendorSaving.set(true);
    this.http.patch<any>(`${this.env.apiBaseUrl}/vendors/${this.vendorId()}`, {
      namaPimpinan: this.vendorNamaPimpinan(),
      signatureImageId: this.vendorSignatureImageId(),
    }).subscribe({
      next: () => {
        this.vendorSaving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Profil vendor disimpan.' });
      },
      error: (err) => {
        this.vendorSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Gagal simpan', detail: err?.error?.message ?? 'Error.' });
      },
    });
  }

  protected removeVendorSignature() {
    this.vendorSignatureImageId.set(null);
    this.vendorSignatureImageUrl.set(null);
  }

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
