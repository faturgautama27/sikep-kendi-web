import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FixtureBootstrapService } from '@core/data-access/fixture-bootstrap.service';
import { AuthState } from '@features/login/state';
import type { User, RoleName } from '@shared/models';

const ROLE_OPTS = [
  { label: 'Pengemudi', value: 'pengemudi' },
  { label: 'Pengurus Barang', value: 'pengurus_barang' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'Verifikator', value: 'verifikator' },
  { label: 'Bendahara', value: 'bendahara' },
  { label: 'Admin Sistem', value: 'admin_sistem' },
];

@Component({ selector: 'app-admin-users-list', standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, ChipModule, ConfirmDialogModule, DialogModule, InputTextModule, MultiSelectModule, SelectModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users-list.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class UsersListComponent {
  private readonly store = inject(Store);
  private readonly fixtures = inject(FixtureBootstrapService);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  private readonly knownUsers = this.store.selectSignal(
    (state: { auth: { knownUsers: User[] } }) => state.auth.knownUsers,
  );
  private readonly localUsers = signal<User[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedRoles = signal<RoleName[]>([]);
  protected readonly selectedStatus = signal<boolean | null>(null);

  protected readonly users = computed<User[]>(() => {
    let list: User[];
    const local = this.localUsers();
    if (local.length > 0) {
      list = local;
    } else {
      const fromState = this.knownUsers();
      if (fromState.length > 0) {
        this.localUsers.set(fromState);
        list = fromState;
      } else {
        const snap = this.fixtures.snapshot.users as User[];
        this.localUsers.set(snap);
        list = snap;
      }
    }

    const q = this.searchQuery().trim().toLowerCase();
    const roles = this.selectedRoles();
    const status = this.selectedStatus();

    return list.filter((u) => {
      if (q) {
        const haystack = `${u.username} ${u.fullName} ${u.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (roles.length > 0 && !u.roles.some((r) => roles.includes(r))) return false;
      if (status !== null && u.active !== status) return false;
      return true;
    });
  });

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedRoles.set([]);
    this.selectedStatus.set(null);
  }

  protected readonly statusOpts = [
    { label: 'Semua Status', value: null },
    { label: 'Aktif', value: true },
    { label: 'Nonaktif', value: false },
  ];

  protected readonly roleOpts = ROLE_OPTS;
  protected readonly dialogVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly currentUserId = computed(() => {
    const auth = this.store.selectSnapshot((s: { auth: { currentUser: User | null } }) => s.auth.currentUser);
    return auth?.id ?? '';
  });

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    roles: [[] as RoleName[], Validators.required],
  });

  protected openAdd(): void {
    this.editingId.set(null); this.form.reset({ roles: [] });
    this.form.get('username')!.enable(); this.dialogVisible.set(true);
  }

  protected openEdit(u: User): void {
    this.editingId.set(u.id);
    this.form.patchValue({ fullName: u.fullName, username: u.username, email: u.email, roles: u.roles });
    this.form.get('username')!.disable(); this.dialogVisible.set(true);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (!this.editingId()) {
      const newUser: User = { id: `u-${Date.now()}`, username: raw.username!, fullName: raw.fullName!, email: raw.email!, contact: null, unitKerja: '', roles: raw.roles as RoleName[], permissions: [], active: true, forceChangePassword: true, lastLoginAt: null, createdAt: new Date().toISOString() };
      this.localUsers.update(l => [newUser, ...l]);
      this.msg.add({ severity: 'success', summary: 'Pengguna berhasil dibuat.', detail: `Password sementara telah dikirim ke ${raw.email}` });
    } else {
      this.localUsers.update(l => l.map(u => u.id === this.editingId() ? { ...u, fullName: raw.fullName!, email: raw.email!, roles: raw.roles as RoleName[] } : u));
      this.msg.add({ severity: 'success', summary: 'Data pengguna diperbarui.' });
    }
    this.dialogVisible.set(false);
  }

  protected resetPassword(u: User): void {
    this.confirm.confirm({
      message: `Password ${u.username} akan direset dan dikirim ke email mereka. Lanjutkan?`, header: 'Reset Password', icon: 'pi pi-key',
      acceptLabel: 'Reset', rejectLabel: 'Batal',
      accept: () => this.msg.add({ severity: 'info', summary: 'Password direset.', detail: `Email terkirim ke ${u.email}` }),
    });
  }

  protected toggleActive(u: User): void {
    if (u.id === this.currentUserId()) return;
    this.confirm.confirm({
      message: `Pengguna ${u.username} akan di${u.active ? 'nonaktifkan' : 'aktifkan'}. ${u.active ? 'Token aktif mereka akan dicabut.' : ''} Lanjutkan?`,
      header: 'Konfirmasi', icon: 'pi pi-user-minus', acceptLabel: u.active ? 'Nonaktifkan' : 'Aktifkan', rejectLabel: 'Batal',
      accept: () => {
        this.localUsers.update(l => l.map(x => x.id === u.id ? { ...x, active: !x.active } : x));
        this.msg.add({ severity: u.active ? 'warn' : 'success', summary: `Pengguna berhasil di${u.active ? 'nonaktifkan' : 'aktifkan'}.` });
      },
    });
  }

  protected formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  protected roleLabel(r: RoleName): string {
    return ROLE_OPTS.find(o => o.value === r)?.label ?? r;
  }
}
