import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import type { VendorAdmin } from '@shared/models';

const INITIAL: VendorAdmin[] = [
  { id: 'ven-001', namaVendor: 'PT Bengkel Mandiri Sejahtera', alamat: 'Jl. Soekarno-Hatta No. 145', kontak: '0228888888', email: 'vendor1@bengkelmandiri.co.id', isAktif: true },
  { id: 'ven-002', namaVendor: 'CV Astra Motor Service', alamat: 'Jl. Asia Afrika No. 88', kontak: '0227777777', email: 'service@astramotor.id', isAktif: true },
  { id: 'ven-003', namaVendor: 'Bengkel Sumber Rejeki Motor', alamat: 'Jl. Merdeka No. 10', kontak: '0226666666', email: 'rejeki@bengkel.id', isAktif: false },
];

@Component({ selector: 'app-vendor-management', standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-management.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  protected readonly vendors = signal<VendorAdmin[]>(INITIAL);
  protected readonly searchQuery = signal('');
  protected readonly selectedStatus = signal<boolean | null>(null);

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
    namaVendor: ['', [Validators.required, Validators.maxLength(100)]],
    alamat: ['', Validators.required],
    kontak: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    isAktif: [true],
  });
  protected readonly activeCount = computed(() => this.vendors().filter(v => v.isAktif).length);

  protected openAdd(): void {
    this.editingId.set(null); this.emailConflict.set(false);
    this.form.reset({ isAktif: true }); this.dialogVisible.set(true);
  }
  protected openEdit(v: VendorAdmin): void {
    this.editingId.set(v.id); this.emailConflict.set(false);
    this.form.patchValue(v); this.dialogVisible.set(true);
  }
  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (!this.editingId()) {
      if (this.vendors().some(v => v.email === raw.email)) { this.emailConflict.set(true); return; }
      this.vendors.update(l => [{ id: `ven-${Date.now()}`, namaVendor: raw.namaVendor!, alamat: raw.alamat!, kontak: raw.kontak!, email: raw.email!, isAktif: raw.isAktif ?? true }, ...l]);
      this.msg.add({ severity: 'success', summary: 'Vendor berhasil ditambahkan.' });
    } else {
      this.vendors.update(l => l.map(v => v.id === this.editingId() ? { ...v, namaVendor: raw.namaVendor!, alamat: raw.alamat!, kontak: raw.kontak!, email: raw.email!, isAktif: raw.isAktif ?? true } : v));
      this.msg.add({ severity: 'success', summary: 'Data vendor diperbarui.' });
    }
    this.dialogVisible.set(false);
  }
  protected toggleAktif(v: VendorAdmin): void {
    const aksi = v.isAktif ? 'nonaktifkan' : 'aktifkan';
    this.confirm.confirm({
      message: `Vendor "${v.namaVendor}" akan di-${aksi}. Lanjutkan?`, header: 'Konfirmasi', icon: 'pi pi-question-circle',
      acceptLabel: v.isAktif ? 'Nonaktifkan' : 'Aktifkan', rejectLabel: 'Batal',
      accept: () => {
        this.vendors.update(l => l.map(x => x.id === v.id ? { ...x, isAktif: !x.isAktif } : x));
        this.msg.add({ severity: v.isAktif ? 'warn' : 'success', summary: `Vendor berhasil di-${aksi}.` });
      },
    });
  }
}
