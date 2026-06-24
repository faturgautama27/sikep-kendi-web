import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state';
import { PengajuanState } from '@features/pengajuan/state';
import { DaruratState } from '@features/darurat/state';
import { LoadPengajuan } from '@features/pengajuan/state/pengajuan.actions';
import { LoadDarurat } from '@features/darurat/state/darurat.actions';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-driver-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './driver-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverHomeComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly user = this.store.selectSignal(AuthState.user);
  private readonly pengajuanList = this.store.selectSignal(PengajuanState.list);
  private readonly daruratList = this.store.selectSignal(DaruratState.list);

  protected readonly activeReports = computed(() => {
    const activePengajuan = this.pengajuanList().filter(
      p => p.status === 'draft' || p.status === 'menunggu_verifikasi' || p.status === 'terverifikasi' || p.status === 'work_order_terbuat'
    ).length;
    
    const activeDarurat = this.daruratList().filter(
      d => d.status === 'MENUNGGU_VERIFIKASI' || d.status === 'TERVERIFIKASI' || d.status === 'REIMBURSE_APPROVED'
    ).length;

    return { pengajuan: activePengajuan, darurat: activeDarurat };
  });

  protected readonly recentActivities = computed(() => {
    const pengajuan = this.pengajuanList().map(p => ({
      id: p.id,
      title: p.deskripsi ?? 'Pengajuan Servis',
      date: new Date(p.createdAt).getTime(),
      type: 'pengajuan' as const,
      status: p.status,
      route: ['/driver/riwayat', p.id]
    }));

    const darurat = this.daruratList().map(d => ({
      id: d.id,
      title: d.deskripsiDarurat ?? 'Laporan Darurat',
      date: new Date(d.createdAt).getTime(),
      type: 'darurat' as const,
      status: d.status,
      route: ['/driver/darurat', d.id]
    }));

    return [...pengajuan, ...darurat]
      .sort((a, b) => b.date - a.date)
      .slice(0, 3); // Ambil 3 teratas
  });

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Sore';
  });

  ngOnInit() {
    const userId = this.user()?.id;
    if (userId) {
      this.store.dispatch([
        new LoadPengajuan({ pengemudiId: String(userId) }), 
        new LoadDarurat({ pengemudiId: String(userId) })
      ]);
    }
  }

  protected formatDate(): string {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }
}
