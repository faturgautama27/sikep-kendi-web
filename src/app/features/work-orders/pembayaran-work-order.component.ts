import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectModule } from 'primeng/select';
import { PageHeaderComponent } from '@core/layout';
import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import { WorkOrdersState, GetWorkOrderDetail } from './state';

import {
  PembayaranState,
  ProsesPembayaran,
  UploadBuktiTransfer,
} from '@features/pembayaran/state';

@Component({
  selector: 'app-pembayaran-work-order',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    InputNumberModule,
    CardModule,
    TagModule,
    DividerModule,
    FileUploadModule,
    SelectModule,
  ],
  templateUrl: './pembayaran-work-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PembayaranWorkOrderComponent implements OnInit, AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  private readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly router = inject(Router);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);

  // States
  protected readonly wo = this.store.selectSignal(WorkOrdersState.detail);
  protected readonly list = this.store.selectSignal(PembayaranState.list);
  protected readonly record = computed(
    () => this.list().find((item) => item.workOrderId === this.workOrderId) ?? null,
  );

  protected readonly verifiedTotal = computed(() => {
    const shsItems = this.wo()?.verifikasiHarga?.shsItems ?? [];
    if (shsItems.length === 0) return this.wo()?.penawaranDetail?.totalBiaya ?? 0;
    return shsItems.reduce((acc, item) => acc + Number(item.hargaVendor), 0);
  });

  // Form Options
  protected metodeOptions = [
    { label: 'Transfer Bank', value: 'transfer_bank' },
    { label: 'Tunai', value: 'tunai' },
    { label: 'Cek', value: 'cek' }
  ];

  // Form
  protected metodePembayaran = 'transfer_bank';
  protected totalDibayar = 0;
  protected fileUpload: File | null = null;
  protected saving = signal(false);

  ngOnInit() {
    this.store.dispatch(new GetWorkOrderDetail(this.workOrderId));
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if(this.verifiedTotal()){
        this.totalDibayar = this.verifiedTotal();
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  // Formatting helpers
  protected formatRupiah(value: number | string | null | undefined): string {
    if (value == null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  protected goBack(): void {
    this.router.navigate(['/work-orders', this.workOrderId]);
  }

  protected onFileSelect(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.fileUpload = file;
    }
  }

  protected removeFile(): void {
    this.fileUpload = null;
  }

  protected proses(): void {
    if (!this.totalDibayar && !this.verifiedTotal()) return;

    this.saving.set(true);

    if (this.fileUpload) {
      // Step 1: Upload bukti transfer image
      this.imageData.upload(this.fileUpload).subscribe({
        next: (img) => {
          this.submitData(Number(img.id));
        },
        error: () => {
          this.saving.set(false);
          // TODO: show error toast
        }
      });
    } else {
      this.submitData(null);
    }
  }

  private submitData(imageId: number | null): void {
    this.store.dispatch(
      new ProsesPembayaran(this.workOrderId, {
        metodePembayaran: this.metodePembayaran,
        totalDibayar: Number(this.totalDibayar || this.verifiedTotal()),
        tanggalPembayaran: new Date().toISOString(),
      }),
    ).subscribe({
      next: () => {
        if (imageId) {
          // Send imageId to backend
          this.store.dispatch(new UploadBuktiTransfer(this.workOrderId, { imageId })).subscribe(() => {
            this.saving.set(false);
            this.goBack();
          });
        } else {
          this.saving.set(false);
          this.goBack();
        }
      },
      error: () => this.saving.set(false)
    });
  }
}
