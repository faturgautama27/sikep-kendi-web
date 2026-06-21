import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { APP_ENV } from '@core/data-access/app-env.token';
import { Login } from '@features/login/state';
import { AuthState } from '@features/login/state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  protected readonly env = inject(APP_ENV);

  readonly username = signal('');
  readonly password = signal('');
  readonly remember = signal(false);
  readonly showPass = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly submitting = signal(false);

  protected readonly features = [
    { icon: 'pi pi-truck', label: 'Manajemen Armada Dinas' },
    { icon: 'pi pi-wrench', label: 'Pemeliharaan Terencana (PM/CM/PdM)' },
    { icon: 'pi pi-list-check', label: 'Draft Checklist & Verifikasi Work Order' },
    { icon: 'pi pi-receipt', label: 'Penawaran, SHS, dan Pembayaran' },
    { icon: 'pi pi-shield', label: 'Audit Trail & Compliance Report' },
  ];

  protected readonly demoAccounts = [
    { username: 'admin', label: 'Admin', icon: 'pi pi-cog' },
    { username: 'pengurus_barang', label: 'Pengurus Barang', icon: 'pi pi-box' },
    { username: 'verifikator', label: 'Verifikator', icon: 'pi pi-shield' },
    { username: 'bendahara', label: 'Bendahara', icon: 'pi pi-wallet' },
    { username: 'vendor', label: 'Vendor', icon: 'pi pi-building' },
    { username: 'pengemudi', label: 'Pengemudi', icon: 'pi pi-id-card' },
  ];

  protected onSubmit(): void {
    if (!this.username().trim() || !this.password().trim()) {
      this.errorMessage.set('Lengkapi nama pengguna dan kata sandi.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);

    const username = this.username().trim();
    const password = this.password().trim();
    this.store.dispatch(new Login(username, password)).subscribe({
      next: () => {
        this.submitting.set(false);
        const user = this.store.selectSnapshot(AuthState.user);
        if (!user) {
          this.errorMessage.set('Nama pengguna atau kata sandi tidak valid.');
          return;
        }
        const isDriver = user.roles.includes('pengemudi');
        this.router.navigate([isDriver ? '/driver' : '/dashboard']);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Terjadi kesalahan saat login. Coba lagi.');
      },
    });
  }

  protected useDemoAccount(username: string): void {
    this.username.set(username);
    this.password.set('demo1234');
    // Auto-submit after a brief delay so user sees the credentials
    setTimeout(() => this.onSubmit(), 300);
  }
}
