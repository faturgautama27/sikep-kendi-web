import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
      <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600">
        <i class="pi pi-search text-4xl"></i>
      </div>
      <div>
        <h1 class="text-3xl font-bold text-slate-800">404 — Halaman Tidak Ditemukan</h1>
        <p class="mt-2 text-slate-500">Halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>
      </div>
      <p-button label="Kembali ke Dashboard" icon="pi pi-home" routerLink="/dashboard"
        severity="primary"></p-button>
    </div>
  `,
})
export class NotFoundComponent {}
