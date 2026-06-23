import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state';
import { LoadDashboardSummary, LoadTopDeviationVehicles, LoadVendorPerformance } from '@features/dashboard/state';
import { LoadWorkOrders } from '@features/work-orders/state';
import { LoadPengajuan } from '@features/pengajuan/state';
import { LoadDarurat } from '@features/darurat/state';
import { LoadVehicles } from '@features/vehicles/state';
import { LoadAuditLogs } from '@features/audit/state';
import { LoadNotifications, LoadNotificationPreferences } from '@features/notifications/state';

import { SideNavComponent } from '../side-nav/side-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';

/**
 * AppShell: layout root SiKeP KenDI yang membungkus halaman authenticated.
 *
 * Layout:
 * - `TopBar` (header) — logo, brand, tagline, notifikasi, user menu
 * - `SideNav` (sidebar kiri) — daftar navigasi utama
 * - `<main>` — slot `router-outlet` untuk halaman fitur
 *
 * Phase 1: dipakai sebagai komponen root di `app.html` agar setiap route
 * di `app.routes.ts` ter-render di dalam shell. Pada Phase 1 ini login flow
 * belum ada, jadi shell langsung tampil saat aplikasi dimuat.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent, SideNavComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent implements OnInit {
  private readonly store = inject(Store);

  ngOnInit(): void {
    const permissions = this.store.selectSnapshot(AuthState.permissions);
    const has = (permission: string): boolean =>
      permissions.includes('*') || permissions.includes(permission);

    const actions: object[] = [
      new LoadNotifications(),
      new LoadNotificationPreferences(),
    ];

    if (has('kendaraan.read')) {
      actions.push(new LoadDashboardSummary());
      actions.push(new LoadTopDeviationVehicles());
      actions.push(new LoadVehicles());
    }
    
    if (has('penawaran.read')) {
      actions.push(new LoadVendorPerformance());
    }

    if (has('pengajuan.read')) actions.push(new LoadPengajuan());
    if (has('work_order.read')) actions.push(new LoadWorkOrders());
    if (has('darurat.read')) actions.push(new LoadDarurat());
    if (has('audit_log.read')) actions.push(new LoadAuditLogs());

    if (actions.length > 0) {
      this.store.dispatch(actions);
    }
  }
}
