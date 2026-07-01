import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';

import { WorkOrdersState, GetWorkOrderDetail, ApprovePPTK, RejectPPTK } from './state';
import { DraftChecklistState, ApproveDraft, RejectDraft } from '@features/draft-checklist/state';
import { AuthState } from '@features/login/state/auth.state';
import type { WorkOrderProgressStatus, WorkOrderStatus, WorkOrderEvidence } from '@shared/models';
import { APP_ENV } from '@core/data-access/app-env.token';

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  DIBUAT: 'Dibuat',
  VENDOR_DITUGASKAN: 'Vendor Ditugaskan',
  DRAFT_CHECKLIST: 'Draft Checklist',
  PENAWARAN: 'Penawaran',
  DIVERIFIKASI: 'Diverifikasi',
  MENUNGGU_PPTK: 'Menunggu PPTK',
  DISETUJUI_PPTK: 'Disetujui PPTK',
  DIBAYAR: 'Dibayar',
};

const PROGRESS_LABEL: Record<WorkOrderProgressStatus, string> = {
  received: 'Kendaraan Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Pekerjaan Selesai',
};

const EVIDENCE_LABEL: Record<string, string> = {
  kondisi_awal: 'Kondisi Awal',
  sparepart_sebelum: 'Sparepart Sebelum',
  sparepart_sesudah: 'Sparepart Sesudah',
  pasca_perbaikan: 'Pasca Perbaikan',
};

function evidencePlaceholder(kategori: string): string {
  switch (kategori) {
    case 'kondisi_awal':
      return 'https://picsum.photos/seed/k1/400/300';
    case 'sparepart_sebelum':
      return 'https://picsum.photos/seed/s1/400/300';
    case 'sparepart_sesudah':
      return 'https://picsum.photos/seed/s2/400/300';
    case 'pasca_perbaikan':
      return 'https://picsum.photos/seed/p1/400/300';
    default:
      return 'https://picsum.photos/seed/d1/400/300';
  }
}

@Component({
  selector: 'app-work-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    ImageModule,
    InputTextModule,
    TableModule,
    TagModule,
    TimelineModule,
  ],
  templateUrl: './work-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly detail = this.store.selectSignal(WorkOrdersState.detail);
  private readonly draftList = this.store.selectSignal(DraftChecklistState.list);
  protected readonly permissions = this.store.selectSignal(AuthState.permissions);

  protected catatan = '';

  protected readonly drafts = computed(() =>
    this.draftList().filter((d) => String(d.workOrderId) === String(this.id))
  );
  
  protected readonly latestDraft = computed(() => {
    const list = this.drafts();
    if (!list.length) return null;
    return list.sort((a, b) => b.versi - a.versi)[0];
  });

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly isPPTK = computed(() => this.user()?.roles?.includes('pptk'));
  protected readonly isAdmin = computed(() => this.user()?.roles?.includes('admin_sistem'));

  ngOnInit() {
    this.store.dispatch(new GetWorkOrderDetail(this.id)); 

    console.log("permissions =>", this.permissions().includes('draft_checklist.read'));
    
    // // Hanya load draft checklist jika memiliki permission (untuk mencegah 403 Forbidden Error)
    // if (this.permissions().includes('draft_checklist.read')) {
    //   this.store.dispatch(new LoadDraftChecklist(this.id));
    // }
  }

  protected goBack() {
    this.router.navigate(['/work-orders']);
  }

  protected statusLabel(status: WorkOrderStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected statusSeverity(status: WorkOrderStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'DIBUAT':
      case 'VENDOR_DITUGASKAN':
        return 'info';
      case 'DRAFT_CHECKLIST':
      case 'PENAWARAN':
      case 'DIVERIFIKASI':
      case 'MENUNGGU_PPTK':
        return 'warn';
      case 'DIBAYAR':
      case 'DISETUJUI_PPTK':
        return 'success';
      default:
        return 'secondary';
    }
  }

  protected progressLabel(status: WorkOrderProgressStatus): string {
    return PROGRESS_LABEL[status] ?? status;
  }

  protected progressIcon(status: WorkOrderProgressStatus): string {
    switch (status) {
      case 'received': return 'pi pi-inbox';
      case 'in_progress': return 'pi pi-wrench';
      case 'completed': return 'pi pi-check';
      default: return 'pi pi-clock';
    }
  }

  protected evidenceUrl(ev: WorkOrderEvidence): string {
    if (ev.image?.url) {
      return ev.image.url;
    }
    return evidencePlaceholder(ev.kategori);
  }

  protected evidenceLabel(ev: WorkOrderEvidence): string {
    const base = EVIDENCE_LABEL[ev.kategori] ?? ev.kategori;
    return ev.image?.caption ? `${base} - ${ev.image.caption}` : base;
  }

  protected formatDateTime(val: string): string {
    if (!val) return '-';
    return new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  protected formatRupiah(n: number | string): string {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(val || 0);
  }

  protected approve() {
    const draft = this.latestDraft();
    if (!draft) return;
    this.store.dispatch(new ApproveDraft(draft.id)).subscribe(() => {
      this.store.dispatch(new GetWorkOrderDetail(this.id));
    });
    this.catatan = '';
  }

  protected reject() {
    const draft = this.latestDraft();
    if (!draft) return;
    this.store.dispatch(new RejectDraft(draft.id, this.catatan || 'Perlu koreksi item dan harga.')).subscribe(() => {
      this.store.dispatch(new GetWorkOrderDetail(this.id));
    });
    this.catatan = '';
  }

  protected approvePenawaran() {
    const pnw = this.detail()?.penawaranDetail;
    if (!pnw) return;
    this.http.post(`${this.env.apiBaseUrl}/work-orders/${this.id}/penawaran/${pnw.id}/approve-pb`, {}).subscribe({
      next: () => this.store.dispatch(new GetWorkOrderDetail(this.id))
    });
  }

  protected requestRevisiPenawaran() {
    const pnw = this.detail()?.penawaranDetail;
    if (!pnw) return;
    this.http.post(`${this.env.apiBaseUrl}/work-orders/${this.id}/penawaran/${pnw.id}/request-revisi-pb`, {
      catatanRevisi: this.catatan || 'Silakan revisi penawaran Anda.'
    }).subscribe({
      next: () => {
        this.store.dispatch(new GetWorkOrderDetail(this.id));
        this.catatan = '';
      }
    });
  }

  protected approvePPTK() {
    this.store.dispatch(new ApprovePPTK(this.id)).subscribe(() => {
      this.catatan = '';
    });
  }

  protected rejectPPTK() {
    this.store.dispatch(new RejectPPTK(this.id, this.catatan || 'Ditolak PPTK.')).subscribe(() => {
      this.catatan = '';
    });
  }
}

