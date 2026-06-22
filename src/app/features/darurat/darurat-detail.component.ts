import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';

import { PageHeaderComponent } from '@core/layout';
import { DARURAT_DATA } from '@core/data-access/ports/darurat-data.port';
import { LaporanDarurat } from '@shared/models';
import { VerifikasiDarurat, ApproveReimburseDarurat } from './state/darurat.actions';

@Component({
  selector: 'app-darurat-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    TagModule,
    DialogModule,
    TextareaModule,
    InputTextModule,
    ToastModule,
    FormsModule,
    PageHeaderComponent,
  ],
  templateUrl: './darurat-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataPort = inject(DARURAT_DATA);
  private readonly store = inject(Store);

  // Instead of signals, we will use an observable converted to signal, but for simplicity let's use dataPort to fetch the single item.
  // We can just use an observable with async pipe in HTML or a simple signal here.
  
  protected readonly laporan = toSignal(this.dataPort.detail(this.route.snapshot.paramMap.get('id')!));

  protected verifikasiDialogVisible = false;
  protected verifikasiApproved = true;
  protected verifikasiAlasan = '';

  protected approveDialogVisible = false;

  protected get isWaitingVerifikasi() {
    return this.laporan()?.status === 'MENUNGGU_VERIFIKASI';
  }

  protected get isWaitingApprove() {
    return this.laporan()?.status === 'TERVERIFIKASI';
  }

  protected openVerifikasi(approved: boolean) {
    this.verifikasiApproved = approved;
    this.verifikasiAlasan = '';
    this.verifikasiDialogVisible = true;
  }

  protected submitVerifikasi() {
    const id = this.laporan()?.id;
    if (!id) return;
    this.store.dispatch(new VerifikasiDarurat(id, this.verifikasiApproved, this.verifikasiAlasan)).subscribe(() => {
      this.verifikasiDialogVisible = false;
      // Optionally reload the data or let user go back
      window.location.reload(); 
    });
  }

  protected openApprove() {
    this.approveDialogVisible = true;
  }

  protected submitApprove() {
    const id = this.laporan()?.id;
    if (!id) return;
    this.store.dispatch(new ApproveReimburseDarurat(id)).subscribe(() => {
      this.approveDialogVisible = false;
      window.location.reload();
    });
  }

  protected getStatusProps(status?: string): any {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI':
        return { label: 'Menunggu Verifikasi', severity: 'warn' };
      case 'TERVERIFIKASI':
        return { label: 'Terverifikasi', severity: 'info' };
      case 'DITOLAK':
        return { label: 'Ditolak', severity: 'danger' };
      case 'REIMBURSE_APPROVED':
        return { label: 'Reimburse Approved', severity: 'success' };
      default:
        return { label: status ?? 'Unknown', severity: 'secondary' };
    }
  }

  ngOnInit() {}
}
