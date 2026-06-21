import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { FixtureBootstrapService } from '@core/data-access/fixture-bootstrap.service';
import { AuthState } from '@features/login/state';
import type { User } from '@shared/models';

/**
 * Halaman daftar Users untuk admin.
 *
 * Sumber data:
 * 1. `AuthState.knownUsers` (di-hydrate dari fixture saat boot Preview Mode).
 * 2. Fallback `FixtureBootstrapService.snapshot.users` bila state belum
 *    ter-hydrate (mis. dibuka langsung tanpa login).
 *
 * Phase 1: tombol Edit dan Disable hanya menampilkan toast info.
 */
@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [ButtonModule, ChipModule, TableModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './users-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  private readonly store = inject(Store);
  private readonly fixtures = inject(FixtureBootstrapService);
  private readonly messageService = inject(MessageService);

  private readonly knownUsers = this.store.selectSignal(
    (state: { auth: { knownUsers: User[] } }) => state.auth.knownUsers,
  );

  /** Daftar user, fallback ke fixture snapshot bila state kosong. */
  protected readonly users = computed<User[]>(() => {
    const fromState = this.knownUsers();
    if (fromState.length > 0) {
      return fromState;
    }
    return this.fixtures.snapshot.users as User[];
  });

  protected onEdit(user: User): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Edit User',
      detail: `Form edit untuk ${user.username} akan tersedia di tahap berikutnya.`,
      life: 3500,
    });
  }

  protected onDisable(user: User): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Disable User',
      detail: `Aksi disable untuk ${user.username} tidak diaktifkan di Preview Mode.`,
      life: 3500,
    });
  }

  protected formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
