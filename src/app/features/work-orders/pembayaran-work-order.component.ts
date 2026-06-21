import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PageHeaderComponent } from '@core/layout';

import {
  PembayaranState,
  ProsesPembayaran,
  UploadBuktiTransfer,
} from '@features/pembayaran/state';

@Component({
  selector: 'app-pembayaran-work-order',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, PageHeaderComponent],
  templateUrl: './pembayaran-work-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PembayaranWorkOrderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  private readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly list = this.store.selectSignal(PembayaranState.list);

  protected metodePembayaran = 'Transfer Bank';
  protected totalDibayar = 0;
  protected buktiTransferId = '';

  protected readonly record = computed(
    () => this.list().find((item) => item.workOrderId === this.workOrderId) ?? null,
  );

  protected proses(): void {
    this.store.dispatch(
      new ProsesPembayaran(this.workOrderId, {
        metodePembayaran: this.metodePembayaran,
        totalDibayar: Number(this.totalDibayar || 0),
        tanggalPembayaran: new Date().toISOString(),
      }),
    );
  }

  protected uploadBukti(): void {
    this.store.dispatch(
      new UploadBuktiTransfer(this.workOrderId, {
        buktiTransferId: this.buktiTransferId || `img-bukti-${Date.now()}`,
      }),
    );
  }
}
