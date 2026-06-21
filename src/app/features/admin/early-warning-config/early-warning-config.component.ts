import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '@core/layout';
import type { EarlyWarningConfig } from '@shared/models';

const INITIAL: EarlyWarningConfig[] = [
  { id: 'ewc-1', triggerType: 'komponen_umur', triggerLabel: 'Komponen Mendekati Batas Umur', ambangBulan: 1, isActive: true, updatedAt: '2026-06-01T00:00:00+07:00' },
  { id: 'ewc-2', triggerType: 'komponen_km', triggerLabel: 'Komponen Mendekati Batas KM', ambangKm: 1000, isActive: true, updatedAt: '2026-06-01T00:00:00+07:00' },
  { id: 'ewc-3', triggerType: 'pengajuan_stuck', triggerLabel: 'Pengajuan Menunggu Terlalu Lama', ambangHari: 3, isActive: true, updatedAt: '2026-06-01T00:00:00+07:00' },
];

const TOOLTIPS: Record<string, string> = {
  komponen_umur: 'Trigger ini mengirim peringatan N bulan sebelum estimasi umur komponen habis.',
  komponen_km: 'Trigger ini mengirim peringatan ketika sisa KM komponen kurang dari ambang yang dikonfigurasi.',
  pengajuan_stuck: 'Trigger ini mengirim peringatan jika pengajuan belum diproses lebih dari N hari kerja.',
};

@Component({ selector: 'app-early-warning-config', standalone: true,
  imports: [FormsModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, InputNumberModule, TableModule, TagModule, ToggleSwitchModule, ToastModule, TooltipModule, PageHeaderComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './early-warning-config.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class EarlyWarningConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly configs = signal<EarlyWarningConfig[]>(INITIAL);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.group({
    ambangBulan: [null as number | null, [Validators.min(1), Validators.max(12)]],
    ambangKm: [null as number | null, [Validators.min(100)]],
    ambangHari: [null as number | null, [Validators.min(1), Validators.max(30)]],
  });

  protected tooltipFor(type: string): string { return TOOLTIPS[type] ?? ''; }

  protected openEdit(c: EarlyWarningConfig): void {
    this.editingId.set(c.id);
    this.form.patchValue({ ambangBulan: c.ambangBulan ?? null, ambangKm: c.ambangKm ?? null, ambangHari: c.ambangHari ?? null });
  }

  protected saveEdit(c: EarlyWarningConfig): void {
    const raw = this.form.getRawValue();
    this.configs.update(l => l.map(x => x.id === c.id ? { ...x, ambangBulan: raw.ambangBulan ?? undefined, ambangKm: raw.ambangKm ?? undefined, ambangHari: raw.ambangHari ?? undefined, updatedAt: new Date().toISOString() } : x));
    this.msg.add({ severity: 'success', summary: 'Konfigurasi disimpan.' });
    this.editingId.set(null);
  }

  protected cancelEdit(): void { this.editingId.set(null); }

  protected toggleActive(c: EarlyWarningConfig): void {
    if (c.isActive) {
      this.confirm.confirm({
        message: `Trigger "${c.triggerLabel}" akan dinonaktifkan. Peringatan tipe ini tidak akan dikirim sampai diaktifkan kembali. Lanjutkan?`,
        header: 'Nonaktifkan Trigger', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Nonaktifkan', rejectLabel: 'Batal',
        accept: () => { this.configs.update(l => l.map(x => x.id === c.id ? { ...x, isActive: false } : x)); this.msg.add({ severity: 'warn', summary: 'Trigger dinonaktifkan.' }); },
      });
    } else {
      this.configs.update(l => l.map(x => x.id === c.id ? { ...x, isActive: true } : x));
      this.msg.add({ severity: 'success', summary: 'Trigger diaktifkan.' });
    }
  }
}
