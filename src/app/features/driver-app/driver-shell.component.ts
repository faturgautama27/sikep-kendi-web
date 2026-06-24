import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { Location } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { trigger, transition, style, animate, query } from '@angular/animations';

const DRIVER_TABS = [
  { route: '/driver', label: 'Beranda', icon: 'pi pi-home' },
  { route: '/driver/darurat', label: 'Darurat', icon: 'pi pi-exclamation-triangle' },
  { route: '/driver/riwayat', label: 'Servis', icon: 'pi pi-wrench' },
  { route: '/driver/notifications', label: 'Notifikasi', icon: 'pi pi-bell' },
] as const;

const ROUTE_TITLES: Record<string, { title: string; subtitle: string; color: string }> = {
  '/driver': { title: 'Beranda', subtitle: 'Selamat datang, Pengemudi', color: 'from-blue-600 to-indigo-700' },
  '/driver/notifications': { title: 'Notifikasi', subtitle: 'Pesan & peringatan', color: 'from-slate-700 to-slate-800' },
  '/driver/pengajuan/new': { title: 'Ajukan Servis', subtitle: 'Laporan pemeliharaan rutin', color: 'from-blue-600 to-blue-700' },
  '/driver/darurat/new': { title: 'Lapor Darurat', subtitle: 'Penanganan instan di lapangan', color: 'from-red-600 to-red-700' },
  '/driver/riwayat': { title: 'Riwayat Pengajuan', subtitle: 'Pantau status servis Anda', color: 'from-slate-700 to-slate-800' },
  '/driver/darurat': { title: 'Laporan Darurat', subtitle: 'Daftar riwayat keadaan darurat', color: 'from-red-600 to-red-700' },
};

@Component({
  selector: 'app-driver-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('routeTransition', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="flex h-screen flex-col overflow-hidden bg-slate-50">

      <!-- Sticky header — only show on main tabs except home -->
      @if (showStickyHeader()) {
        <div class="flex-shrink-0 sticky top-0 z-30 px-5 pt-6 pb-4 shadow-sm flex items-center gap-3"
          [class]="'bg-gradient-to-br ' + currentMeta().color">
          @if (!isRootTab()) {
            <button (click)="goBack()" class="flex items-center justify-center text-white/90 hover:text-white transition-colors p-1 -ml-2 rounded-full active:bg-white/10">
              <i class="pi pi-arrow-left text-xl"></i>
            </button>
          }
          <div>
            <h1 class="text-lg font-extrabold text-white">{{ currentMeta().title }}</h1>
            <p class="text-[12px] text-white/60 mt-0.5">{{ currentMeta().subtitle }}</p>
          </div>
        </div>
      }

      <!-- Scrollable content -->
      <main class="flex-1 overflow-y-auto" [@routeTransition]="currentUrl()">
        <router-outlet />
      </main>

      <!-- Bottom nav -->
      @if (showBottomNav()) {
        <nav class="flex-shrink-0 flex border-t border-slate-200 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)] pb-1">
          @for (tab of tabs; track tab.route) {
            <a [routerLink]="tab.route"
              routerLinkActive="text-blue-600"
              [routerLinkActiveOptions]="{ exact: tab.route === '/driver' }"
              class="relative flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-2 text-slate-400 transition-all hover:text-blue-500">
              
              <div class="relative flex items-center justify-center h-8">
                <i [class]="tab.icon + ' text-[30px] transition-transform duration-300'"></i>
              </div>
              <span class="text-[10px] font-semibold tracking-wide">{{ tab.label }}</span>
            </a>
          }
        </nav>
      }
    </div>
  `,
})
export class DriverShellComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly tabs = DRIVER_TABS;

  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isHome = () => this.currentUrl() === '/driver';

  protected readonly isRootTab = () => {
    const url = this.currentUrl();
    return url === '/driver' || url === '/driver/darurat' || url === '/driver/riwayat' || url === '/driver/notifications';
  };

  protected readonly showBottomNav = () => true;

  protected readonly showStickyHeader = () => {
    return !this.isHome();
  };

  protected goBack(): void {
    this.location.back();
  }

  protected readonly currentMeta = () => {
    const url = this.currentUrl();
    if (url.includes('/new')) {
      if (url.includes('pengajuan')) return { title: 'Ajukan Servis', subtitle: 'Laporan pemeliharaan rutin', color: 'from-blue-600 to-blue-700' };
      if (url.includes('darurat')) return { title: 'Lapor Darurat', subtitle: 'Penanganan instan di lapangan', color: 'from-red-600 to-red-700' };
    }
    if (url.includes('/edit')) {
      if (url.includes('pengajuan')) return { title: 'Edit Pengajuan', subtitle: 'Perbarui data pengajuan pemeliharaan', color: 'from-blue-600 to-blue-700' };
      if (url.includes('darurat')) return { title: 'Edit Laporan', subtitle: 'Perbarui laporan darurat', color: 'from-red-600 to-red-700' };
    }
    if (url.match(/\/\d+$/) !== null) {
      if (url.includes('riwayat')) return { title: 'Detail Servis', subtitle: 'Rincian pengajuan pemeliharaan', color: 'from-slate-700 to-slate-800' };
      if (url.includes('darurat')) return { title: 'Detail Laporan', subtitle: 'Rincian laporan darurat', color: 'from-red-600 to-red-700' };
    }
    return ROUTE_TITLES[url] ?? ROUTE_TITLES['/driver'];
  };
}
