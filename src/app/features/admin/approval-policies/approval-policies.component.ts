import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { PengajuanState } from '@features/pengajuan/state';

@Component({
  selector: 'app-approval-policies',
  standalone: true,
  imports: [TagModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5">
      <header>
        <h2 class="text-xl font-bold text-primary-900">Approval Policies</h2>
        <p class="text-sm text-slate-500">Konfigurasi jenjang persetujuan berdasarkan jenis dan nilai pengajuan.</p>
      </header>
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <i class="pi pi-info-circle mr-2"></i>Read-only di Preview Mode. Edit akan tersedia di task berikutnya.
      </div>
      <div class="rounded-lg border border-primary-100 bg-surface shadow-sm">
        <p-table [value]="policies()" dataKey="id" styleClass="text-sm">
          <ng-template #header>
            <tr>
              <th>Jenis Pengajuan</th>
              <th class="w-20 text-center">Jenjang</th>
              <th class="w-48 text-right">Ambang Nominal Min</th>
              <th>Role Approver</th>
            </tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td><p-tag [value]="p.jenis" [severity]="p.jenis === 'corrective' ? 'warn' : p.jenis === 'preventive' ? 'info' : 'secondary'" [rounded]="true"></p-tag></td>
              <td class="text-center font-bold text-primary-700">{{ p.jenjangNo }}</td>
              <td class="text-right text-slate-700">{{ formatRupiah(p.ambangNominalMin) }}</td>
              <td class="text-slate-700">{{ p.role }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="4" class="py-8 text-center text-sm text-slate-500">Tidak ada policy.</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
})
export class ApprovalPoliciesComponent {
  private readonly store = inject(Store);
  protected readonly policies = this.store.selectSignal(PengajuanState.approvalPolicies);

  protected formatRupiah(n: number): string {
    return n === 0 ? 'Semua nilai' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }
}
