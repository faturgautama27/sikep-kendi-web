import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
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
import { AdminDataPort } from '@core/data-access/ports/admin-data.port';
import type { User, RoleName } from '@shared/models';

// We will fetch role options from the server instead of hardcoding.

@Component({ selector: 'app-admin-users-list', standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, ChipModule, ConfirmDialogModule, DialogModule, InputTextModule, MultiSelectModule, SelectModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users-list.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class UsersListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly adminPort = inject(AdminDataPort);

  private readonly localUsers = signal<User[]>([]);

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  private loadRoles() {
    this.adminPort.getRoles().subscribe({
      next: (roles) => {
        // Exclude vendor from options so it cannot be selected manually.
        this.roleOpts.set(
          roles
            .filter(r => r.name !== 'vendor')
            .map(r => ({ label: r.description || this.formatRoleName(r.name), value: r.name }))
        );
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Gagal memuat daftar role' })
    });
  }

  private loadUsers() {
    this.adminPort.getUsers().subscribe({
      next: (users) => this.localUsers.set(users),
      error: () => this.msg.add({ severity: 'error', summary: 'Gagal memuat pengguna' })
    });
  }

  protected readonly searchQuery = signal('');
  protected readonly selectedRoles = signal<RoleName[]>([]);
  protected readonly selectedStatus = signal<boolean | null>(null);

  protected readonly users = computed<User[]>(() => {
    const list = this.localUsers();
    const q = this.searchQuery().trim().toLowerCase();
    const roles = this.selectedRoles();
    const status = this.selectedStatus();

    return list.filter((u) => {
      if (q) {
        const haystack = `${u.username} ${u.fullName} ${u.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (roles.length > 0 && !u.roles.some((r) => roles.includes(r))) return false;
      if (status !== null && u.isActive !== status) return false;
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

  protected readonly roleOpts = signal<{ label: string, value: string }[]>([]);
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
    const roles = raw.roles as string[];

    if (!this.editingId()) {
      this.adminPort.createUser({ username: raw.username!, fullName: raw.fullName!, email: raw.email!, roles }).subscribe({
        next: (newUser) => {
          this.localUsers.update(l => [newUser, ...l]);
          this.msg.add({ severity: 'success', summary: 'Pengguna berhasil dibuat.', detail: `Password sementara telah dikirim ke ${raw.email}` });
          this.dialogVisible.set(false);
        },
        error: (err) => {
          this.msg.add({ severity: 'error', summary: 'Gagal membuat pengguna', detail: err.error?.message || 'Email mungkin sudah digunakan' });
        }
      });
    } else {
      this.adminPort.updateUser(this.editingId()!, { roles }).subscribe({
        next: () => {
          this.localUsers.update(l => l.map(u => u.id === this.editingId() ? { ...u, fullName: raw.fullName!, email: raw.email!, roles: raw.roles as RoleName[] } : u));
          this.msg.add({ severity: 'success', summary: 'Data pengguna diperbarui.' });
          this.dialogVisible.set(false);
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Gagal memperbarui pengguna' })
      });
    }
  }

  protected resetPassword(u: User): void {
    this.confirm.confirm({
      message: `Password ${u.username} akan direset dan dikirim ke email mereka. Lanjutkan?`, header: 'Reset Password', icon: 'pi pi-key',
      acceptLabel: 'Reset', rejectLabel: 'Batal',
      accept: () => {
        this.adminPort.resetPassword(u.id).subscribe({
          next: () => this.msg.add({ severity: 'info', summary: 'Password direset.', detail: `Email terkirim ke ${u.email}` }),
          error: () => this.msg.add({ severity: 'error', summary: 'Gagal reset password' })
        });
      }
    });
  }

  protected toggleActive(u: User): void {
    if (u.id === this.currentUserId()) return;
    this.confirm.confirm({
      message: `Pengguna ${u.username} akan di${u.isActive ? 'nonaktifkan' : 'aktifkan'}. ${u.isActive ? 'Token aktif mereka akan dicabut.' : ''} Lanjutkan?`,
      header: 'Konfirmasi', icon: 'pi pi-user-minus', acceptLabel: u.isActive ? 'Nonaktifkan' : 'Aktifkan', rejectLabel: 'Batal',
      accept: () => {
        this.adminPort.updateUser(u.id, { isActive: !u.isActive }).subscribe({
          next: () => {
            this.localUsers.update(l => l.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
            this.msg.add({ severity: u.isActive ? 'warn' : 'success', summary: `Pengguna berhasil di${u.isActive ? 'nonaktifkan' : 'aktifkan'}.` });
          },
          error: () => this.msg.add({ severity: 'error', summary: 'Gagal memperbarui status' })
        });
      },
    });
  }

  protected formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  private formatRoleName(r: string): string {
    if (r === 'pptk') return 'PPTK';
    return r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, ' ');
  }

  protected roleLabel(r: RoleName): string {
    return this.roleOpts().find(o => o.value === r)?.label ?? this.formatRoleName(r);
  }
}
