import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { PageHeaderComponent } from '@core/layout';

import { ApproveDraft, DraftChecklistState, RejectDraft } from '@features/draft-checklist/state';

@Component({
  selector: 'app-draft-review',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TableModule, PageHeaderComponent],
  templateUrl: './draft-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected catatan = '';
  private readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';

  private readonly list = this.store.selectSignal(DraftChecklistState.list);
  protected readonly rows = computed(() => this.list().filter((item) => item.workOrderId === this.workOrderId));

  private latestDraftId(): string | null {
    const latest = this.rows().sort((a, b) => b.versi - a.versi)[0];
    return latest?.id ?? null;
  }

  protected approve(): void {
    const id = this.latestDraftId();
    if (!id) return;
    this.store.dispatch(new ApproveDraft(id));
    this.catatan = '';
  }

  protected reject(): void {
    const id = this.latestDraftId();
    if (!id) return;
    this.store.dispatch(new RejectDraft(id, this.catatan || 'Perlu koreksi item dan harga.'));
    this.catatan = '';
  }
}
