import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { WorkOrdersState } from '@features/work-orders/state';
import { NotificationsState } from '@features/notifications/state';
import { PageHeaderComponent } from '@core/layout';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './vendor-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDashboardComponent {
  private readonly store = inject(Store);

  private readonly list = this.store.selectSignal(WorkOrdersState.list);
  protected readonly unread = this.store.selectSignal(NotificationsState.unreadCount);

  protected readonly woAktif = computed(
    () => this.list().filter((item) => ['assigned', 'received', 'in_progress'].includes(item.status)).length,
  );

  protected readonly pendingPenawaran = computed(
    () => this.list().filter((item) => ['completed', 'validated_rejected'].includes(item.status)).length,
  );

  protected readonly woSelesai = computed(
    () => this.list().filter((item) => ['validated_accepted'].includes(item.status)).length,
  );
}
