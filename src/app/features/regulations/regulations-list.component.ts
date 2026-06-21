import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';

import { JsonPipe } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { RegulationsState } from './state';
import type { Regulation, RegulationCategory, RegulationVersion } from '@shared/models';

@Component({
  selector: 'app-regulations-list',
  standalone: true,
  imports: [JsonPipe, AccordionModule, BadgeModule, ButtonModule, TableModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './regulations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegulationsListComponent {
  private readonly store = inject(Store);
  private readonly messageService = inject(MessageService);

  protected readonly regulations = this.store.selectSignal(RegulationsState.list);
  protected readonly versions = this.store.selectSignal(RegulationsState.versions);
  protected readonly history = this.store.selectSignal(RegulationsState.changeHistory);

  protected versionsFor(regId: string): RegulationVersion[] {
    return this.versions().filter(v => v.regulationId === regId)
      .sort((a, b) => b.versionNo - a.versionNo);
  }

  protected currentVersion(reg: Regulation): RegulationVersion | undefined {
    return this.versions().find(v => v.id === reg.currentVersionId);
  }

  protected categorySeverity(c: RegulationCategory): 'info' | 'success' | 'warn' | 'secondary' {
    const m: Record<RegulationCategory, 'info' | 'success' | 'warn' | 'secondary'> = {
      interval_servis: 'info', batas_bbm: 'success',
      kewajiban_dokumen: 'warn', pagu_anggaran: 'warn', eskalasi: 'secondary',
    };
    return m[c] ?? 'info';
  }

  protected categoryLabel(c: RegulationCategory): string {
    const m: Record<RegulationCategory, string> = {
      interval_servis: 'Interval Servis', batas_bbm: 'Batas BBM',
      kewajiban_dokumen: 'Kewajiban Dokumen', pagu_anggaran: 'Pagu Anggaran', eskalasi: 'Eskalasi',
    };
    return m[c] ?? c;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected onPublishNew(): void {
    this.messageService.add({ severity: 'info', summary: 'Terbitkan Versi', detail: 'Form penerbitan versi baru akan ada di task berikutnya.', life: 3000 });
  }

  protected onPublish(reg: Regulation): void {
    this.messageService.add({ severity: 'info', summary: 'Terbitkan Versi', detail: `Form penerbitan versi baru ${reg.nama} akan ada di task berikutnya.`, life: 3000 });
  }
}
