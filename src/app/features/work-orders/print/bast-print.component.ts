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
import { WORKORDER_DATA } from '@core/data-access/ports/work-order-data.port';
import { WorkOrder } from '@shared/models';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';

const EVIDENCE_LABEL_MAP: Record<string, string> = {
  kondisi_awal: 'Kondisi Awal',
  sparepart_sebelum: 'Sparepart Sebelum',
  sparepart_sesudah: 'Sparepart Sesudah',
  pasca_perbaikan: 'Pasca Perbaikan',
};

@Component({
  selector: 'app-bast-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bast-print.component.html',
  styleUrls: ['./print.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BastPrintComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataPort = inject(WORKORDER_DATA);
  private http = inject(HttpClient);
  private env = inject(APP_ENV);

  @ViewChild('printContainer', { static: false })
  private printContainerRef!: ElementRef<HTMLElement>;

  protected readonly wo = signal<WorkOrder | null>(null);
  protected readonly printDate = new Date();
  protected readonly isExporting = signal(false);

  /** PDF attachment defs — uses imageId for proxy, url as fallback */
  private pdfAttachmentDefs: { label: string; imageId: string; url: string }[] = [];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dataPort.getById(id).subscribe((res) => {
        this.wo.set(res);
        this.collectPdfAttachments(res);
        setTimeout(() => this.exportPdf(), 800);
      });
    }
  }

  ngOnDestroy() {}

  private collectPdfAttachments(wo: WorkOrder) {
    this.pdfAttachmentDefs = [];
    if (wo.invoiceImage && this.isPdfUrl(wo.invoiceImage.url)) {
      this.pdfAttachmentDefs.push({
        label: 'Invoice Final',
        imageId: wo.invoiceImage.id,
        url: wo.invoiceImage.url,
      });
    }
    if (wo.invoiceDraft && this.isPdfUrl(wo.invoiceDraft.url)) {
      this.pdfAttachmentDefs.push({
        label: 'Draft Invoice (TTD/Cap)',
        imageId: wo.invoiceDraft.id,
        url: wo.invoiceDraft.url,
      });
    }
    if (wo.fakturPajakFile && this.isPdfUrl(wo.fakturPajakFile.url)) {
      this.pdfAttachmentDefs.push({
        label: 'Faktur Pajak',
        imageId: wo.fakturPajakFile.id,
        url: wo.fakturPajakFile.url,
      });
    }
  }

  /**
   * Fetches an image via the backend proxy blob endpoint (avoids CORS on R2).
   * Falls back to direct URL if the proxy fails.
   * Returns a data URL string for use as img src.
   */
  private async imageIdToDataUrl(imageId: string, fallbackUrl: string): Promise<string> {
    const proxyUrl = `${this.env.apiBaseUrl}/images/${imageId}/blob`;
    try {
      const blob = await firstValueFrom(
        this.http.get(proxyUrl, { responseType: 'blob' }).pipe(catchError(() => of(null))),
      );
      if (!blob) return fallbackUrl;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(fallbackUrl);
        reader.readAsDataURL(blob);
      });
    } catch {
      return fallbackUrl;
    }
  }

  /**
   * Clones a DOM element and replaces all <img> src attributes
   * with data URLs fetched via backend proxy to bypass CORS.
   */
  private async cloneWithInlineImages(el: HTMLElement): Promise<HTMLElement> {
    const clone = el.cloneNode(true) as HTMLElement;
    const liveImgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    const cloneImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all(
      liveImgs.map(async (liveImg, i) => {
        const cloneImg = cloneImgs[i];
        if (!cloneImg) return;
        const imageId = liveImg.getAttribute('data-image-id');
        const src = liveImg.getAttribute('src') || liveImg.src;
        if (!src || src.startsWith('data:')) return;

        let dataUrl: string;
        if (imageId) {
          dataUrl = await this.imageIdToDataUrl(imageId, src);
        } else {
          try {
            const blob = await firstValueFrom(
              this.http.get(src, { responseType: 'blob' }).pipe(catchError(() => of(null))),
            );
            if (blob) {
              dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(src);
                reader.readAsDataURL(blob);
              });
            } else {
              dataUrl = src;
            }
          } catch {
            dataUrl = src;
          }
        }
        cloneImg.src = dataUrl;
        cloneImg.removeAttribute('srcset');
        cloneImg.crossOrigin = null as any;
      }),
    );
    return clone;
  }

  /**
   * Main export function:
   * 1. Pre-fetches all images as data URLs to bypass CORS in html2canvas
   * 2. Captures each .print-page div as a canvas image via html2canvas
   * 3. Builds a jsPDF from those images (A4 portrait)
   * 4. Fetches each PDF attachment via Angular HttpClient
   * 5. Uses pdf-lib to merge the jsPDF output + all PDF attachments into one file
   * 6. Triggers download of the merged PDF
   */
  protected async exportPdf() {
    const container = this.printContainerRef?.nativeElement;
    if (!container) return;

    this.isExporting.set(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }, { PDFDocument }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
        import('pdf-lib'),
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

        // Neutralize oklch() before html2canvas parses styles
        const styleKiller = document.createElement('style');
        styleKiller.textContent = `
          * {
            color: #000 !important;
            background-color: transparent !important;
            border-color: #000 !important;
          }
          .bg-white, [class*="bg-white"] { background-color: #fff !important; }
          .bg-slate-100, [class*="bg-slate-100"] { background-color: #f1f5f9 !important; }
          .bg-slate-50, [class*="bg-slate-50"] { background-color: #f8fafc !important; }
          .bg-blue-600, [class*="bg-blue-600"] { background-color: #2563eb !important; }
          .text-white, [class*="text-white"] { color: #fff !important; }
          .text-slate-500, [class*="text-slate-500"] { color: #64748b !important; }
          .text-slate-600, [class*="text-slate-600"] { color: #475569 !important; }
          .text-slate-400, [class*="text-slate-400"] { color: #94a3b8 !important; }
          .text-blue-500, [class*="text-blue-500"] { color: #3b82f6 !important; }
          .border-slate-800, [class*="border-slate-800"] { border-color: #1e293b !important; }
          .border-slate-300, [class*="border-slate-300"] { border-color: #cbd5e1 !important; }
          .border-slate-400, [class*="border-slate-400"] { border-color: #94a3b8 !important; }
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

      // No PDF attachments — just save
      if (this.pdfAttachmentDefs.length === 0) {
        pdf.save(`BAST-${this.wo()?.nomor ?? 'dokumen'}.pdf`);
        this.isExporting.set(false);
        return;
      }

      // Fetch all PDF attachments via backend proxy endpoint (no CORS)
      const bastPdfBytes = pdf.output('arraybuffer');

      const fetchAttachments = this.pdfAttachmentDefs.map(({ label, imageId }) => {
        const proxyUrl = `${this.env.apiBaseUrl}/images/${imageId}/blob`;
        return this.http.get(proxyUrl, { responseType: 'arraybuffer' }).pipe(
          catchError((err) => {
            console.warn(`Gagal mengambil lampiran PDF "${label}":`, err);
            return of(null as ArrayBuffer | null);
          }),
        );
      });

      forkJoin(fetchAttachments)
        .pipe(
          switchMap(async (attachmentBuffers) => {
            const mergedDoc = await PDFDocument.create();

            const bastDoc = await PDFDocument.load(bastPdfBytes);
            const bastPages = await mergedDoc.copyPages(bastDoc, bastDoc.getPageIndices());
            bastPages.forEach((p) => mergedDoc.addPage(p));

            for (const buf of attachmentBuffers) {
              if (!buf) continue;
              try {
                const attachDoc = await PDFDocument.load(buf);
                const pages = await mergedDoc.copyPages(attachDoc, attachDoc.getPageIndices());
                pages.forEach((p) => mergedDoc.addPage(p));
              } catch (e) {
                console.warn('Gagal merge halaman PDF lampiran:', e);
              }
            }

            return mergedDoc.save();
          }),
        )
        .subscribe({
          next: (mergedBytes) => {
            const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BAST-${this.wo()?.nomor ?? 'dokumen'}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            this.isExporting.set(false);
          },
          error: (err) => {
            console.error('Export PDF gagal:', err);
            this.isExporting.set(false);
          },
        });
    } catch (err) {
      console.error('Export PDF gagal:', err);
      this.isExporting.set(false);
    }
  }

  protected goBack() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.router.navigate(['/work-orders', id]);
    } else {
      this.router.navigate(['/work-orders']);
    }
  }

  protected isImageUrl(url: string | undefined | null): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif')
    );
  }

  protected isPdfUrl(url: string | undefined | null): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.pdf');
  }

  protected evidenceLabelMap(kategori: string): string {
    return EVIDENCE_LABEL_MAP[kategori] ?? kategori;
  }
}
