import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { filter, map } from 'rxjs/operators';

const DRIVER_TABS = [
  { route: '/driver', label: 'Beranda', icon: 'pi pi-home' },
  { route: '/driver/notifications', label: 'Notifikasi', icon: 'pi pi-bell' },
] as const;

const ROUTE_TITLES: Record<string, { title: string; subtitle: string; color: string }> = {
  '/driver': { title: 'Beranda', subtitle: 'Selamat datang, Pengemudi', color: 'from-primary-600 to-primary-700' },
  '/driver/notifications': { title: 'Notifikasi', subtitle: 'Pesan & peringatan', color: 'from-slate-700 to-slate-800' },
};

@Component({
  selector: 'app-driver-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen flex-col overflow-hidden bg-slate-50">

      <!-- Sticky header — hidden on /driver (beranda has its own hero) -->
      @if (!isHome()) {
        <div class="flex-shrink-0 sticky top-0 z-30 px-5 pt-6 pb-4 shadow-sm"
          [class]="'bg-gradient-to-br ' + currentMeta().color">
          <h1 class="text-lg font-extrabold text-white">{{ currentMeta().title }}</h1>
          <p class="text-[12px] text-white/60 mt-0.5">{{ currentMeta().subtitle }}</p>
        </div>
      }

      <!-- Scrollable content -->
      <main class="flex-1 overflow-y-auto">
        <router-outlet />
      </main>

      <!-- Bottom nav -->
      <nav class="flex-shrink-0 flex border-t border-slate-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        @for (tab of tabs; track tab.route) {
          <a [routerLink]="tab.route"
            routerLinkActive="text-primary-600"
            [routerLinkActiveOptions]="{ exact: tab.route === '/driver' }"
            class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-slate-400 transition-colors hover:text-primary-500">
            <i [class]="tab.icon + ' text-xl'"></i>
            <span class="text-[10px] font-medium leading-none">{{ tab.label }}</span>
          </a>
        }
      </nav>
    </div>
  `,
})
export class DriverShellComponent {
  private readonly router = inject(Router);

  protected readonly tabs = DRIVER_TABS;

  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isHome = () => this.currentUrl() === '/driver';

  protected readonly currentMeta = () =>
    ROUTE_TITLES[this.currentUrl()] ?? ROUTE_TITLES['/driver'];
}
