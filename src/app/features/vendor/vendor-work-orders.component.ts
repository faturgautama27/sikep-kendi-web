import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { TableModule } from 'primeng/table';

import { WorkOrdersState } from '@features/work-orders/state';
import { PageHeaderComponent } from '@core/layout';
import type { WorkOrder } from '@shared/models';

type VendorView = 'notifikasi' | 'draft' | 'penawaran' | 'riwayat';

@Component({
  selector: 'app-vendor-work-orders',
  standalone: true,
  imports: [RouterLink, TableModule, PageHeaderComponent],
  templateUrl: './vendor-work-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorWorkOrdersComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly allRows = this.store.selectSignal(WorkOrdersState.list);
  private readonly currentView =
    (this.route.snapshot.data['vendorView'] as VendorView | undefined) ?? 'notifikasi';

  protected readonly headerTitle = computed(() => {
    switch (this.currentView) {
      case 'draft':
        return 'Portal Vendor - Draft Checklist';
      case 'penawaran':
        return 'Portal Vendor - Penawaran & Invoice';
      case 'riwayat':
        return 'Portal Vendor - Riwayat';
      default:
        return 'Portal Vendor - Notifikasi WO';
    }
  });

  protected readonly headerSubtitle = computed(() => {
    switch (this.currentView) {
      case 'draft':
        return 'Daftar WO yang siap diproses draft checklist oleh vendor.';
      case 'penawaran':
        return 'Daftar WO yang membutuhkan penawaran dan invoice vendor.';
      case 'riwayat':
        return 'Riwayat WO vendor yang sudah selesai atau tervalidasi.';
      default:
        return 'Daftar WO yang ditugaskan untuk ditindaklanjuti vendor.';
    }
  });

  protected readonly rows = computed(() => {
    const rows = this.allRows();
    return rows.filter((row) => this.matchByView(row, this.currentView));
  });

  private matchByView(row: WorkOrder, view: VendorView): boolean {
    switch (view) {
      case 'draft':
        return ['assigned', 'received'].includes(row.status);
      case 'penawaran':
        return ['in_progress', 'completed', 'validated_rejected'].includes(row.status);
      case 'riwayat':
        return ['validated_accepted', 'validated_rejected'].includes(row.status);
      case 'notifikasi':
      default:
        return ['assigned', 'received', 'in_progress'].includes(row.status);
    }
  }
}
