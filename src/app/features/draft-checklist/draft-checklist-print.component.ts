import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { APP_ENV } from '@core/data-access/app-env.token';

interface PrintDraftItem {
  urutan: number;
  uraian: string;
  qty: number;
  harga: number;
  diskon: number;
  subTotal: number;
}

interface PrintDraft {
  id: string;
  versi: number;
  status: string;
  totalHarga: number;
  createdAt: string;
  scanDraftImageUrl?: string | null;
  items: PrintDraftItem[];
  workOrder?: {
    nomorWo: string;
    vendor?: { namaVendor: string };
    pengajuan?: {
      createdAt?: string;
      odometerSaatPengajuan?: number;
      deskripsiKerusakan?: string;
      kendaraan?: { merk?: string; model?: string; nomorPolisi?: string };
      pengemudi?: { fullName?: string };
    };
  };
}

@Component({
  selector: 'app-draft-checklist-print',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="flex h-screen items-center justify-center">
        <p class="text-slate-500">Memuat data...</p>
      </div>
    } @else if (error()) {
      <div class="flex h-screen items-center justify-center">
        <p class="text-red-500">{{ error() }}</p>
      </div>
    } @else if (draft(); as d) {
      <div class="print-page mx-auto max-w-[800px] bg-white p-8 font-sans text-sm text-slate-800">

        <!-- Header instansi -->
        <div class="mb-6 border-b-2 border-slate-800 pb-4 text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Pemerintah Daerah</p>
          <h1 class="mt-1 text-lg font-bold uppercase tracking-wide">DRAFT CHECKLIST PEMELIHARAAN KENDARAAN</h1>
          <p class="mt-0.5 text-xs text-slate-500">Dokumen internal — tidak untuk peredaran umum</p>
        </div>

        <!-- Info WO + Kendaraan -->
        <div class="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Nomor WO</span>
            <span class="font-semibold">{{ d.workOrder?.nomorWo ?? '-' }}</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Versi Draft</span>
            <span class="font-semibold">v{{ d.versi }}</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Kendaraan</span>
            <span class="font-semibold">
              {{ d.workOrder?.pengajuan?.kendaraan?.merk ?? '' }}
              {{ d.workOrder?.pengajuan?.kendaraan?.model ?? '' }} —
              {{ d.workOrder?.pengajuan?.kendaraan?.nomorPolisi ?? '-' }}
            </span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Odometer</span>
            <span class="font-semibold">{{ (d.workOrder?.pengajuan?.odometerSaatPengajuan ?? 0) | number }} km</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Pengemudi</span>
            <span class="font-semibold">{{ d.workOrder?.pengajuan?.pengemudi?.fullName ?? '-' }}</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Tanggal Pengajuan</span>
            <span class="font-semibold">{{ formatDate(d.workOrder?.pengajuan?.createdAt) }}</span>
          </div>
          <div class="col-span-2 flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Keluhan</span>
            <span class="font-semibold text-right ml-4">{{ d.workOrder?.pengajuan?.deskripsiKerusakan ?? '-' }}</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Vendor</span>
            <span class="font-semibold">{{ d.workOrder?.vendor?.namaVendor ?? '-' }}</span>
          </div>
          <div class="flex justify-between border-b border-dashed border-slate-200 py-1">
            <span class="text-slate-500">Tanggal Draft</span>
            <span class="font-semibold">{{ formatDate(d.createdAt) }}</span>
          </div>
        </div>

        <!-- Item table -->
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100">
              <th class="border border-slate-300 px-2 py-2 text-center w-8">No</th>
              <th class="border border-slate-300 px-2 py-2 text-left">Uraian Pekerjaan / Sparepart</th>
              <th class="border border-slate-300 px-2 py-2 text-right w-16">Qty</th>
              <th class="border border-slate-300 px-2 py-2 text-right w-28">Harga Satuan</th>
              <th class="border border-slate-300 px-2 py-2 text-right w-16">Diskon</th>
              <th class="border border-slate-300 px-2 py-2 text-right w-28">Sub Total</th>
            </tr>
          </thead>
          <tbody>
            @for (item of d.items; track item.urutan; let i = $index) {
              <tr class="{{ i % 2 === 0 ? '' : 'bg-slate-50' }}">
                <td class="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{{ item.urutan }}</td>
                <td class="border border-slate-200 px-2 py-1.5">{{ item.uraian || '—' }}</td>
                <td class="border border-slate-200 px-2 py-1.5 text-right">{{ item.qty }}</td>
                <td class="border border-slate-200 px-2 py-1.5 text-right">{{ formatRupiah(item.harga) }}</td>
                <td class="border border-slate-200 px-2 py-1.5 text-right">{{ item.diskon }}%</td>
                <td class="border border-slate-200 px-2 py-1.5 text-right font-semibold">{{ formatRupiah(item.subTotal) }}</td>
              </tr>
            }
            @if (!d.items.length) {
              <tr>
                <td colspan="6" class="border border-slate-200 py-4 text-center text-slate-400">Tidak ada item.</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="bg-slate-100 font-bold">
              <td colspan="5" class="border border-slate-300 px-2 py-2 text-right">TOTAL</td>
              <td class="border border-slate-300 px-2 py-2 text-right">{{ formatRupiah(d.totalHarga) }}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Signature block -->
        <div class="mt-10 grid grid-cols-2 gap-8">
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-slate-600">Dibuat oleh Vendor,</p>
            <p class="text-xs text-slate-500">{{ d.workOrder?.vendor?.namaVendor ?? '_______________' }}</p>
            <div class="mt-16 border-t border-slate-400 pt-1">
              <p class="text-xs text-slate-500">Tanda tangan &amp; stempel</p>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-slate-600">Diketahui oleh Pengurus Barang,</p>
            <p class="text-xs text-slate-500">_______________</p>
            <div class="mt-16 border-t border-slate-400 pt-1">
              <p class="text-xs text-slate-500">Tanda tangan &amp; stempel</p>
            </div>
          </div>
        </div>

        <!-- Print note -->
        <p class="mt-6 text-center text-[10px] text-slate-400">
          Dicetak pada {{ printedAt }} · Draft v{{ d.versi }} · {{ d.workOrder?.nomorWo }}
        </p>
      </div>
    }
  `,
  styles: [`
    @media print {
      :host { display: block; }
      .print-page { max-width: 100% !important; padding: 10mm !important; }
    }
  `],
})
export class DraftChecklistPrintComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private readonly woId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly draftId = this.route.snapshot.paramMap.get('draftId') ?? '';

  protected readonly draft = signal<PrintDraft | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly printedAt = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  ngOnInit(): void {
    this.http
      .get<any>(`${this.env.apiBaseUrl}/draft-checklist/${this.draftId}`)
      .subscribe({
        next: (res) => {
          const raw = res?.data ?? res;
          // Also fetch WO detail for header info
          this.http
            .get<any>(`${this.env.apiBaseUrl}/work-orders/${this.woId}`)
            .subscribe({
              next: (woRes) => {
                const wo = woRes?.data ?? woRes;
                this.draft.set({
                  id: String(raw.id),
                  versi: raw.versi,
                  status: raw.status,
                  totalHarga: Number(raw.totalHarga),
                  createdAt: raw.createdAt,
                  scanDraftImageUrl: raw.scanDraftImageUrl ?? null,
                  items: (raw.items ?? []).map((item: any, i: number) => ({
                    urutan: item.urutan ?? i + 1,
                    uraian: item.uraian ?? item.namaKerusakan ?? '-',
                    qty: Number(item.qty ?? 1),
                    harga: Number(item.harga ?? item.hargaItem ?? 0),
                    diskon: Number(item.diskon ?? 0),
                    subTotal: Number(item.subTotal ?? item.hargaItem ?? 0),
                  })),
                  workOrder: {
                    nomorWo: wo.nomorWo ?? wo.nomor,
                    vendor: wo.vendor,
                    pengajuan: wo.pengajuan,
                  },
                });
                this.loading.set(false);
                // Auto-print setelah render
                setTimeout(() => window.print(), 500);
              },
              error: () => {
                // WO detail gagal — tetap tampilkan tanpa header WO
                this.draft.set({
                  id: String(raw.id),
                  versi: raw.versi,
                  status: raw.status,
                  totalHarga: Number(raw.totalHarga),
                  createdAt: raw.createdAt,
                  scanDraftImageUrl: raw.scanDraftImageUrl ?? null,
                  items: (raw.items ?? []).map((item: any, i: number) => ({
                    urutan: item.urutan ?? i + 1,
                    uraian: item.uraian ?? item.namaKerusakan ?? '-',
                    qty: Number(item.qty ?? 1),
                    harga: Number(item.harga ?? item.hargaItem ?? 0),
                    diskon: Number(item.diskon ?? 0),
                    subTotal: Number(item.subTotal ?? item.hargaItem ?? 0),
                  })),
                });
                this.loading.set(false);
                setTimeout(() => window.print(), 500);
              },
            });
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Gagal memuat data draft.');
        },
      });
  }

  protected formatDate(val?: string): string {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  protected formatRupiah(n: number | string): string {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(val || 0);
  }
}
