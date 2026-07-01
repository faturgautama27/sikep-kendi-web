import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { catchError, forkJoin, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '@core/layout';

import { APP_ENV } from '@core/data-access/app-env.token';
import { OfflineQueueDbService } from '@core/data-access/offline-queue-db.service';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import { SubmitReimbursementDarurat } from './state/darurat.actions';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';
import { Location } from '@angular/common';

@Component({
  selector: 'app-darurat-reimbursement-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ToastModule,
    FileUploadModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './darurat-reimbursement-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratReimbursementFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly imageData = inject(IMAGE_DATA);
  protected readonly env = inject(APP_ENV);
  private readonly offlineQueue = inject(OfflineQueueDbService);
  private readonly location = inject(Location);

  protected readonly submitting = signal(false);
  protected readonly daruratId = signal<string>('');

  protected readonly fotoNotaIds = signal<{ id: string; url: string }[]>([]);
  protected readonly fotoSetelahPerbaikanIds = signal<{ id: string; url: string }[]>([]);

  protected readonly form = this.fb.group({
    totalReimbursement: [0, [Validators.required, Validators.min(1000)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.daruratId.set(id);
    } else {
      this.router.navigate(['/driver/darurat']);
    }
  }

  protected goBack(): void {
    this.location.back();
  }

  // File Upload Handlers (Web)
  protected onUpload(event: { files: File[] }, uploader: any, type: 'nota' | 'perbaikan') {
    const files: File[] = event.files;
    this.submitting.set(true);
    const uploads = files.map((f: File) => this.imageData.upload(f));
    
    forkJoin(uploads).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: 'Upload Gagal', detail: 'Gagal mengupload foto' });
        return of([]);
      })
    ).subscribe(images => {
      this.submitting.set(false);
      const newItems = images.map((img: { id: string, url?: string }) => ({ id: String(img.id), url: img.url ?? '' }));
      if (type === 'nota') {
        this.fotoNotaIds.set([...this.fotoNotaIds(), ...newItems]);
      } else {
        this.fotoSetelahPerbaikanIds.set([...this.fotoSetelahPerbaikanIds(), ...newItems]);
      }
      uploader.clear();
      this.msg.add({ severity: 'success', summary: 'Sukses', detail: 'Foto berhasil diupload' });
    });
  }

  protected removeFoto(index: number, type: 'nota' | 'perbaikan') {
    if (type === 'nota') {
      const arr = [...this.fotoNotaIds()];
      arr.splice(index, 1);
      this.fotoNotaIds.set(arr);
    } else {
      const arr = [...this.fotoSetelahPerbaikanIds()];
      arr.splice(index, 1);
      this.fotoSetelahPerbaikanIds.set(arr);
    }
  }

  // Camera Handler (Mobile)
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

  protected async takePhoto(type: 'nota' | 'perbaikan') {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        this.submitting.set(true);
        const file = this.dataUrlToFile(image.dataUrl, `foto_${type}_${Date.now()}.jpg`);
        this.imageData.upload(file).subscribe({
          next: (res: any) => {
            this.submitting.set(false);
            const newItem = { id: String(res.id), url: res.url };
            if (type === 'nota') {
              this.fotoNotaIds.set([...this.fotoNotaIds(), newItem]);
            } else {
              this.fotoSetelahPerbaikanIds.set([...this.fotoSetelahPerbaikanIds(), newItem]);
            }
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

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Cek kembali nominal pengeluaran' });
      return;
    }

    if (this.fotoNotaIds().length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Minimal 1 foto nota kwitansi harus diupload' });
      return;
    }
    
    if (this.fotoSetelahPerbaikanIds().length === 0) {
      this.msg.add({ severity: 'error', summary: 'Validasi', detail: 'Minimal 1 foto setelah perbaikan harus diupload' });
      return;
    }

    this.submitting.set(true);
    const val = this.form.getRawValue();

    const payload = {
      totalReimbursement: val.totalReimbursement!,
      fotoNotaIds: this.fotoNotaIds().map(x => Number(x.id)),
      fotoSetelahPerbaikanIds: this.fotoSetelahPerbaikanIds().map(x => Number(x.id)),
    };

    if (this.env.isMobile) {
      const net = await Network.getStatus();
      if (!net.connected) {
        // Enqueue offline action SUBMIT_REIMBURSEMENT_DARURAT
        await this.offlineQueue.enqueue('SUBMIT_REIMBURSEMENT_DARURAT', {
          id: this.daruratId(),
          payload
        });
        this.submitting.set(false);
        this.msg.add({ severity: 'success', summary: 'Offline Mode', detail: 'Data reimbursement disimpan di antrean lokal.' });
        setTimeout(() => this.router.navigate(['/driver/darurat', this.daruratId()]), 1500);
        return;
      }
    }

    this.store.dispatch(new SubmitReimbursementDarurat(this.daruratId(), payload)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Reimbursement berhasil diajukan.' });
        setTimeout(() => this.router.navigate([this.env.isMobile ? '/driver/darurat' : '/darurat', this.daruratId()]), 1500);
      },
      error: () => {
        this.submitting.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan.' });
      },
    });
  }
}
