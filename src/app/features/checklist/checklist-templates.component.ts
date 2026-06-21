import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';

import { ChecklistTemplatesState } from './state';
import { ShowToast } from '@shared/ngxs/ui';
import type {
  ChecklistFrequency,
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateVersion,
  ItemCategory,
  VehicleType,
} from '@shared/models';

interface ChecklistTemplateView {
  template: ChecklistTemplate;
  currentVersion: ChecklistTemplateVersion | undefined;
}

@Component({
  selector: 'app-checklist-templates',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checklist-templates.component.html',
})
export class ChecklistTemplatesComponent {
  private readonly store = inject(Store);

  protected readonly templates = this.store.selectSignal(ChecklistTemplatesState.list);
  protected readonly versions = this.store.selectSignal(ChecklistTemplatesState.versions);

  /** Template yang sedang dibuka di modal. Null = modal tertutup. */
  protected readonly selectedView = signal<ChecklistTemplateView | null>(null);

  protected readonly cards = computed<ChecklistTemplateView[]>(() => {
    const versions = this.versions();
    return this.templates().map((template) => ({
      template,
      currentVersion: versions.find((v) => v.id === template.currentVersionId),
    }));
  });

  protected openModal(view: ChecklistTemplateView): void {
    this.selectedView.set(view);
  }

  protected closeModal(): void {
    this.selectedView.set(null);
  }

  protected onCreateNew(): void {
    this.store.dispatch(new ShowToast({
      severity: 'info',
      summary: 'Buat Template Baru',
      detail: 'Form pembuatan template akan tersedia di tahap berikutnya.',
    }));
  }

  protected onShowVersionHistory(template: ChecklistTemplate, event: Event): void {
    event.stopPropagation();
    this.store.dispatch(new ShowToast({
      severity: 'info',
      summary: 'Riwayat Versi',
      detail: `Riwayat versi untuk ${template.nama} akan tersedia di tahap berikutnya.`,
    }));
  }

  protected vehicleTypeLabel(type: VehicleType | 'all'): string {
    const m: Record<string, string> = {
      mobil: 'Mobil', motor: 'Motor', truk: 'Truk',
      bus: 'Bus', lainnya: 'Lainnya', all: 'Semua Jenis',
    };
    return m[type] ?? type;
  }

  protected frequencyLabel(freq: ChecklistFrequency): string {
    switch (freq.kind) {
      case 'daily': return 'Harian';
      case 'weekly': return 'Mingguan';
      case 'monthly': return 'Bulanan';
      case 'every_km': return `Setiap ${freq.everyKm ?? '-'} km`;
      default: return freq.kind;
    }
  }

  protected categoryLabel(category: ItemCategory): string {
    const m: Record<string, string> = {
      rem: 'Rem', lampu: 'Lampu', ban: 'Ban', oli: 'Oli',
      dokumen: 'Dokumen', body: 'Body', mesin: 'Mesin', kustom: 'Kustom',
    };
    return m[category] ?? category;
  }

  protected itemsForVersion(version: ChecklistTemplateVersion | undefined): ChecklistItem[] {
    return [...(version?.items ?? [])].sort((a, b) => a.ordering - b.ordering);
  }
}
