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
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { APP_ENV } from '@core/data-access/app-env.token';

export interface HasilPemeliharaanItem {
  nomorInventaris: string;
  namaBarang: string;
  nomorPolisi: string;
  jenisPemeliharaan: string;
  frekuensi: number;
  totalBiaya: number;
  target: number;
  realisasi: number;
  kondisiAkhir: string;
}

export interface HasilPemeliharaanRekapitulasi {
  jumlahKendaraan: number;
  kendaraanDipelihara: number;
  totalKegiatan: number;
  totalAnggaran: number | null;
  totalRealisasi: number;
}

export interface HasilPemeliharaanData {
  tahun: number;
  dari: number;
  sampai: number;
  items: HasilPemeliharaanItem[];
  rekapitulasi: HasilPemeliharaanRekapitulasi;
}

@Component({
  selector: 'app-hasil-pemeliharaan',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './hasil-pemeliharaan.component.html',
  styleUrls: ['../work-orders/print/print.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HasilPemeliharaanComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private env = inject(APP_ENV);

  @ViewChild('printContainer', { static: false })
  private printContainerRef!: ElementRef<HTMLElement>;

  protected readonly data = signal<HasilPemeliharaanData | null>(null);
  protected readonly loading = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedTahun = signal<number>(new Date().getFullYear());

  protected readonly tahunOptions = (() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => ({
      label: String(current - i),
      value: current - i,
    }));
  })();

  ngOnInit() {
    this.loadData(this.selectedTahun());
  }

  protected generate() {
    this.loadData(this.selectedTahun());
  }

  protected goBack() {
    this.router.navigate(['/laporan/report-builder']);
  }

  private loadData(tahun: number) {
    this.loading.set(true);
    this.error.set(null);
    this.data.set(null);
    this.http
      .get<any>(`${this.env.apiBaseUrl}/vehicles/hasil-pemeliharaan`, {
        params: { tahun: String(tahun), dari: '1', sampai: '12' },
      })
      .subscribe({
        next: (res: any) => {
          this.data.set(res?.data ?? res);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Gagal memuat data hasil pemeliharaan.');
          this.loading.set(false);
        },
      });
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────

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

      const A4_W_MM = 297; // landscape
      const A4_H_MM = 210;

      const printPages = Array.from(container.querySelectorAll<HTMLElement>('.print-page'));
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let i = 0; i < printPages.length; i++) {
        const page = printPages[i];
        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:1122px;background:#fff;';
        const cloned = await this.cloneWithInlineImages(page);

        const styleKiller = document.createElement('style');
        styleKiller.textContent = `
          * { color: #000 !important; background-color: transparent !important; border-color: #ccc !important; }
          .bg-white { background-color: #fff !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
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
        const ratio = A4_W_MM / canvas.width;
        const imgH = canvas.height * ratio;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, Math.min(imgH, A4_H_MM));
      }

      const d = this.data();
      pdf.save(`Daftar-Hasil-Pemeliharaan-${d?.dari ?? ''}-${d?.sampai ?? ''}-${d?.tahun ?? ''}.pdf`);
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

  protected kondisiClass(kondisi: string): string {
    if (kondisi === 'Baik') return 'text-green-700';
    if (kondisi === 'Rusak Ringan') return 'text-orange-600';
    if (kondisi === 'Rusak Berat') return 'text-red-600';
    return '';
  }
}
