import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PageHeaderComponent } from '@core/layout';

import {
  MintaRevisiVerifikasi,
  SetujuiVerifikasi,
  SimpanShs,
  VerifikasiState,
} from '@features/verifikasi/state';

@Component({
  selector: 'app-verifikasi-work-order',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, PageHeaderComponent],
  templateUrl: './verifikasi-work-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifikasiWorkOrderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  private readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly list = this.store.selectSignal(VerifikasiState.list);

  protected hargaVendor = 0;
  protected hargaStandar = 0;
  protected readonly record = computed(
    () => this.list().find((item) => item.workOrderId === this.workOrderId) ?? null,
  );

  protected simpanShs(): void {
    this.store.dispatch(
      new SimpanShs(this.workOrderId, [
        {
          namaItem: 'Item WO',
          hargaVendor: Number(this.hargaVendor || 0),
          hargaStandart: Number(this.hargaStandar || 0),
          selisih: Number(this.hargaVendor || 0) - Number(this.hargaStandar || 0),
        },
      ]),
    );
  }

  protected setujui(): void {
    this.store.dispatch(new SetujuiVerifikasi(this.workOrderId));
  }

  protected mintaRevisi(): void {
    this.store.dispatch(new MintaRevisiVerifikasi(this.workOrderId, 'Perlu penyesuaian harga item utama.'));
  }
}
