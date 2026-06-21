import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SideNavComponent } from '../side-nav/side-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';

/**
 * AppShell: layout root ARMADIN yang membungkus halaman authenticated.
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
export class AppShellComponent {}
