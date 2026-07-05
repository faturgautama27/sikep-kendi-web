import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { CommonModule } from '@angular/common';

import { AuthState } from '@features/login/state';
import { NotificationsState, MarkAllAsRead } from '@features/notifications/state';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, PopoverModule],
  templateUrl: './top-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  private readonly user = this.store.selectSignal(AuthState.user);
  private readonly inbox = this.store.selectSignal(NotificationsState.inbox);

  protected readonly notificationCount = this.store.selectSignal(NotificationsState.unreadCount);

  protected readonly notifications = computed(() =>
    this.inbox()
      .filter((n) => n.readAt === null)
      .slice(0, 5),
  );

  protected readonly userName = computed(() => this.user()?.fullName ?? '—');

  /** Raw role value — used for template comparisons like === 'admin_sistem' */
  protected readonly userRole = computed(() => this.user()?.roles[0] ?? '');

  protected readonly userInitials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

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

  protected toggleUserPopover(popover: Popover, event: MouseEvent): void {
    popover.toggle(event);
  }

  protected toggleNotificationPopover(popover: Popover, event: MouseEvent): void {
    popover.toggle(event);
  }

  protected markAllAsRead(popover: Popover): void {
    this.store.dispatch(new MarkAllAsRead());
    popover.hide();
  }

  protected timeAgo(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Kemarin';
    return `${days} hari lalu`;
  }
}
