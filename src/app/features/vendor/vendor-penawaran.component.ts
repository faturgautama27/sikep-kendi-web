import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { CreatePenawaran, PenawaranState, SubmitPenawaran } from '@features/penawaran/state';
import { PageHeaderComponent } from '@core/layout';

@Component({
  selector: 'app-vendor-penawaran',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TableModule, PageHeaderComponent],
  templateUrl: './vendor-penawaran.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPenawaranComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected totalBiaya = 0;
  protected nomorInvoice = '';

  private readonly list = this.store.selectSignal(PenawaranState.list);
  protected readonly rows = computed(() => this.list().filter((item) => item.workOrderId === this.workOrderId));

  protected buatPenawaran(): void {
    this.store.dispatch(
      new CreatePenawaran(this.workOrderId, {
        totalBiaya: Number(this.totalBiaya || 0),
        nomorInvoice: this.nomorInvoice,
      }),
    );
    this.totalBiaya = 0;
    this.nomorInvoice = '';
  }

  protected submit(id: string): void {
    this.store.dispatch(new SubmitPenawaran(id));
  }
}
