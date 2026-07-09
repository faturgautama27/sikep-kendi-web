import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe, FormsModule } from '@angular/common';

import { APP_ENV } from '@core/data-access/app-env.token';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import type { KartuPemeliharaan } from '@shared/models';

@Component({
  selector: 'app-kartu-pemeliharaan',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './kartu-pemeliharaan.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KartuPemeliharaanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private readonly msg = inject(MessageService);

  protected readonly vehicleId = signal<string>('');
  protected readonly kartu = signal<KartuPemeliharaan | null>(null);
  protected readonly loading = signal(false);

  protected readonly today = new Date();
  protected readonly currentYear = new Date().getFullYear();
  protected readonly tahun = signal<number>(this.currentYear);

  protected readonly tahunOptions = Array.from({ length: 5 }, (_, i) => {
    const y = this.currentYear - i;
    return { label: String(y), value: y };
  });

  protected readonly judul = computed(() => {
    const k = this.kartu();
    if (!k) return 'Kartu Pemeliharaan';
    return `${k.identitas.nomorPolisi} — ${k.identitas.merkTipe}`;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.vehicleId.set(id);
    this.loadKartu();
  }

  protected onTahunChange(tahun: number): void {
    this.tahun.set(tahun);
    this.loadKartu();
  }

  protected loadKartu(): void {
    const id = this.vehicleId();
    if (!id) return;
    this.loading.set(true);
    this.http
      .get<{ data: KartuPemeliharaan }>(
        `${this.env.apiUrl}/vehicles/${id}/kartu-pemeliharaan`,
        { params: { tahun: String(this.tahun()) } },
      )
      .subscribe({
        next: (res) => {
          this.kartu.set(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.msg.add({
            severity: 'error',
            summary: 'Gagal memuat kartu',
            detail: 'Terjadi kesalahan saat mengambil data kartu pemeliharaan.',
          });
          this.loading.set(false);
        },
      });
  }

  protected onPrint(): void {
    window.print();
  }

  protected formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  }

  protected formatKm(km: number): string {
    return new Intl.NumberFormat('id-ID').format(km) + ' km';
  }

  protected sisaPaguSeverity(sisa: number | null): 'success' | 'warn' | 'danger' {
    if (sisa === null) return 'success';
    if (sisa < 0) return 'danger';
    if (sisa < 500_000) return 'warn';
    return 'success';
  }
}
