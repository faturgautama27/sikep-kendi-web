import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AdminDataPort } from '@core/data-access/ports/admin-data.port';
import type { VendorAdmin } from '@shared/models';

@Component({ selector: 'app-vendor-management', standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-management.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly adminPort = inject(AdminDataPort);
  
  protected readonly vendors = signal<VendorAdmin[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly selectedStatus = signal<boolean | null>(null);

  ngOnInit() {
    this.loadVendors();
  }

  private loadVendors() {
    this.adminPort.getVendors().subscribe({
      next: (vendors) => this.vendors.set(vendors),
      error: () => this.msg.add({ severity: 'error', summary: 'Gagal memuat vendor' })
    });
  }

  protected readonly filteredVendors = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.vendors().filter((v) => {
      if (q) {
        const haystack = `${v.namaVendor} ${v.email} ${v.kontak}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status !== null && v.isAktif !== status) return false;
      return true;
    });
  });

  protected readonly statusOpts = [
    { label: 'Semua Status', value: null },
    { label: 'Aktif', value: true },
    { label: 'Nonaktif', value: false },
  ];

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedStatus.set(null);
  }

  protected readonly dialogVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly emailConflict = signal(false);
  protected readonly form = this.fb.group({
    namaVendor:   ['', [Validators.required, Validators.maxLength(100)]],
    alamat:       ['', Validators.required],
    kontak:       ['', Validators.required],
    email:        ['', [Validators.required, Validators.email]],
    username:     ['', Validators.required],
    npwp:         [''],
    namaPimpinan: [''],
    isAktif:      [true],
  });
  protected readonly activeCount = computed(() => this.vendors().filter(v => v.isAktif).length);

  protected openAdd(): void {
    this.editingId.set(null); this.emailConflict.set(false);
    this.form.reset({ isAktif: true });
    this.form.get('username')!.setValidators(Validators.required);
    this.form.get('username')!.updateValueAndValidity();
    this.dialogVisible.set(true);
  }
  protected openEdit(v: VendorAdmin): void {
    this.editingId.set(v.id); this.emailConflict.set(false);
    this.form.patchValue(v);
    // Username hanya relevan saat tambah — field disembunyikan di mode edit.
    this.form.get('username')!.clearValidators();
    this.form.get('username')!.setValue('');
    this.form.get('username')!.updateValueAndValidity();
    this.dialogVisible.set(true);
  }
  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.add({ severity: 'warn', summary: 'Form belum lengkap', detail: 'Periksa kembali field yang bertanda merah.' });
      return;
    }
    const raw = this.form.getRawValue();
    this.emailConflict.set(false);

    if (!this.editingId()) {
      this.adminPort.createVendor({
        namaVendor: raw.namaVendor!, alamat: raw.alamat!, kontak: raw.kontak!, email: raw.email!,
        username: raw.username || raw.email!.split('@')[0],
        npwp: raw.npwp || null, namaPimpinan: raw.namaPimpinan || null,
      }).subscribe({
        next: (newVendor) => {
          this.vendors.update(l => [newVendor, ...l]);
          this.msg.add({ severity: 'success', summary: 'Vendor berhasil ditambahkan.' });
          this.dialogVisible.set(false);
        },
        error: (err) => {
          if (err.status === 409) this.emailConflict.set(true);
          else this.msg.add({ severity: 'error', summary: 'Gagal menambah vendor' });
        }
      });
    } else {
      this.adminPort.updateVendor(this.editingId()!, {
        namaVendor: raw.namaVendor!, alamat: raw.alamat!, kontak: raw.kontak!, email: raw.email!, isAktif: raw.isAktif ?? true,
        npwp: raw.npwp || null, namaPimpinan: raw.namaPimpinan || null,
      }).subscribe({
        next: (updated) => {
          this.vendors.update(l => l.map(v => v.id === this.editingId() ? updated : v));
          this.msg.add({ severity: 'success', summary: 'Data vendor diperbarui.' });
          this.dialogVisible.set(false);
        },
        error: (err) => {
          if (err.status === 409) this.emailConflict.set(true);
          else this.msg.add({ severity: 'error', summary: 'Gagal memperbarui vendor' });
        }
      });
    }
  }
  protected toggleAktif(v: VendorAdmin): void {
    const aksi = v.isAktif ? 'nonaktifkan' : 'aktifkan';
    this.confirm.confirm({
      message: `Vendor "${v.namaVendor}" akan di-${aksi}. Lanjutkan?`, header: 'Konfirmasi', icon: 'pi pi-question-circle',
      acceptLabel: v.isAktif ? 'Nonaktifkan' : 'Aktifkan', rejectLabel: 'Batal',
      accept: () => {
        this.adminPort.updateVendor(v.id, { isAktif: !v.isAktif }).subscribe({
          next: (updated) => {
            this.vendors.update(l => l.map(x => x.id === v.id ? updated : x));
            this.msg.add({ severity: v.isAktif ? 'warn' : 'success', summary: `Vendor berhasil di-${aksi}.` });
          },
          error: () => this.msg.add({ severity: 'error', summary: 'Gagal mengubah status vendor' })
        });
      },
    });
  }

  protected deleteVendor(v: VendorAdmin): void {
    this.confirm.confirm({
      message: `Vendor "${v.namaVendor}" akan dihapus permanen. Lanjutkan?`,
      header: 'Hapus Vendor', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.adminPort.deleteVendor(v.id).subscribe({
          next: () => {
            this.vendors.update(l => l.filter(x => x.id !== v.id));
            this.msg.add({ severity: 'success', summary: 'Vendor berhasil dihapus.' });
          },
          error: (err) => this.msg.add({
            severity: 'error',
            summary: 'Gagal menghapus vendor',
            detail: err?.error?.message ?? 'Terjadi kesalahan.'
          })
        });
      },
    });
  }
}
