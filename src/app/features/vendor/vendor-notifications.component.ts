import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@core/layout';
import { NotificationsState, MarkAsRead, MarkAllAsRead } from '@features/notifications/state';
import type { Notification } from '@shared/models';

@Component({ selector: 'app-vendor-notifications', standalone: true,
  imports: [FormsModule, ButtonModule, SelectButtonModule, TableModule, TagModule, TooltipModule, PageHeaderComponent],
  templateUrl: './vendor-notifications.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorNotificationsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  private readonly inbox = this.store.selectSignal(NotificationsState.inbox);
  protected readonly unreadCount = this.store.selectSignal(NotificationsState.unreadCount);

  protected readonly filterOpts = [
    { label: 'Semua', value: 'all' },
    { label: 'Belum Dibaca', value: 'unread' },
  ];
  protected readonly filter = signal<'all' | 'unread'>('all');

  protected readonly rows = computed<Notification[]>(() => {
    const all = this.inbox();
    return this.filter() === 'unread' ? all.filter(n => !n.readAt) : all;
  });

  protected markRead(n: Notification): void {
    if (!n.readAt) this.store.dispatch(new MarkAsRead(n.id));
    if (n.link) this.router.navigateByUrl(n.link);
  }

  protected markAllRead(): void {
    this.store.dispatch(new MarkAllAsRead());
  }

  protected severityClass(s: string): string {
    const m: Record<string, string> = { critical: 'text-red-600', warning: 'text-orange-500', info: 'text-blue-600' };
    return m[s] ?? 'text-slate-500';
  }

  protected severityIcon(s: string): string {
    const m: Record<string, string> = { critical: 'pi-exclamation-triangle', warning: 'pi-exclamation-circle', info: 'pi-info-circle' };
    return `pi ${m[s] ?? 'pi-bell'}`;
  }

  protected formatDate(ts: string): string {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  }
}
