import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { Location } from '@angular/common';

import { PENGAJUAN_DATA, type PengajuanDataPort } from '@core/data-access/ports/pengajuan-data.port';
import { AdminDataPort } from '@core/data-access/ports/admin-data.port';
import { APP_ENV } from '@core/data-access/app-env.token';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import { PengajuanState } from './state/pengajuan.state';
import { ApprovePengajuan, RejectPengajuan } from './state/pengajuan.actions';
import type { Pengajuan, PengajuanStatus } from '@shared/models';
import { CommonModule } from '@angular/common';

const STATUS_LABEL: Record<PengajuanStatus, string> = {
  draft: 'Draft',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  terverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
  work_order_terbuat: 'Work Order Terbuat',
};

// Removed dummy vendors

@Component({
  selector: 'app-pengajuan-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    TextareaModule,
    SelectModule,
    TagModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './pengajuan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly msg = inject(MessageService);
  private readonly dataPort = inject<PengajuanDataPort>(PENGAJUAN_DATA);
  private readonly adminDataPort = inject(AdminDataPort);
  protected readonly env = inject(APP_ENV);
  private readonly location = inject(Location);

  protected readonly pengajuanId = signal<string>('');
  protected readonly pengajuan = signal<Pengajuan | null>(null);
  protected readonly vendorOpts = signal<{ label: string; value: string | number }[]>([]);

  protected readonly approveDialogVisible = signal(false);
  protected readonly rejectDialogVisible = signal(false);
  protected readonly processing = signal(false);

  protected readonly approveForm = this.fb.group({
    vendorId: ['', Validators.required],
    komentarVerifikasi: [''],
  });

  protected readonly rejectForm = this.fb.group({
    alasanPenolakan: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    ],
  });

  protected readonly isMenunggu = computed(
    () => this.pengajuan()?.status === 'menunggu_verifikasi',
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.pengajuanId.set(id);
    this.dataPort.getById(id).subscribe({
      next: (res) => {
        this.pengajuan.set(res);
        // Fetch vendors only if status is menunggu_verifikasi
        if (res.status === 'menunggu_verifikasi') {
          this.adminDataPort.getVendors().subscribe({
            next: (vendors) => {
              this.vendorOpts.set(
                vendors
                  .filter((v) => v.isAktif !== false)
                  .map((v) => ({ label: v.namaVendor, value: v.id }))
              );
            },
            error: (err) => console.error('Gagal mengambil daftar vendor', err),
          });
        }
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Pengajuan tidak ditemukan.' })
    });
  }

  protected statusSeverity(s: PengajuanStatus): 'warn' | 'success' | 'danger' | 'secondary' | 'info' {
    const m: Record<PengajuanStatus, 'warn' | 'success' | 'danger' | 'secondary' | 'info'> = {
      draft: 'secondary',
      menunggu_verifikasi: 'warn',
      terverifikasi: 'success',
      ditolak: 'danger',
      work_order_terbuat: 'info',
    };
    return m[s];
  }

  protected statusLabel(s: PengajuanStatus): string {
    return STATUS_LABEL[s];
  }

  // Approve flow
  protected openApproveDialog(): void {
    this.approveForm.reset();
    this.approveDialogVisible.set(true);
  }

  protected submitApprove(): void {
    this.approveForm.markAllAsTouched();
    if (this.approveForm.invalid) return;
    this.processing.set(true);
    const { vendorId, komentarVerifikasi } = this.approveForm.getRawValue();
    this.store.dispatch(new ApprovePengajuan(this.pengajuanId(), vendorId!, komentarVerifikasi ?? undefined))
      .subscribe(() => {
        this.processing.set(false);
        this.approveDialogVisible.set(false);
        this.msg.add({ severity: 'success', summary: 'Pengajuan disetujui', detail: 'Work Order telah dibuat dan vendor diberitahu.' });
        // Re-load pengajuan from state
        const updated = this.store.selectSnapshot(PengajuanState.list).find((p) => p.id === this.pengajuanId());
        if (updated) this.pengajuan.set({ ...updated });
      });
  }

  // Reject flow
  protected openRejectDialog(): void {
    this.rejectForm.reset();
    this.rejectDialogVisible.set(true);
  }

  protected submitReject(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid) return;
    this.processing.set(true);
    const { alasanPenolakan } = this.rejectForm.getRawValue();
    this.store.dispatch(new RejectPengajuan(this.pengajuanId(), alasanPenolakan!))
      .subscribe(() => {
        this.processing.set(false);
        this.rejectDialogVisible.set(false);
        this.msg.add({ severity: 'warn', summary: 'Pengajuan ditolak', detail: 'Pengemudi akan diberitahu.' });
        const updated = this.store.selectSnapshot(PengajuanState.list).find((p) => p.id === this.pengajuanId());
        if (updated) this.pengajuan.set({ ...updated });
      });
  }

  protected rejectCharCount(): number {
    return (this.rejectForm.get('alasanPenolakan')!.value ?? '').length;
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  protected goBack(): void {
    this.location.back();
  }
}
