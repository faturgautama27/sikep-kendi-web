import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { APP_ENV } from '@core/data-access/app-env.token';
import { VehiclesState, LoadVehicles } from '@features/vehicles/state';
import { Store } from '@ngxs/store';

export interface KartuRiwayat {
  tanggal: string | null;
  kilometer: number;
  jenisPemeliharaan: string;
  bahanDigunakan: string;
  totalBiaya: number;
  pelaksana: string;
  keterangan: string;
}

export interface KartuKendaraan {
  namaBarang: string;
  kodeBarang: string | null;
  nomorRegister: string | null;
  nomorPolisi: string;
  merkTipe: string;
  tahunPerolehan: number;
  nomorMesin: string | null;
  nomorRangka: string | null;
  warna: string | null;
  unitKerja: string | null;
  pengguna: string | null;
  kondisiAwal: string;
}

export interface KartuRekapitulasi {
  totalKegiatan: number;
  totalBiayaJasa: number;
  totalBiayaSparepart: number;
  totalKeseluruhan: number;
  paguTahunan: number | null;
  sisaPagu: number | null;
}

export interface KartuPemeliharaanData {
  identitas: KartuKendaraan;
  riwayat: KartuRiwayat[];
  rekapitulasi: KartuRekapitulasi;
  tahun: number;
}

@Component({
  selector: 'app-kartu-pemeliharaan',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './kartu-pemeliharaan.component.html',
  styleUrls: ['../work-orders/print/print.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KartuPemeliharaanComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private env = inject(APP_ENV);
  private store = inject(Store);

  @ViewChild('printContainer', { static: false })
  private printContainerRef!: ElementRef<HTMLElement>;

  protected readonly data = signal<KartuPemeliharaanData | null>(null);
  protected readonly loading = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedVehicleId = signal<number | null>(null);
  protected readonly selectedTahun = signal<number>(new Date().getFullYear());

  protected readonly vehicles = this.store.selectSignal(VehiclesState.list);

  protected readonly vehicleOptions = () =>
    (this.vehicles() ?? []).map((v: any) => ({
      label: `${v.nomorPolisi} — ${v.merk} ${v.tipe ?? ''}`.trim(),
      value: v.id,
    }));

  protected readonly tahunOptions = (() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => ({
      label: String(current - i),
      value: current - i,
    }));
  })();

  ngOnInit() {
    this.store.dispatch(new LoadVehicles());
  }

  protected generate() {
    const vid = this.selectedVehicleId();
    const tahun = this.selectedTahun();
    if (!vid || !tahun) return;
    this.loadData(vid, tahun);
  }

  protected goBack() {
    this.router.navigate(['/laporan/report-builder']);
  }

  private loadData(vehicleId: number, tahun: number) {
    this.loading.set(true);
    this.error.set(null);
    this.data.set(null);
    this.http
      .get<any>(
        `${this.env.apiBaseUrl}/vehicles/${vehicleId}/kartu-pemeliharaan`,
        { params: { tahun: String(tahun) } },
      )
      .subscribe({
        next: (res: any) => {
          this.data.set(res?.data ?? res);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Gagal memuat data kartu pemeliharaan.');
          this.loading.set(false);
        },
      });
  }

  // ── Export PDF (same pattern as BastPrintComponent) ────────────────────────

  private async imageToDataUrl(src: string): Promise<string> {
    try {
      const blob = await firstValueFrom(
        this.http.get(src, { responseType: 'blob' }).pipe(catchError(() => of(null))),
      );
      if (!blob) return src;
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(src);
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }

  private async cloneWithInlineImages(el: HTMLElement): Promise<HTMLElement> {
    const clone = el.cloneNode(true) as HTMLElement;
    const liveImgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    const cloneImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all(
      liveImgs.map(async (liveImg, i) => {
        const cloneImg = cloneImgs[i];
        if (!cloneImg) return;
        const src = liveImg.getAttribute('src') || liveImg.src;
        if (!src || src.startsWith('data:')) return;
        const dataUrl = await this.imageToDataUrl(src);
        cloneImg.src = dataUrl;
        cloneImg.removeAttribute('srcset');
        cloneImg.crossOrigin = null as any;
      }),
    );
    return clone;
  }

  protected async exportPdf() {
    const container = this.printContainerRef?.nativeElement;
    if (!container) return;

    this.isExporting.set(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const A4_W_MM = 210;
      const A4_H_MM = 297;

      const printPages = Array.from(container.querySelectorAll<HTMLElement>('.print-page'));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < printPages.length; i++) {
        const page = printPages[i];

        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;';
        const cloned = await this.cloneWithInlineImages(page);

        const styleKiller = document.createElement('style');
        styleKiller.textContent = `
          * { color: #000 !important; background-color: transparent !important; border-color: #ccc !important; }
          .bg-white, [class*="bg-white"] { background-color: #fff !important; }
          .bg-slate-100, [class*="bg-slate-100"] { background-color: #f1f5f9 !important; }
          .bg-slate-50, [class*="bg-slate-50"] { background-color: #f8fafc !important; }
          .text-slate-500, [class*="text-slate-500"] { color: #64748b !important; }
          .text-slate-600, [class*="text-slate-600"] { color: #475569 !important; }
          .text-red-600, [class*="text-red-600"] { color: #dc2626 !important; }
          .border-slate-800, [class*="border-slate-800"] { border-color: #1e293b !important; }
          .border-slate-300, [class*="border-slate-300"] { border-color: #cbd5e1 !important; }
          .border-slate-200, [class*="border-slate-200"] { border-color: #e2e8f0 !important; }
        `;
        document.head.appendChild(styleKiller);
        offscreen.appendChild(cloned);
        document.body.appendChild(offscreen);

        const canvas = await html2canvas(offscreen.firstElementChild as HTMLElement, {
          scale: 2,
          useCORS: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 0,
        });

        document.body.removeChild(offscreen);
        document.head.removeChild(styleKiller);

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const ratio = A4_W_MM / canvasW;
        const imgH = canvasH * ratio;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, Math.min(imgH, A4_H_MM));
      }

      const d = this.data();
      const nomorPolisi = d?.identitas?.nomorPolisi ?? 'kendaraan';
      const tahun = d?.tahun ?? '';
      pdf.save(`Kartu-Pemeliharaan-${nomorPolisi}-${tahun}.pdf`);
      this.isExporting.set(false);
    } catch (err) {
      console.error('Export PDF gagal:', err);
      this.isExporting.set(false);
    }
  }

  // ── Formatters ─────────────────────────────────────────────────────────────

  protected formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  }

  protected formatTanggal(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected formatKm(km: number): string {
    if (!km) return '-';
    return new Intl.NumberFormat('id-ID').format(km) + ' KM';
  }
}
