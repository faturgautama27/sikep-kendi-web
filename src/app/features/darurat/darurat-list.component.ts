import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PageHeaderComponent } from '@core/layout';

import {
  ApproveReimburseDarurat,
  DaruratState,
  VerifikasiDarurat,
} from './state';

@Component({
  selector: 'app-darurat-list',
  standalone: true,
  imports: [RouterLink, ButtonModule, TableModule, PageHeaderComponent],
  templateUrl: './darurat-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratListComponent {
  private readonly store = inject(Store);
  private readonly list = this.store.selectSignal(DaruratState.list);

  protected readonly rows = computed(() => this.list());

  protected verifikasi(id: string, accepted: boolean): void {
    this.store.dispatch(new VerifikasiDarurat(id, accepted, accepted ? 'Laporan valid' : 'Data belum lengkap'));
  }

  protected approveReimburse(id: string): void {
    this.store.dispatch(new ApproveReimburseDarurat(id));
  }
}
