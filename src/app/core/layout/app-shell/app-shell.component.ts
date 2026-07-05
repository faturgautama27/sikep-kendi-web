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
import { PushService } from '@core/services/push.service';

import { SideNavComponent } from '../side-nav/side-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
  imports: [RouterOutlet, TopBarComponent, SideNavComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly pushService = inject(PushService);

  ngOnInit(): void {
    this.pushService.init();
    const roles = this.store.selectSnapshot(AuthState.roles);
    const hasRole = (...r: string[]): boolean => r.some((role) => roles.includes(role as any));

    const actions: object[] = [
      new LoadNotifications(),
      new LoadNotificationPreferences(),
    ];

    // Kendaraan, dashboard summary — pengurus_barang & pengemudi & admin
    if (hasRole('admin_sistem', 'pengurus_barang', 'pengemudi')) {
      actions.push(new LoadDashboardSummary());
      actions.push(new LoadTopDeviationVehicles());
      actions.push(new LoadVehicles());
    }

    // Vendor performance — pihak yang terlibat keuangan / penawaran
    if (hasRole('admin_sistem', 'vendor', 'bendahara')) {
      actions.push(new LoadVendorPerformance());
    }

    // Pengajuan — pengemudi mengajukan, pengurus_barang & pptk mereview
    if (hasRole('admin_sistem', 'pengurus_barang', 'pengemudi', 'pptk')) {
      actions.push(new LoadPengajuan());
    }

    // Work order — semua pihak yang terlibat alur WO
    if (hasRole('admin_sistem', 'pengurus_barang', 'vendor', 'verifikator', 'bendahara', 'pptk')) {
      actions.push(new LoadWorkOrders());
    }

    // Darurat — pengemudi melapor, pengurus_barang & pptk & verifikator mereview
    if (hasRole('admin_sistem', 'pengurus_barang', 'pengemudi', 'verifikator', 'pptk')) {
      actions.push(new LoadDarurat());
    }

    // Audit log — admin sistem saja
    if (hasRole('admin_sistem')) {
      actions.push(new LoadAuditLogs());
    }

    this.store.dispatch(actions);
  }
}
