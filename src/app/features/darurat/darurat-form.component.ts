import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { PageHeaderComponent } from '@core/layout';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { CreateDarurat, UpdateDarurat } from './state/darurat.actions';
import { VehiclesState } from '@features/vehicles/state/vehicles.state';
import { LoadVehicles } from '@features/vehicles/state/vehicles.actions';
import { DARURAT_DATA } from '@core/data-access/ports/darurat-data.port';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import { catchError, forkJoin, of } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { OfflineQueueDbService } from '@core/data-access/offline-queue-db.service';
import { SelectModule } from 'primeng/select';

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

  private readonly allVehicles = this.store.selectSignal(VehiclesState.list);
  protected readonly vehicleOpts = computed(() =>
    this.allVehicles()
      .filter((v) => v.status === 'active' || v.status === 'in_repair')
      .map((v) => ({ label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`, value: String(v.id) }))
  );

  protected readonly form = this.fb.group({
    kendaraanId: ['', Validators.required],
    lokasiKejadian: ['', Validators.required],
    latitude: [null as number | null],
    longitude: [null as number | null],
    estimasiBiaya: [null as number | null, [Validators.min(0)]],
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
            estimasiBiaya: res.estimasiBiaya ?? null,
            deskripsiDarurat: res.deskripsiDarurat,
          });
          
          if (res.fotos) {
            const kerusakan = res.fotos.filter(f => f.tipe === 'KERUSAKAN').map((f: { imageId: number, url?: string }) => ({ id: String(f.imageId), url: f.url ?? '' }));
            this.fotoKerusakanIds.set(kerusakan);
          }
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data laporan' }),
      });
    }
  }



  protected onUploadKerusakan(event: { files: File[] }, uploader: unknown) {
    const files: File[] = event.files;
    this.submitting.set(true);
    const uploads = files.map((f: File) => this.imageData.upload(f));
    
    forkJoin(uploads).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload foto kerusakan' });
        return of([]);
      })
    ).subscribe(images => {
      this.submitting.set(false);
      const newItems = images.map((img: { id: string, url?: string }) => ({ id: String(img.id), url: img.url ?? '' }));
      this.fotoKerusakanIds.set([...this.fotoKerusakanIds(), ...newItems]);
      (uploader as { clear: () => void }).clear();
      this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto kerusakan berhasil diupload' });
    });
  }

  protected removeKerusakan(index: number) {
    const arr = [...this.fotoKerusakanIds()];
    arr.splice(index, 1);
    this.fotoKerusakanIds.set(arr);
  }


  private dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
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
        this.submitting.set(true);
        const file = this.dataUrlToFile(image.dataUrl, `kerusakan_${Date.now()}.jpg`);
        this.imageData.upload(file).subscribe({
          next: (res: any) => {
            this.submitting.set(false);
            this.fotoKerusakanIds.set([...this.fotoKerusakanIds(), { id: String(res.id), url: res.url }]);
            this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto berhasil diupload' });
          },
          error: () => {
            this.submitting.set(false);
            this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Gagal mengupload foto' });
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }


  protected async getLocation(): Promise<void> {
    try {
      // Periksa izin akses lokasi dulu (khusus aplikasi Capacitor native)
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          this.msg.add({ severity: 'error', summary: 'Izin Ditolak', detail: 'Akses GPS dibutuhkan' });
          return;
        }
      }

      // Ambil lokasi
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude, longitude } = pos.coords;

      // Simpan koordinat ke hidden fields
      this.form.patchValue({ latitude, longitude });

      // Reverse geocode ke nama jalan via Nominatim (gratis, tanpa API key)
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SiKepKenDI/1.0' } });
        const data = await res.json();
        const addr = data.address;
        const parts = [
          addr?.road,
          addr?.village ?? addr?.suburb,
          addr?.city ?? addr?.county,
        ].filter(Boolean);
        const alamat = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        this.form.patchValue({ lokasiKejadian: alamat });
      } catch {
        // Fallback ke koordinat jika geocoder gagal
        this.form.patchValue({ lokasiKejadian: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
      }

    } catch {
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



    this.submitting.set(true);
    const val = this.form.getRawValue();

    const input = {
      clientUuid: crypto.randomUUID(),
      kendaraanId: val.kendaraanId!,
      lokasiKejadian: val.lokasiKejadian!,
      latitude: val.latitude ?? undefined,
      longitude: val.longitude ?? undefined,
      estimasiBiaya: val.estimasiBiaya ?? undefined,
      deskripsiDarurat: val.deskripsiDarurat!,
      fotoKerusakanIds: this.fotoKerusakanIds().map(x => Number(x.id)),
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
