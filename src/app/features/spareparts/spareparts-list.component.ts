import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { SparepartsState } from './state';
import type { SparepartCategory } from '@shared/models';

interface FilterOption<T> { label: string; value: T | null; }

const CAT_OPTIONS: FilterOption<SparepartCategory>[] = [
  { label: 'Semua Kategori', value: null },
  { label: 'Oli', value: 'oli' },
  { label: 'Rem', value: 'rem' },
  { label: 'Ban', value: 'ban' },
  { label: 'Lampu', value: 'lampu' },
  { label: 'Elektrikal', value: 'elektrikal' },
  { label: 'Mesin', value: 'mesin' },
  { label: 'Body', value: 'body' },
  { label: 'Lainnya', value: 'lainnya' },
];

@Component({
  selector: 'app-spareparts-list',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule,
    SelectModule, TableModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './spareparts-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparepartsListComponent {
  private readonly store = inject(Store);
  private readonly messageService = inject(MessageService);

  protected readonly catOptions = CAT_OPTIONS;
  protected readonly spareparts = this.store.selectSignal(SparepartsState.list);
  protected readonly vendors = this.store.selectSignal(SparepartsState.vendors);

  protected readonly search = signal('');
  protected readonly selectedCat = signal<SparepartCategory | null>(null);
  protected readonly activeTab = signal('spareparts');

  protected onCatChange(val: string): void {
    this.selectedCat.set(val ? val as SparepartCategory : null);
  }

  protected readonly filteredSpareparts = computed(() => {
    const q = this.search().toLowerCase();
    const cat = this.selectedCat();
    return this.spareparts().filter(s => {
      if (q && !`${s.kode} ${s.nama}`.toLowerCase().includes(q)) return false;
      if (cat && s.kategori !== cat) return false;
      return true;
    });
  });  protected readonly filteredVendors = computed(() => {
    const q = this.search().toLowerCase();
    return this.vendors().filter(v =>
      !q || `${v.nama} ${v.npwp}`.toLowerCase().includes(q)
    );
  });

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }

  protected catSeverity(c: SparepartCategory): 'info' | 'success' | 'warn' | 'secondary' {
    const m: Record<SparepartCategory, 'info' | 'success' | 'warn' | 'secondary'> = {
      oli: 'success', rem: 'warn', ban: 'info', lampu: 'info',
      elektrikal: 'warn', mesin: 'secondary', body: 'secondary', lainnya: 'secondary',
    };
    return m[c] ?? 'info';
  }

  protected onAdd(): void {
    this.messageService.add({ severity: 'info', summary: 'Tambah', detail: 'Form tambah akan ada di task berikutnya.', life: 3000 });
  }

  protected getStars(rating: number): ('full' | 'empty')[] {
    return [1, 2, 3, 4, 5].map(i => i <= Math.round(rating) ? 'full' : 'empty');
  }
}
