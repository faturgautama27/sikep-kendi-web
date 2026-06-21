import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { TabsModule } from 'primeng/tabs';

interface AdminTab {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

const ADMIN_TABS: readonly AdminTab[] = [
  { key: 'users', label: 'Users', icon: 'pi pi-users', route: '/admin/users' },
  { key: 'roles', label: 'Roles', icon: 'pi pi-id-card', route: '/admin/roles' },
  {
    key: 'approval-policies',
    label: 'Approval Policies',
    icon: 'pi pi-sitemap',
    route: '/admin/approval-policies',
  },
  {
    key: 'notification-thresholds',
    label: 'Notification Thresholds',
    icon: 'pi pi-bell',
    route: '/admin/notification-thresholds',
  },
];

/**
 * SiKeP KenDI — Admin shell.
 *
 * Layout parent untuk halaman admin (`/admin/*`). Menampilkan tab navigasi
 * di atas dengan `routerLink` ke masing-masing sub-route, serta
 * `<router-outlet>` di bawah untuk render child component.
 *
 * Tab aktif diturunkan dari URL aktif sehingga refresh halaman tetap
 * menampilkan tab yang benar.
 *
 * Phase 1: filtering berdasarkan role admin_sistem dilakukan di task 7.x
 * (`PermissionGuard`).
 *
 * Referensi: Requirement 16.6 (admin pages).
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, RouterOutlet, TabsModule],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly router = inject(Router);

  protected readonly tabs = ADMIN_TABS;

  /** Aktif tab key dari URL. Update saat NavigationEnd. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeTab = computed<string>(() => {
    const url = this.currentUrl();
    const match = ADMIN_TABS.find((t) => url.startsWith(t.route));
    return match?.key ?? 'users';
  });
}
