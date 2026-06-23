import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileUploadModule, FileUploadEvent } from 'primeng/fileupload';

import { PageHeaderComponent } from '@core/layout';
import { CreateDarurat, UpdateDarurat } from './state/darurat.actions';
import { VehiclesState } from '@features/vehicles/state/vehicles.state';
import { LoadVehicles } from '@features/vehicles/state/vehicles.actions';
import { DARURAT_DATA } from '@core/data-access/ports/darurat-data.port';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { OfflineQueueDbService } from '@core/data-access/offline-queue-db.service';

@Component({
  selector: 'app-darurat-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ToastModule,
    FileUploadModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './darurat-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly dataPort = inject(DARURAT_DATA);
  private readonly imageData = inject(IMAGE_DATA);
  protected readonly env = inject(APP_ENV);
  private readonly offlineQueue = inject(OfflineQueueDbService);

  protected readonly submitting = signal(false);
  protected readonly daruratId = signal<string | null>(null);
  protected readonly isEditMode = computed(() => !!this.daruratId());

  protected readonly fotoKerusakanIds = signal<{ id: string; url: string }[]>([]);
  protected readonly fotoInvoiceIds = signal<{ id: string; url: string }[]>([]);

  private readonly allVehicles = this.store.selectSignal(VehiclesState.list);
  protected readonly vehicleOpts = computed(() =>
    this.allVehicles()
      .filter((v) => v.status === 'active' || v.status === 'in_repair')
      .map((v) => ({ label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`, value: String(v.id) }))
  );

  protected readonly form = this.fb.group({
    kendaraanId: ['', Validators.required],
    lokasiKejadian: ['', Validators.required],
    totalPengeluaran: [0, [Validators.required, Validators.min(0)]],
    deskripsiDarurat: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    if (this.allVehicles().length === 0) {
      this.store.dispatch(new LoadVehicles());
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.daruratId.set(id);
      this.dataPort.detail(id).subscribe({
        next: (res) => {
          this.form.patchValue({
            kendaraanId: String(res.kendaraanId),
            lokasiKejadian: res.lokasiKejadian ?? '',
            totalPengeluaran: res.totalPengeluaran,
            deskripsiDarurat: res.deskripsiDarurat,
          });
          
          if (res.fotos) {
            const kerusakan = res.fotos.filter(f => f.tipe === 'KERUSAKAN').map((f: any) => ({ id: String(f.imageId), url: f?.url ?? '' }));
            const invoice = res.fotos.filter(f => f.tipe === 'INVOICE').map((f: any) => ({ id: String(f.imageId), url: f?.url ?? '' }));
            this.fotoKerusakanIds.set(kerusakan);
            this.fotoInvoiceIds.set(invoice);
          }
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data laporan' }),
      });
    }
  }

  protected onUploadKerusakan(event: any, uploader: any) {
    const files: File[] = event.files;
    this.submitting.set(true);
    const uploads = files.map(f => this.imageData.upload(f));
    
    forkJoin(uploads).pipe(
      catchError(err => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload foto kerusakan' });
        return of([]);
      })
    ).subscribe(images => {
      this.submitting.set(false);
      const newItems = images.map(img => ({ id: String(img.id), url: img.url }));
      this.fotoKerusakanIds.set([...this.fotoKerusakanIds(), ...newItems]);
      uploader.clear();
      this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto kerusakan berhasil diupload' });
    });
  }

  protected removeKerusakan(index: number) {
    const arr = [...this.fotoKerusakanIds()];
    arr.splice(index, 1);
    this.fotoKerusakanIds.set(arr);
  }

  protected onUploadInvoice(event: any, uploader: any) {
    const files: File[] = event.files;
    this.submitting.set(true);
    const uploads = files.map(f => this.imageData.upload(f));
    
    forkJoin(uploads).pipe(
      catchError(err => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload foto invoice' });
        return of([]);
      })
    ).subscribe(images => {
      this.submitting.set(false);
      const newItems = images.map(img => ({ id: String(img.id), url: img.url }));
      this.fotoInvoiceIds.set([...this.fotoInvoiceIds(), ...newItems]);
      uploader.clear();
      this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto invoice berhasil diupload' });
    });
  }

  protected removeInvoice(index: number) {
    const arr = [...this.fotoInvoiceIds()];
    arr.splice(index, 1);
    this.fotoInvoiceIds.set(arr);
  }

  protected async takePhotoKerusakan() {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        this.fotoKerusakanIds.set([...this.fotoKerusakanIds(), { id: crypto.randomUUID(), url: image.dataUrl }]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  protected async takePhotoInvoice() {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        this.fotoInvoiceIds.set([...this.fotoInvoiceIds(), { id: crypto.randomUUID(), url: image.dataUrl }]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  protected async getLocation() {
    if (!this.env.isMobile) return;
    try {
      const pos = await Geolocation.getCurrentPosition();
      const text = `${pos.coords.latitude}, ${pos.coords.longitude}`;
      this.form.patchValue({ lokasiKejadian: text });
    } catch (e) {
      this.msg.add({ severity: 'error', summary: 'Lokasi', detail: 'Gagal mendapatkan lokasi GPS' });
    }
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Cek kembali isian form' });
      return;
    }

    if (this.fotoKerusakanIds().length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Minimal 1 foto kerusakan harus diupload' });
      return;
    }

    if (this.fotoInvoiceIds().length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Minimal 1 foto invoice harus diupload' });
      return;
    }

    this.submitting.set(true);
    const val = this.form.getRawValue();

    const input = {
      clientUuid: crypto.randomUUID(),
      kendaraanId: val.kendaraanId!,
      lokasiKejadian: val.lokasiKejadian!,
      totalPengeluaran: val.totalPengeluaran!,
      deskripsiDarurat: val.deskripsiDarurat!,
      fotoKerusakanIds: this.fotoKerusakanIds().map(x => x.id),
      fotoInvoiceIds: this.fotoInvoiceIds().map(x => x.id),
      offlinePhotos: this.fotoKerusakanIds().map(x => x.url).concat(this.fotoInvoiceIds().map(x => x.url))
    };

    if (this.env.isMobile) {
      const net = await Network.getStatus();
      if (!net.connected) {
        await this.offlineQueue.enqueue('CREATE_DARURAT', input);
        this.submitting.set(false);
        this.msg.add({ severity: 'success', summary: 'Offline Mode', detail: 'Laporan disimpan di antrean lokal.' });
        setTimeout(() => this.router.navigate(['/driver']), 1500);
        return;
      }
    }

    const action = this.isEditMode()
      ? new UpdateDarurat(this.daruratId()!, input)
      : new CreateDarurat(input as any);

    this.store.dispatch(action).subscribe({
      next: () => {
        this.submitting.set(false);
        this.msg.add({
          severity: 'success',
          summary: this.isEditMode() ? 'Laporan diupdate' : 'Laporan dikirim',
          detail: 'Laporan darurat berhasil disimpan.',
        });
        setTimeout(() => this.router.navigate([this.env.isMobile ? '/driver' : '/darurat']), 1500);
      },
      error: () => {
        this.submitting.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan.' });
      },
    });
  }
}
