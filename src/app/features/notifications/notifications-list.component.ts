import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { MarkAllAsRead, MarkAsRead, NotificationsState } from '@features/notifications/state';
import type { Notification } from '@shared/models';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

interface SelectOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

type ReadFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './notifications-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsListComponent {
  private readonly store = inject(Store);

  protected readonly inbox = this.store.selectSignal(NotificationsState.inbox);
  protected readonly unreadCount = this.store.selectSignal(NotificationsState.unreadCount);
  protected readonly searchQuery = signal('');
  protected readonly selectedReadFilter = signal<ReadFilter>('all');
  protected readonly selectedSeverity = signal<Notification['severity'] | 'all'>('all');

  protected readonly readFilterOptions: SelectOption<ReadFilter>[] = [
    { label: 'Semua Status', value: 'all' },
    { label: 'Belum Dibaca', value: 'unread' },
    { label: 'Sudah Dibaca', value: 'read' },
  ];

  protected readonly severityOptions: SelectOption<Notification['severity'] | 'all'>[] = [
    { label: 'Semua Severity', value: 'all' },
    { label: 'Kritis', value: 'critical' },
    { label: 'Peringatan', value: 'warning' },
    { label: 'Info', value: 'info' },
  ];

  protected readonly visibleNotifications = computed<Notification[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const readFilter = this.selectedReadFilter();
    const severity = this.selectedSeverity();

    const filtered = this.inbox().filter((n) => {
      if (readFilter === 'unread' && n.readAt !== null) return false;
      if (readFilter === 'read' && n.readAt === null) return false;
      if (severity !== 'all' && n.severity !== severity) return false;

      if (query.length > 0) {
        const haystack = `${n.title} ${n.message} ${n.entityRef ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const severityDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt > a.createdAt ? 1 : -1;
    });
  });

  protected resetFilter(): void {
    this.searchQuery.set('');
    this.selectedReadFilter.set('all');
    this.selectedSeverity.set('all');
  }

  protected onToggleDetail(notification: Notification): void {
    if (notification.readAt === null) {
      this.store.dispatch(new MarkAsRead(notification.id));
    }
  }

  protected markAllRead(): void {
    this.store.dispatch(new MarkAllAsRead());
  }

  protected severityLabel(severity: Notification['severity']): string {
    switch (severity) {
      case 'critical':
        return 'Kritis';
      case 'warning':
        return 'Peringatan';
      default:
        return 'Info';
    }
  }

  protected severityTagSeverity(
    severity: Notification['severity'],
  ): 'danger' | 'warn' | 'info' {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warn';
      default:
        return 'info';
    }
  }

  protected severityIcon(severity: Notification['severity']): string {
    switch (severity) {
      case 'critical':
        return 'pi pi-exclamation-circle';
      case 'warning':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-info-circle';
    }
  }

  protected severityClass(severity: Notification['severity']): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  }

  protected timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Kemarin';
    return `${days} hari lalu`;
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected truncate(value: string, max = 80): string {
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }
}
