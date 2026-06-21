import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngxs/store';

import { NotificationsState } from '@features/notifications/state';
import { MarkAsRead, MarkAllAsRead } from '@features/notifications/state';
import type { Notification } from '@shared/models';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

@Component({
  selector: 'app-driver-notifications',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './driver-notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverNotificationsComponent {
  private readonly store = inject(Store);

  protected readonly inbox = this.store.selectSignal(NotificationsState.inbox);
  protected readonly unreadCount = this.store.selectSignal(NotificationsState.unreadCount);

  protected readonly sorted = computed<Notification[]>(() =>
    [...this.inbox()].sort((a, b) => {
      const severityDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt > a.createdAt ? 1 : -1;
    })
  );

  protected readonly expandedIds = signal<Set<string>>(new Set());

  protected toggleExpand(id: string): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        this.store.dispatch(new MarkAsRead(id));
      }
      return next;
    });
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected markAllRead(): void {
    this.store.dispatch(new MarkAllAsRead());
  }

  protected getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'pi pi-exclamation-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      default: return 'pi pi-info-circle';
    }
  }

  protected getSeverityIconColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  }

  protected getSeverityBg(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      default: return 'bg-blue-50';
    }
  }

  protected getSeverityBadge(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  }

  protected getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': return 'Kritis';
      case 'warning': return 'Peringatan';
      default: return 'Info';
    }
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} jam lalu`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
}
