import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { PageHeaderComponent } from '@core/layout';
import { WorkOrdersState } from '@features/work-orders/state';
import { NotificationsState } from '@features/notifications/state';
import { DraftChecklistState } from '@features/draft-checklist/state';
import { PenawaranState } from '@features/penawaran/state';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [RouterLink, ButtonModule, TagModule, PageHeaderComponent],
  templateUrl: './vendor-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDashboardComponent {
  private readonly store = inject(Store);

  private readonly woList = this.store.selectSignal(WorkOrdersState.list);
  protected readonly unread = this.store.selectSignal(NotificationsState.unreadCount);

  protected readonly woAktif = computed(
    () => this.woList().filter(w => ['VENDOR_DITUGASKAN', 'DRAFT_CHECKLIST', 'PENAWARAN'].includes(w.status)).length,
  );

  protected readonly woPendingDraft = computed(
    () => this.woList().filter(w => ['VENDOR_DITUGASKAN', 'DRAFT_CHECKLIST'].includes(w.status)).length,
  );

  protected readonly woPendingPenawaran = computed(
    () => this.woList().filter(w => ['PENAWARAN'].includes(w.status)).length,
  );

  protected readonly woSelesai = computed(
    () => this.woList().filter(w => ['DIVERIFIKASI', 'DIBAYAR'].includes(w.status)).length,
  );

  private readonly draftList = this.store.selectSignal(DraftChecklistState.list);
  protected readonly draftDitolak = computed(
    () => this.draftList().filter(d => d.status === 'DITOLAK').length,
  );

  private readonly penawaranList = this.store.selectSignal(PenawaranState.list);
  protected readonly penawaranRevisi = computed(
    () => this.penawaranList().filter(p => p.status === 'REVISI').length,
  );

  // Urgent WOs: draft ditolak or penawaran revisi
  protected readonly urgentCount = computed(
    () => this.draftDitolak() + this.penawaranRevisi(),
  );
}
