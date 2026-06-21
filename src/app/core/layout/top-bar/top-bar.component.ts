import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [RouterLink, ButtonModule, PopoverModule],
  templateUrl: './top-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly notificationCount = signal(5);
  protected readonly userInitials = signal('AD');
  protected readonly userName = signal('Admin Dinas');
  protected readonly userRole = signal('Admin Sistem');

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return r.snapshot.data['title'] ?? 'SiKeP KenDI';
      }),
    ),
    { initialValue: 'Dashboard' },
  );

  protected readonly notifications = [
    { title: 'STNK B 1234 ABC akan kadaluarsa', severity: 'warning' as const, time: '2 jam lalu' },
    { title: 'Pengajuan #PG-0042 menunggu verifikasi', severity: 'info' as const, time: '4 jam lalu' },
    { title: 'Work Order WO-2026-014 perlu tindak lanjut', severity: 'warning' as const, time: 'Kemarin' },
    { title: 'Checklist harian B 5566 CD belum diisi', severity: 'critical' as const, time: 'Kemarin' },
    { title: 'Laporan darurat DRT-2026-021 menunggu verifikasi', severity: 'info' as const, time: '2 hari lalu' },
  ];

  protected toggleUserPopover(popover: Popover, event: MouseEvent): void {
    popover.toggle(event);
  }

  protected toggleNotificationPopover(popover: Popover, event: MouseEvent): void {
    popover.toggle(event);
  }
}
