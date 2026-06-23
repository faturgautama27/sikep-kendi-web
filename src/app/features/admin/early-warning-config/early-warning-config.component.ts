import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
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
import { AdminDataPort } from '@core/data-access/ports/admin-data.port';
import type { EarlyWarningConfig } from '@shared/models';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-early-warning-config', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, InputNumberModule, TableModule, TagModule, ToggleSwitchModule, ToastModule, TooltipModule, PageHeaderComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './early-warning-config.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class EarlyWarningConfigComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly adminPort = inject(AdminDataPort);

  protected readonly configs = signal<EarlyWarningConfig[]>([]);
  protected readonly editingId = signal<string | null>(null);

  ngOnInit() {
    this.loadConfigs();
  }

  private loadConfigs() {
    this.adminPort.getEwConfigs().subscribe({
      next: (configs) => this.configs.set(configs),
      error: () => this.msg.add({ severity: 'error', summary: 'Gagal memuat konfigurasi' })
    });
  }

  protected readonly form = this.fb.group({
    ambangBulan: [null as number | null, [Validators.min(1), Validators.max(12)]],
    ambangKm: [null as number | null, [Validators.min(100)]],
    ambangHari: [null as number | null, [Validators.min(1), Validators.max(30)]],
  });

  protected tooltipFor(c: EarlyWarningConfig): string { return c.description ?? ''; }

  protected openEdit(c: EarlyWarningConfig): void {
    this.editingId.set(c.id);
    this.form.patchValue({ ambangBulan: c.ambangBulan ?? null, ambangKm: c.ambangKm ?? null, ambangHari: c.ambangHari ?? null });
  }

  protected saveEdit(c: EarlyWarningConfig): void {
    const raw = this.form.getRawValue();
    this.adminPort.updateEwConfig(c.id, {
      ambangBulan: raw.ambangBulan ?? undefined,
      ambangKm: raw.ambangKm ?? undefined,
      ambangHari: raw.ambangHari ?? undefined,
      isActive: c.isActive
    }).subscribe({
      next: (updated) => {
        this.configs.update(l => l.map(x => x.id === c.id ? updated : x));
        this.msg.add({ severity: 'success', summary: 'Konfigurasi disimpan.' });
        this.editingId.set(null);
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Gagal menyimpan konfigurasi' })
    });
  }

  protected cancelEdit(): void { this.editingId.set(null); }

  protected toggleActive(c: EarlyWarningConfig): void {
    if (c.isActive) {
      this.confirm.confirm({
        message: `Trigger "${c.triggerLabel}" akan dinonaktifkan. Peringatan tipe ini tidak akan dikirim sampai diaktifkan kembali. Lanjutkan?`,
        header: 'Nonaktifkan Trigger', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Nonaktifkan', rejectLabel: 'Batal',
        accept: () => {
          this.adminPort.updateEwConfig(c.id, { isActive: false }).subscribe({
            next: (updated) => {
              this.configs.update(l => l.map(x => x.id === c.id ? updated : x));
              this.msg.add({ severity: 'warn', summary: 'Trigger dinonaktifkan.' });
            },
            error: () => this.msg.add({ severity: 'error', summary: 'Gagal menonaktifkan trigger' })
          });
        },
      });
    } else {
      this.adminPort.updateEwConfig(c.id, { isActive: true }).subscribe({
        next: (updated) => {
          this.configs.update(l => l.map(x => x.id === c.id ? updated : x));
          this.msg.add({ severity: 'success', summary: 'Trigger diaktifkan.' });
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Gagal mengaktifkan trigger' })
      });
    }
  }
}
