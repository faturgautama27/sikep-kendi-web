import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';

import { ChecklistExecutionsState } from '@features/checklist/state';
import type { ChecklistExecution } from '@shared/models';

type FilterOption = 'today' | 'week' | 'all';

@Component({
  selector: 'app-driver-checklist-history',
  standalone: true,
  imports: [],
  templateUrl: './driver-checklist-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverChecklistHistoryComponent {
  private readonly store = inject(Store);

  protected readonly allExecutions = this.store.selectSignal(ChecklistExecutionsState.list);
  protected readonly activeFilter = signal<FilterOption>('week');

  protected readonly filtered = computed<ChecklistExecution[]>(() => {
    const filter = this.activeFilter();
    const now = new Date();
    const executions = [...this.allExecutions()].sort(
      (a, b) => (b.startedAt > a.startedAt ? 1 : -1)
    );

    switch (filter) {
      case 'today': {
        const today = now.toDateString();
        return executions.filter(e => new Date(e.startedAt).toDateString() === today);
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return executions.filter(e => new Date(e.startedAt) >= weekAgo);
      }
      default:
        return executions;
    }
  });

  protected setFilter(filter: FilterOption): void {
    this.activeFilter.set(filter);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  protected readonly filters: { key: FilterOption; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: 'week', label: '7 Hari' },
    { key: 'all', label: 'Semua' },
  ];
}
