import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { APP_ENV } from '@core/data-access/app-env.token';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface SignatureSetting {
  id: number;
  kodeJabatan: 'PENGURUS_BARANG' | 'PPTK' | 'KASUBBAG_UMUM' | 'KEPALA_DINAS';
  namaLengkap: string;
  nik: string;
  isAktif: boolean;
}

function mapSignatureSetting(raw: any): SignatureSetting {
  return {
    id: Number(raw?.id ?? 0),
    kodeJabatan: raw?.kodeJabatan ?? raw?.kode_jabatan,
    namaLengkap: raw?.namaLengkap ?? raw?.nama_lengkap ?? '-',
    nik: raw?.nik ?? '-',
    isAktif: Boolean(raw?.isAktif ?? raw?.is_aktif ?? true),
  };
}

const DEFAULT_SIGNATURE_SETTINGS: SignatureSetting[] = [
  { id: 0, kodeJabatan: 'PENGURUS_BARANG', namaLengkap: '-', nik: '-', isAktif: true },
  { id: 0, kodeJabatan: 'PPTK', namaLengkap: '-', nik: '-', isAktif: true },
  { id: 0, kodeJabatan: 'KASUBBAG_UMUM', namaLengkap: '-', nik: '-', isAktif: true },
  { id: 0, kodeJabatan: 'KEPALA_DINAS', namaLengkap: '-', nik: '-', isAktif: true },
];

@Component({
  selector: 'app-signature-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule, ToastModule, ProgressSpinnerModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <div class="flex flex-col gap-5">
      <header>
        <h2 class="text-xl font-bold text-primary-900">Konfigurasi Tanda Tangan</h2>
        <p class="text-sm text-slate-500">Kelola nama lengkap dan NIK pejabat untuk seluruh dokumen cetak.</p>
      </header>

      @if (loading()) {
        <div class="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-16">
          <p-progressSpinner strokeWidth="4" ariaLabel="loading" />
        </div>
      } @else if (error()) {
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      } @else {
        <p class="text-xs text-slate-500">{{ settings().length }} jabatan siap dikonfigurasi.</p>
        <div class="grid gap-4 md:grid-cols-2">
          @for (item of settings(); track item.kodeJabatan) {
            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 text-base font-semibold text-slate-800">{{ label(item.kodeJabatan) }}</div>
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-medium">Nama Lengkap</label>
                  <input
                    pInputText
                    [ngModel]="item.namaLengkap"
                    (ngModelChange)="patchItem(item.kodeJabatan, 'namaLengkap', $event)"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-medium">NIK</label>
                  <input
                    pInputText
                    [ngModel]="item.nik"
                    (ngModelChange)="patchItem(item.kodeJabatan, 'nik', $event)"
                  />
                </div>
                <div class="flex justify-end">
                  <p-button label="Simpan" icon="pi pi-save" [loading]="saving() === item.kodeJabatan" (onClick)="save(item)"></p-button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SignatureSettingsComponent {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private readonly msg = inject(MessageService);

  protected readonly settings = signal<SignatureSetting[]>([...DEFAULT_SIGNATURE_SETTINGS]);
  protected readonly saving = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.http.get<any>(`${this.env.apiBaseUrl}/signature-settings`).subscribe({
      next: (res) => {
        // responseUnwrapperInterceptor sudah membongkar envelope {success,data}
        // sehingga `res` bisa berupa array langsung, atau tetap {data:[...]} di fallback.
        const raw = Array.isArray(res) ? res : (res?.data ?? []);
        const rows = (raw as any[]).map(mapSignatureSetting);
        const mapped = DEFAULT_SIGNATURE_SETTINGS.map((def) => {
          const hit = rows.find((r) => r.kodeJabatan === def.kodeJabatan);
          return hit ? { ...def, ...hit } : def;
        });
        this.settings.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Gagal memuat konfigurasi tanda tangan.');
        this.loading.set(false);
      },
    });
  }

  protected label(kode: SignatureSetting['kodeJabatan']): string {
    return {
      PENGURUS_BARANG: 'Pengurus Barang',
      PPTK: 'Pejabat Pelaksana Teknis Kegiatan',
      KASUBBAG_UMUM: 'Kasubbag Umum',
      KEPALA_DINAS: 'Kepala Dinas',
    }[kode];
  }

  protected patchItem(
    kodeJabatan: SignatureSetting['kodeJabatan'],
    field: 'namaLengkap' | 'nik',
    value: string,
  ) {
    this.settings.update((list) =>
      list.map((item) => (item.kodeJabatan === kodeJabatan ? { ...item, [field]: value } : item)),
    );
  }

  protected save(item: SignatureSetting) {
    this.saving.set(item.kodeJabatan);
    this.http.patch<any>(`${this.env.apiBaseUrl}/signature-settings/${item.kodeJabatan}`, {
      namaLengkap: item.namaLengkap,
      nik: item.nik,
      isAktif: item.isAktif,
    }).subscribe({
      next: (res) => {
        // res sudah di-unwrap oleh interceptor: bisa objek row langsung atau {data:[...]}
        const updated = mapSignatureSetting(Array.isArray(res) ? res[0] : (res?.data ?? res));
        this.settings.update((list) => list.map((x) => x.kodeJabatan === updated.kodeJabatan ? updated : x));
        this.msg.add({ severity: 'success', summary: 'Tersimpan' });
        this.saving.set(null);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Gagal menyimpan', detail: err?.error?.message ?? 'Terjadi kesalahan.' });
        this.saving.set(null);
      }
    });
  }
}
