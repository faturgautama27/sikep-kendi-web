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
import { catchError, forkJoin, of } from 'rxjs';
import { DaruratState } from './state/darurat.state';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';

import { PageHeaderComponent } from '@core/layout';
import { MessageService } from 'primeng/api';
import { DARURAT_DATA } from '@core/data-access/ports/darurat-data.port';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
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
import { ShsMasterState, LoadShsMaster } from '@features/shs-master/state';
import { ShsMaster } from '@shared/models/shs-master';

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
    InputNumberModule,
    ToastModule,
    FileUploadModule,
    TableModule,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
  ],
  templateUrl: './darurat-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataPort = inject(DARURAT_DATA);
  private readonly imageData = inject(IMAGE_DATA);
  protected readonly env = inject(APP_ENV);
  private readonly location = inject(Location);
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  protected readonly laporan = this.store.selectSignal(DaruratState.detail);
  protected readonly shsMasterList = this.store.selectSignal(ShsMasterState.list);
  protected readonly statusTimeline = computed(() => this.laporan()?.statusTimeline || []);

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
  protected shsItems = signal<Array<{
    shsMasterId?: number;
    namaItem: string;
    jumlah: number;
    hargaSatuan: number;
    keterangan?: string;
  }>>([]);
  protected shsSubmitting = signal(false);

  protected pembayaranDialogVisible = false;
  protected pembayaranFileIds = signal<{ id: string; url: string }[]>([]);
  protected pembayaranUploading = signal(false);

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
    this.shsItems.set([]);
    this.shsDialogVisible = true;
  }

  protected addShsItem() {
    const currentItems = this.shsItems();
    this.shsItems.set([
      ...currentItems,
      {
        namaItem: '',
        jumlah: 1,
        hargaSatuan: 0,
      },
    ]);
  }

  protected removeShsItem(index: number) {
    const currentItems = this.shsItems();
    this.shsItems.set(currentItems.filter((_, i) => i !== index));
  }

  protected onShsNameChange(idx: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateShsItem(idx, 'namaItem', value);
  }

  protected onShsQuantityChange(idx: number, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.updateShsItem(idx, 'jumlah', value);
  }

  protected onShsPriceChange(idx: number, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.updateShsItem(idx, 'hargaSatuan', value);
  }

  protected onShsKeteranganChange(idx: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateShsItem(idx, 'keterangan', value);
  }

  protected selectShsMasterFromEvent(event: Event, index: number) {
    const value = parseInt((event.target as HTMLSelectElement).value);
    const master = this.shsMasterList().find(s => s.id === value);
    if (master) {
      this.selectShsMaster(master, index);
    }
  }

  protected selectShsMaster(item: ShsMaster, index: number) {
    const currentItems = [...this.shsItems()];
    currentItems[index] = {
      ...currentItems[index],
      shsMasterId: item.id,
      namaItem: item.namaItem,
      hargaSatuan: Number(item.hargaMaksimum), // ensure it's a number
    };
    this.shsItems.set(currentItems);
  }

  protected updateShsItem(index: number, key: string, value: any) {
    const currentItems = [...this.shsItems()];
    // Ensure numeric fields are actually numbers
    if ((key === 'jumlah' || key === 'hargaSatuan') && typeof value === 'string') {
      value = parseInt(value, 10);
    }
    currentItems[index] = { ...currentItems[index], [key]: value };
    this.shsItems.set(currentItems);
  }

  protected submitSHS() {
    const id = this.laporan()?.id;
    if (!id) return;
    
    const items = this.shsItems();
    if (items.length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Tambah minimal 1 item SHS' });
      return;
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.namaItem || item.jumlah < 1 || item.hargaSatuan < 1) {
        this.msg.add({ 
          severity: 'error', 
          summary: 'Validasi', 
          detail: 'Semua item harus memiliki nama, jumlah, dan harga' 
        });
        return;
      }
    }

    this.shsSubmitting.set(true);
    this.store.dispatch(new InputShsDarurat(id, items)).subscribe({
      next: () => {
        this.shsSubmitting.set(false);
        this.shsDialogVisible = false;
        this.msg.add({ severity: 'success', summary: 'SHS Berhasil Diinput' });
      },
      error: () => {
        this.shsSubmitting.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan SHS' });
      },
    });
  }

  protected openPembayaran() {
    this.pembayaranFileIds.set([]);
    this.pembayaranDialogVisible = true;
  }

  protected onUploadBukti(event: { files: File[] }, uploader: any) {
    const files: File[] = event.files;
    if (!files.length) return;
    this.pembayaranUploading.set(true);
    forkJoin(files.map(f => this.imageData.upload(f))).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload bukti pembayaran' });
        return of([]);
      })
    ).subscribe(images => {
      this.pembayaranUploading.set(false);
      const newItems = (images as { id: string; url?: string }[]).map(img => ({
        id: String(img.id),
        url: img.url ?? '',
      }));
      this.pembayaranFileIds.set([...this.pembayaranFileIds(), ...newItems]);
      uploader.clear();
    });
  }

  protected removeBuktiFoto(index: number) {
    const arr = [...this.pembayaranFileIds()];
    arr.splice(index, 1);
    this.pembayaranFileIds.set(arr);
  }

  protected submitPembayaran() {
    const id = this.laporan()?.id;
    if (!id) return;
    if (this.pembayaranFileIds().length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Upload minimal 1 bukti pembayaran' });
      return;
    }
    this.store
      .dispatch(new UploadBuktiPembayaranDarurat(id, Number(this.pembayaranFileIds()[0]?.id)))
      .subscribe({
        next: () => {
          this.pembayaranDialogVisible = false;
          this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Bukti pembayaran berhasil diupload' });
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan' });
        },
      });
  }

  protected goBack(): void {
    this.location.back();
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
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
    // Load SHS Master list for the dialog
    this.store.dispatch(new LoadShsMaster());
  }
}
