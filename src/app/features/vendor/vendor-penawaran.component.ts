import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';

import { DraftChecklistState } from '@features/draft-checklist/state';
import { CreatePenawaran, PenawaranState, RequestRevisiPenawaran, SubmitPenawaran, SubmitRevisiPenawaran } from '@features/penawaran/state';
import type { PenawaranRecord } from '@features/penawaran/state';

type PenawaranStatus = 'DRAFT' | 'DIKIRIM' | 'DIVERIFIKASI' | 'REVISI';

@Component({
  selector: 'app-vendor-penawaran', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DatePickerModule, ConfirmDialogModule, InputNumberModule, TextareaModule, InputTextModule, TableModule, TagModule, ToastModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-penawaran.component.html', changeDetection: ChangeDetectionStrategy.OnPush
})
export class VendorPenawaranComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly today = new Date();

  // Approved draft items (read-only reference)
  private readonly allDrafts = this.store.selectSignal(DraftChecklistState.list);
  protected readonly approvedItems = computed(() =>
    this.allDrafts().find(d => d.workOrderId === this.workOrderId && d.status === 'DISETUJUI')?.items ?? []
  );
  protected readonly draftTotalHarga = computed(() =>
    this.approvedItems().reduce((s, i) => s + i.hargaItem, 0)
  );

  // Penawaran history
  private readonly allPenawaran = this.store.selectSignal(PenawaranState.list);
  protected readonly penawaranList = computed<PenawaranRecord[]>(() =>
    this.allPenawaran().filter(p => p.workOrderId === this.workOrderId).sort((a, b) => b.versi - a.versi)
  );
  protected readonly activePenawaran = computed<PenawaranRecord | null>(() => this.penawaranList()[0] ?? null);
  protected readonly canEdit = computed(() => {
    const p = this.activePenawaran();
    return !p || p.status === 'DRAFT' || p.status === 'REVISI';
  });

  protected readonly form = this.fb.group({
    totalBiaya: [0, [Validators.required, Validators.min(1)]],
    catatanPerubahan: [''],
    nomorInvoice: ['', Validators.required],
    tanggalInvoice: [null as Date | null, Validators.required],
  });

  private totalBiayaChanged = signal(false);

  constructor() {
    const p = this.activePenawaran();
    if (p && (p.status === 'DRAFT' || p.status === 'REVISI')) {
      this.form.patchValue({ totalBiaya: p.totalBiaya, nomorInvoice: p.nomorInvoice ?? '' });
    } else {
      this.form.patchValue({ totalBiaya: this.draftTotalHarga() });
    }
    this.form.get('totalBiaya')!.valueChanges.subscribe(v => {
      this.totalBiayaChanged.set(Number(v) !== this.draftTotalHarga());
      if (this.totalBiayaChanged()) {
        this.form.get('catatanPerubahan')!.addValidators(Validators.required);
      } else {
        this.form.get('catatanPerubahan')!.clearValidators();
      }
      this.form.get('catatanPerubahan')!.updateValueAndValidity();
    });
  }

  protected readonly needsCatatan = this.totalBiayaChanged;

  protected kirimPenawaran(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.msg.add({ severity: 'warn', summary: 'Lengkapi semua field yang wajib.' }); return; }
    const raw = this.form.getRawValue();
    this.confirm.confirm({
      message: 'Penawaran akan dikirim ke Verifikator. Pastikan seluruh data sudah benar. Lanjutkan?',
      header: 'Kirim Penawaran', icon: 'pi pi-send', acceptLabel: 'Kirim', rejectLabel: 'Batal',
      accept: () => {
        const p = this.activePenawaran();
        const payload = { totalBiaya: raw.totalBiaya!, catatanPerubahan: raw.catatanPerubahan ?? undefined, nomorInvoice: raw.nomorInvoice!, tanggalInvoice: raw.tanggalInvoice?.toISOString() };
        if (!p || p.status === 'DRAFT') {
          this.store.dispatch(new CreatePenawaran(this.workOrderId, payload));
          setTimeout(() => {
            const latest = this.activePenawaran();
            if (latest) this.store.dispatch(new SubmitPenawaran(latest.id));
          }, 50);
        } else {
          this.store.dispatch(new SubmitRevisiPenawaran(p.id, payload));
        }
        this.msg.add({ severity: 'success', summary: 'Penawaran terkirim ke Verifikator.' });
      },
    });
  }

  protected statusSeverity(s: PenawaranStatus): 'secondary' | 'info' | 'success' | 'warn' {
    const m: Record<PenawaranStatus, 'secondary' | 'info' | 'success' | 'warn'> = { DRAFT: 'secondary', DIKIRIM: 'info', DIVERIFIKASI: 'success', REVISI: 'warn' };
    return m[s];
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }
}
