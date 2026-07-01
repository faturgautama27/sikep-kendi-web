import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { Location } from '@angular/common';
import { DaruratState } from './state/darurat.state';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';

import { PageHeaderComponent } from '@core/layout';
import { MessageService } from 'primeng/api';
import { DARURAT_DATA } from '@core/data-access/ports/darurat-data.port';
import { APP_ENV } from '@core/data-access/app-env.token';
import { LaporanDarurat } from '@shared/models';
import {
  VerifikasiDaruratFaseA,
  InputShsDarurat,
  VerifikasiVerifikatorDarurat,
  PptkApproveDarurat,
  UploadBuktiPembayaranDarurat,
  GetLaporanDaruratDetail,
} from './state/darurat.actions';
import { AuthState } from '@features/login/state/auth.state';

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
  protected readonly env = inject(APP_ENV);
  private readonly location = inject(Location);
  private readonly store = inject(Store);

  // Instead of signals, we will use an observable converted to signal, but for simplicity let's use dataPort to fetch the single item.
  // We can just use an observable with async pipe in HTML or a simple signal here.

  protected readonly laporan = this.store.selectSignal(DaruratState.detail);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly isDriver = computed(() => this.user()?.roles?.includes('pengemudi'));
  protected readonly isPB = computed(() => this.user()?.roles?.includes('pengurus_barang'));
  protected readonly isVerifikator = computed(() => this.user()?.roles?.includes('verifikator'));
  protected readonly isPPTK = computed(() => this.user()?.roles?.includes('pptk'));
  protected readonly isAdmin = computed(() => this.user()?.roles?.includes('admin_sistem'));
  protected readonly isKeuangan = computed(() => this.user()?.roles?.includes('bendahara'));

  private readonly msg = inject(MessageService);

  // Dialogs
  protected verifikasiDialogVisible = false;
  protected verifikasiType: 'FASE_A' | 'VERIFIKATOR' | 'PPTK' = 'FASE_A';
  protected verifikasiApproved = true;
  protected verifikasiAlasan = '';
  protected verifikasiKomentar = '';

  protected shsDialogVisible = false;

  protected pembayaranDialogVisible = false;
  protected pembayaranFileIds = signal<{ id: string; url: string }[]>([]);

  protected get isWaitingVerifikasiPB() {
    return this.laporan()?.status === 'MENUNGGU_VERIFIKASI_PB';
  }
  protected get isWaitingReimburse() {
    return (
      this.laporan()?.status === 'DISETUJUI_PB' || this.laporan()?.status === 'DITOLAK_VERIFIKATOR'
    );
  }
  protected get isWaitingSHS() {
    return this.laporan()?.status === 'REIMBURSEMENT_DIAJUKAN';
  }
  protected get isWaitingVerifikator() {
    return this.laporan()?.status === 'SHS_DIKERJAKAN';
  }
  protected get isWaitingPPTK() {
    return this.laporan()?.status === 'MENUNGGU_PPTK';
  }
  protected get isWaitingPembayaran() {
    return this.laporan()?.status === 'DISETUJUI_PPTK';
  }

  protected openVerifikasi(approved: boolean, type: 'FASE_A' | 'VERIFIKATOR' | 'PPTK') {
    this.verifikasiApproved = approved;
    this.verifikasiType = type;
    this.verifikasiAlasan = '';
    this.verifikasiKomentar = '';
    this.verifikasiDialogVisible = true;
  }

  protected submitVerifikasi() {
    const id = this.laporan()?.id;
    if (!id) return;
    let action;
    if (this.verifikasiType === 'FASE_A') {
      action = new VerifikasiDaruratFaseA(
        id,
        this.verifikasiApproved,
        this.verifikasiAlasan,
        this.verifikasiKomentar,
      );
    } else if (this.verifikasiType === 'VERIFIKATOR') {
      action = new VerifikasiVerifikatorDarurat(
        id,
        this.verifikasiApproved,
        this.verifikasiAlasan,
        this.verifikasiKomentar,
      );
    } else {
      action = new PptkApproveDarurat(
        id,
        this.verifikasiApproved,
        this.verifikasiAlasan,
        this.verifikasiKomentar,
      );
    }

    this.store.dispatch(action).subscribe(() => {
      this.verifikasiDialogVisible = false;
      this.msg.add({ severity: 'success', summary: 'Verifikasi Berhasil' });
    });
  }

  protected openSHS() {
    this.shsDialogVisible = true;
  }

  protected submitSHS() {
    const id = this.laporan()?.id;
    if (!id) return;
    const items: any[] = []; // In a real scenario, this would come from a form
    this.store.dispatch(new InputShsDarurat(id, items)).subscribe(() => {
      this.shsDialogVisible = false;
      this.msg.add({ severity: 'success', summary: 'SHS Berhasil Diinput' });
    });
  }

  protected openPembayaran() {
    this.pembayaranFileIds.set([]);
    this.pembayaranDialogVisible = true;
  }

  protected submitPembayaran() {
    const id = this.laporan()?.id;
    if (!id) return;
    this.store
      .dispatch(new UploadBuktiPembayaranDarurat(id, Number(this.pembayaranFileIds()[0]?.id)))
      .subscribe(() => {
        this.pembayaranDialogVisible = false;
        this.msg.add({ severity: 'success', summary: 'Bukti Pembayaran Diupload' });
      });
  }

  protected goBack(): void {
    this.location.back();
  }

  protected getStatusProps(status?: string): any {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI_PB':
        return { label: 'Menunggu Pengurus Barang', severity: 'warn' };
      case 'DISETUJUI_PB':
        return { label: 'Disetujui PB', severity: 'info' };
      case 'DITOLAK_PB':
        return { label: 'Ditolak PB', severity: 'danger' };
      case 'REIMBURSEMENT_DIAJUKAN':
        return { label: 'Reimbursement Diajukan', severity: 'info' };
      case 'SHS_DIKERJAKAN':
        return { label: 'SHS Dikerjakan', severity: 'info' };
      case 'MENUNGGU_PPTK':
        return { label: 'Menunggu PPTK', severity: 'warn' };
      case 'DITOLAK_VERIFIKATOR':
        return { label: 'Ditolak Verifikator', severity: 'danger' };
      case 'DISETUJUI_PPTK':
        return { label: 'Disetujui PPTK', severity: 'success' };
      case 'DITOLAK_PPTK':
        return { label: 'Ditolak PPTK', severity: 'danger' };
      case 'DIBAYAR':
        return { label: 'Dibayar', severity: 'success' };
      default:
        return { label: status ?? 'Unknown', severity: 'secondary' };
    }
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.dispatch(new GetLaporanDaruratDetail(id));
    }
  }
}
