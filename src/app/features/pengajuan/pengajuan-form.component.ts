import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { StepsModule } from 'primeng/steps';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';

import { PageHeaderComponent } from '@core/layout';
import { VehiclesState } from '@features/vehicles/state/vehicles.state';
import { LoadVehicles } from '@features/vehicles/state/vehicles.actions';
import { CreatePengajuan, UpdatePengajuan } from './state/pengajuan.actions';
import { PENGAJUAN_DATA } from '@core/data-access/ports/pengajuan-data.port';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import type { Vehicle } from '@shared/models';

import { catchError, forkJoin, of } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';
import { OfflineQueueDbService } from '@core/data-access/offline-queue-db.service';

type Step = 0 | 1 | 2;

@Component({
  selector: 'app-pengajuan-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    TextareaModule,
    RadioButtonModule,
    SelectModule,
    StepsModule,
    TagModule,
    ToastModule,
    PageHeaderComponent,
    FileUploadModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './pengajuan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly dataPort = inject(PENGAJUAN_DATA);
  private readonly imageData = inject(IMAGE_DATA);
  protected readonly env = inject(APP_ENV);
  private readonly offlineQueue = inject(OfflineQueueDbService);

  protected readonly step = signal<Step>(0);
  protected readonly submitting = signal(false);
  protected readonly clientUuid = crypto.randomUUID();
  protected readonly pengajuanId = signal<string | null>(null);
  protected readonly isEditMode = computed(() => !!this.pengajuanId());
  protected readonly photos = signal<{ id?: string, dataUrl: string }[]>([]);
  protected readonly warningDialogVisible = signal(false);
  protected readonly submissionWarnings = signal<string[]>([]);

  private readonly allVehicles = this.store.selectSignal(VehiclesState.list);
  protected readonly vehicleOpts = computed(() =>
    this.allVehicles()
      .filter((v) => v.status === 'active' || v.status === 'in_repair')
      .map((v) => ({ label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`, value: v.id })),
  );

  protected readonly steps = [
    { label: 'Data Kendaraan' },
    { label: 'Detail Kerusakan' },
    { label: 'Konfirmasi' },
  ];

  // Step 1 form
  protected readonly step1 = this.fb.group({
    vehicleId: ['', Validators.required],
    jenisPengajuan: ['servis_rutin', Validators.required],
    odometerSaatPengajuan: [0, [Validators.required, Validators.min(0)]],
  });

  // Step 2 form
  protected readonly step2 = this.fb.group({
    deskripsiKerusakan: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    ],
  });

  protected readonly vehicleIdValue = toSignal(this.step1.controls.vehicleId.valueChanges, {
    initialValue: this.step1.controls.vehicleId.value,
  });

  protected readonly selectedVehicle = computed<Vehicle | null>(() => {
    const id = this.vehicleIdValue();
    return this.allVehicles().find((v) => String(v.id) === String(id)) ?? null;
  });

  ngOnInit(): void {
    if (this.allVehicles().length === 0) {
      this.store.dispatch(new LoadVehicles());
    }

    // Set default deskripsi berdasarkan nilai awal jenis pengajuan (servis_rutin by default)
    this.syncDeskripsiDefault(this.step1.controls.jenisPengajuan.value);

    // Auto-isi/kosongkan deskripsi saat jenis pengajuan berubah
    this.step1.controls.jenisPengajuan.valueChanges.subscribe((jenis) => {
      this.syncDeskripsiDefault(jenis);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.pengajuanId.set(id);
      this.dataPort.getById(id).subscribe({
        next: (res) => {
          this.step1.patchValue({
            vehicleId: res.vehicleId,
            jenisPengajuan: res.jenis.toLowerCase(),
            odometerSaatPengajuan: res.odometerSaatPengajuan ?? 0,
          });
          this.step2.patchValue({
            deskripsiKerusakan: res.deskripsi,
          });
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data pengajuan' }),
      });
    }
  }

  protected onVehicleChange(): void {
    const v = this.selectedVehicle();
    if (v && !this.isEditMode()) {
      this.step1.patchValue({ odometerSaatPengajuan: v.odometerCurrent });
    }
  }

  private syncDeskripsiDefault(jenis: string | null): void {
    const current = this.step2.controls.deskripsiKerusakan.value ?? '';
    if (jenis === 'servis_rutin') {
      if (!current.trim()) {
        this.step2.controls.deskripsiKerusakan.setValue('Service Rutin Kendaraan Dinas');
      }
    } else {
      if (current.trim() === 'Service Rutin Kendaraan Dinas') {
        this.step2.controls.deskripsiKerusakan.setValue('');
      }
    }
  }

  protected charCount(): number {
    return (this.step2.get('deskripsiKerusakan')!.value ?? '').length;
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

  protected async takePhoto() {
    if (this.photos().length >= 5) {
      this.msg.add({ severity: 'warn', summary: 'Batas Foto', detail: 'Maksimal 5 foto' });
      return;
    }
    
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        this.submitting.set(true);
        const file = this.dataUrlToFile(image.dataUrl, `pengajuan_${Date.now()}.jpg`);
        this.imageData.upload(file).subscribe({
          next: (res: any) => {
            this.submitting.set(false);
            this.photos.set([...this.photos(), { id: String(res.id), dataUrl: res.url }]);
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
  
  protected removePhoto(index: number) {
    this.photos.update(p => p.filter((_, i) => i !== index));
  }

  protected onUploadPhoto(event: { files: File[] }, uploader: unknown) {
    const files: File[] = event.files;
    this.submitting.set(true);
    const uploads = files.map((f: File) => this.imageData.upload(f));
    
    forkJoin(uploads).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload foto pengajuan' });
        return of([]);
      })
    ).subscribe(images => {
      this.submitting.set(false);
      const newItems = images.map((img: { id: string, url?: string }) => ({ id: String(img.id), dataUrl: img.url ?? '' }));
      this.photos.update(p => [...p, ...newItems]);
      (uploader as { clear: () => void }).clear();
      this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto berhasil diupload' });
    });
  }

  protected prevStep() {
    this.goStep((this.step() - 1) as Step);
  }

  protected nextStep() {
    this.goStep((this.step() + 1) as Step);
  }

  protected goStep(target: Step): void {
    if (target === 1) {
      this.step1.markAllAsTouched();
      if (this.step1.invalid) return;
    }
    if (target === 2) {
      this.step1.markAllAsTouched();
      this.step2.markAllAsTouched();
      if (this.step1.invalid || this.step2.invalid) return;
    }
    this.step.set(target);
  }

  protected async onSubmit(): Promise<void> {
    if (this.step1.invalid || this.step2.invalid) return;
    this.submitting.set(true);

    const v = this.selectedVehicle()!;
    const s1 = this.step1.getRawValue();
    const s2 = this.step2.getRawValue();

    const input = {
      jenis: s1.jenisPengajuan === 'servis_rutin' ? 'SERVIS_RUTIN' as const : s1.jenisPengajuan === 'ganti_spare_part' ? 'GANTI_SPARE_PART' as const : 'PERBAIKAN_KERUSAKAN' as const,
      vehicleId: s1.vehicleId!,
      vehiclePlate: v.nomorPolisi,
      regulationVersionId: '',
      judul: `Pengajuan ${s1.jenisPengajuan === 'servis_rutin' ? 'Servis Rutin' : 'Perbaikan'} — ${v.nomorPolisi}`,
      deskripsi: s2.deskripsiKerusakan!,
      kategoriKerusakan: null,
      totalEstimasi: s1.odometerSaatPengajuan ?? 0,
      createdBy: '',
      createdByName: '',
      sourceExecutionId: null,
      sourceItemId: null,
      spareparts: [],
      fotoIds: this.photos().map(x => Number(x.id)),
      odometerSaatPengajuan: s1.odometerSaatPengajuan ?? 0,
      clientUuid: this.clientUuid,
    };

    if (this.env.isMobile) {
      const net = await Network.getStatus();
      if (!net.connected) {
        await this.offlineQueue.enqueue('CREATE_PENGAJUAN', input);
        this.submitting.set(false);
        this.msg.add({ severity: 'success', summary: 'Offline Mode', detail: 'Pengajuan disimpan di antrean lokal.' });
        setTimeout(() => this.router.navigate(['/driver']), 1500);
        return;
      }
    }

    const action = this.isEditMode() 
      ? new UpdatePengajuan(this.pengajuanId()!, {
          vehicleId: input.vehicleId,
          jenis: input.jenis,
          deskripsi: input.deskripsi,
          odometerSaatPengajuan: input.odometerSaatPengajuan,
          fotoIds: input.fotoIds,
        }) 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : new CreatePengajuan(input as any);

    this.store.dispatch(action).subscribe({
      next: (state: any) => {
        this.submitting.set(false);
        // Extract warnings if present in the newly created pengajuan
        const pengajuanList = state?.pengajuan?.list ?? [];
        const created = pengajuanList[0];
        
        if (created?.warnings?.length > 0) {
          this.submissionWarnings.set(created.warnings);
          this.warningDialogVisible.set(true);
        } else {
          this.msg.add({ 
            severity: 'success', 
            summary: this.isEditMode() ? 'Pengajuan diupdate' : 'Pengajuan berhasil dikirim', 
            detail: 'Menunggu verifikasi.' 
          });
          setTimeout(() => this.router.navigate([this.env.isMobile ? '/driver' : '/pengajuan']), 1500);
        }
      },
      error: () => {
        this.submitting.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan pengajuan.' });
      },
    });
  }

  protected closeWarningDialog(): void {
    this.warningDialogVisible.set(false);
    this.msg.add({ 
      severity: 'success', 
      summary: 'Pengajuan Selesai', 
      detail: 'Menunggu verifikasi lebih lanjut.' 
    });
    setTimeout(() => this.router.navigate([this.env.isMobile ? '/driver' : '/pengajuan']), 1000);
  }
}
