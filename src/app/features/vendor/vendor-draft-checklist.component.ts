import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { CreateDraftChecklist, DraftChecklistState, SubmitDraft } from '@features/draft-checklist/state';
import { PageHeaderComponent } from '@core/layout';

@Component({
  selector: 'app-vendor-draft-checklist',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TableModule, PageHeaderComponent],
  templateUrl: './vendor-draft-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDraftChecklistComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected namaKerusakan = '';
  protected tindakan = '';
  protected harga = 0;

  private readonly list = this.store.selectSignal(DraftChecklistState.list);
  protected readonly rows = computed(() => this.list().filter((item) => item.workOrderId === this.workOrderId));

  protected tambahDraft(): void {
    this.store.dispatch(
      new CreateDraftChecklist(this.workOrderId, {
        items: [
          {
            namaKerusakan: this.namaKerusakan || 'Kerusakan umum',
            tindakanPerbaikan: this.tindakan || 'Perbaikan umum',
            hargaItem: Number(this.harga || 0),
          },
        ],
      }),
    );
    this.namaKerusakan = '';
    this.tindakan = '';
    this.harga = 0;
  }

  protected submit(id: string): void {
    this.store.dispatch(new SubmitDraft(id));
  }
}
