import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, from, of, switchMap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { PengajuanDetailLengkap } from '@shared/models';

@Component({
  selector: 'app-pengajuan-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pengajuan-print.component.html',
  styleUrls: ['../../work-orders/print/print.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanPrintComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private env = inject(APP_ENV);

  @ViewChild('printContainer', { static: false })
  private printContainerRef!: ElementRef<HTMLElement>;

  protected readonly data = signal<PengajuanDetailLengkap | null>(null);
  protected readonly printDate = new Date();
  protected readonly isExporting = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http
        .get<PengajuanDetailLengkap>(`${this.env.apiBaseUrl}/pengajuan/${id}/detail-lengkap`)
        .subscribe((res) => {
          this.data.set(res);
          setTimeout(() => this.exportPdf(), 800);
        });
    }
  }

  ngOnDestroy() {}

  /**
   * Fetches an image via the backend proxy blob endpoint (avoids CORS on R2).
   * Falls back to direct URL if the proxy fails.
   */
  private async urlToDataUrl(url: string): Promise<string> {
    try {
      const blob = await firstValueFrom(
        this.http.get(url, { responseType: 'blob' }).pipe(catchError(() => of(null))),
      );
      if (!blob) return url;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  }

  /**
   * Clones a DOM element and replaces all <img> src attributes
   * with data URLs to bypass CORS when rendering to canvas.
   */
  private async cloneWithInlineImages(el: HTMLElement): Promise<HTMLElement> {
    const clone = el.cloneNode(true) as HTMLElement;
    const liveImgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    const cloneImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all(
      liveImgs.map(async (liveImg, i) => {
        const cloneImg = cloneImgs[i];
        if (!cloneImg) return;
        const src = liveImg.getAttribute('src');
        if (!src) return;
        try {
          cloneImg.src = await this.urlToDataUrl(src);
        } catch {
          // keep original src on failure
        }
      }),
    );
    return clone;
  }

  protected async exportPdf(): Promise<void> {
    if (this.isExporting()) return;
    const container = this.printContainerRef?.nativeElement;
    if (!container) return;

    this.isExporting.set(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const cloned = await this.cloneWithInlineImages(container);
      cloned.style.position = 'absolute';
      cloned.style.left = '-9999px';
      cloned.style.top = '0';
      cloned.style.width = `${container.offsetWidth}px`;
      document.body.appendChild(cloned);

      const canvas = await html2canvas(cloned, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: container.offsetWidth,
        height: container.scrollHeight,
      });

      document.body.removeChild(cloned);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let yOffset = 0;
      let remaining = imgHeight;

      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage();
        const sliceHeight = Math.min(remaining, pageHeight);
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
        remaining -= sliceHeight;
      }

      const d = this.data();
      pdf.save(`Pengajuan-${d?.id ?? 'dokumen'}-${this.printDate.getFullYear()}.pdf`);
    } catch (err) {
      console.error('Export PDF gagal:', err);
    } finally {
      this.isExporting.set(false);
    }
  }

  protected goBack(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.router.navigate(['/pengajuan', id]);
    } else {
      this.router.navigate(['/pengajuan']);
    }
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('id-ID');
  }

  protected penawaranTerbaru(
    penawaran: PengajuanDetailLengkap['workOrder'] extends infer W
      ? W extends { penawaran: infer P }
        ? P
        : never
      : never,
  ) {
    if (!penawaran || penawaran.length === 0) return null;
    return [...penawaran].sort((a, b) => b.versi - a.versi)[0];
  }

  protected totalShs(acc: number, item: { hargaVendor: number }): number {
    return acc + Number(item.hargaVendor);
  }

  private readonly DOKUMENTASI_LABEL: Record<string, string> = {
    kondisi_awal: 'Kondisi Awal',
    sparepart_sebelum: 'Sparepart Sebelum',
    sparepart_sesudah: 'Sparepart Sesudah',
    pasca_perbaikan: 'Pasca Perbaikan',
  };

  protected dokumentasiGrouped(
    dokumentasi: Array<{ kategori: string; image: { url: string } }>,
  ): Array<{ label: string; items: Array<{ kategori: string; image: { url: string } }> }> {
    const order = ['kondisi_awal', 'sparepart_sebelum', 'sparepart_sesudah', 'pasca_perbaikan'];
    const groups = new Map<string, Array<{ kategori: string; image: { url: string } }>>();

    for (const item of dokumentasi) {
      const existing = groups.get(item.kategori) ?? [];
      existing.push(item);
      groups.set(item.kategori, existing);
    }

    // Sort by predefined order, unknown categories at end
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return sorted.map(([kategori, items]) => ({
      label: this.DOKUMENTASI_LABEL[kategori] ?? kategori,
      items,
    }));
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Draft',
      menunggu_verifikasi: 'Menunggu Verifikasi',
      disetujui: 'Disetujui',
      ditolak: 'Ditolak',
      dalam_proses: 'Dalam Proses',
      selesai: 'Selesai',
    };
    return map[status] ?? status;
  }
}
