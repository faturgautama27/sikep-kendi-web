import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@core/layout';
import { APP_ENV } from '@core/data-access/app-env.token';

import { GetWorkOrderDetail, WorkOrdersState } from './state';

export interface PenawaranItem {
  id: number;
  urutan: number;
  namaKerusakan: string;
  namaSparepart: string;
  tindakanPerbaikan: string;
  hargaItem: string | number;
}

export interface ShsInputRow extends PenawaranItem {
  hargaShs: number | null;
  catatanShs: string;
}

@Component({
  selector: 'app-verifikasi-work-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputNumber,
    InputTextModule,
    TextareaModule,
    TableModule,
    TagModule,
    ImageModule,
    TooltipModule,
    ProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './verifikasi-work-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifikasiWorkOrderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly detail = this.store.selectSignal(WorkOrdersState.detail);

  protected loading = signal(true);
  protected saving = signal(false);
  protected catatanRevisi = '';

  // SHS input rows — one per penawaran item
  protected rows = signal<ShsInputRow[]>([]);

  protected readonly penawaran = computed(() => this.detail()?.penawaranDetail ?? null);
  protected readonly invoiceUrl = computed(() => this.detail()?.penawaranDetail?.invoice?.imageUrl ?? null);

  // Computed totals
  protected readonly totalVendor = computed(() =>
    this.rows().reduce((sum, r) => sum + Number(r.hargaItem), 0)
  );
  protected readonly totalShs = computed(() =>
    this.rows().reduce((sum, r) => sum + (r.hargaShs ?? 0), 0)
  );
  protected readonly selisihTotal = computed(() => this.totalVendor() - this.totalShs());
  protected readonly allShsFilled = computed(() => this.rows().every((r) => r.hargaShs !== null && r.hargaShs > 0));

  ngOnInit(): void {
    this.store.dispatch(new GetWorkOrderDetail(this.workOrderId));
    this.loadVerifikasiDetail();
  }

  private loadVerifikasiDetail(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.env.apiBaseUrl}/work-orders/${this.workOrderId}/verifikasi-detail`).subscribe({
      next: (data) => {
        const items: PenawaranItem[] = data?.penawaran?.[0]?.items ?? [];
        const existingShsItems: any[] = data?.verifikasiHarga?.shsItems ?? [];

        this.rows.set(
          items.map((item) => {
            const existing = existingShsItems.find((s: any) => s.namaItem === item.namaKerusakan);
            return {
              ...item,
              hargaShs: existing ? Number(existing.hargaStandart) : null,
              catatanShs: existing?.keterangan ?? '',
            };
          })
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected selisihItem(row: ShsInputRow): number {
    return Number(row.hargaItem) - (row.hargaShs ?? 0);
  }

  protected selisihPersen(row: ShsInputRow): number {
    const h = Number(row.hargaItem);
    if (!h || !row.hargaShs) return 0;
    return ((h - row.hargaShs) / h) * 100;
  }

  protected isHighDeviation(row: ShsInputRow): boolean {
    return Math.abs(this.selisihPersen(row)) > 20;
  }

  protected formatRupiah(n: number | string | null): string {
    const val = n === null ? 0 : typeof n === 'string' ? parseFloat(n) : n;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(val || 0);
  }

  protected simpanShs(): void {
    this.saving.set(true);
    const items = this.rows().map((r) => ({
      namaItem: r.namaKerusakan,
      hargaVendor: Number(r.hargaItem),
      hargaStandart: r.hargaShs ?? 0,
      keterangan: r.catatanShs,
    }));

    this.http.post(`${this.env.apiBaseUrl}/work-orders/${this.workOrderId}/verifikasi/shs`, { items }).subscribe({
      next: () => this.saving.set(false),
      error: () => this.saving.set(false),
    });
  }

  protected setujuiVerifikasi(): void {
    this.saving.set(true);
    this.http.post(`${this.env.apiBaseUrl}/work-orders/${this.workOrderId}/verifikasi/approve`, {}).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/work-orders', this.workOrderId]);
      },
      error: () => this.saving.set(false),
    });
  }

  protected mintaRevisi(): void {
    if (!this.catatanRevisi.trim()) return;
    this.saving.set(true);
    this.http.post(`${this.env.apiBaseUrl}/work-orders/${this.workOrderId}/verifikasi/revisi`, {
      catatanRevisi: this.catatanRevisi,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/work-orders', this.workOrderId]);
      },
      error: () => this.saving.set(false),
    });
  }

  protected goBack(): void {
    this.router.navigate(['/work-orders', this.workOrderId]);
  }
}
