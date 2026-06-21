import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { NotificationsState } from '@features/notifications/state';

@Component({
  selector: 'app-notification-thresholds',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5">
      <header>
        <h2 class="text-xl font-bold text-primary-900">Notification Thresholds</h2>
        <p class="text-sm text-slate-500">Konfigurasi ambang batas pemicu early warning.</p>
      </header>
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <i class="pi pi-info-circle mr-2"></i>Read-only di Preview Mode. Edit akan tersedia di task berikutnya.
      </div>
      @if (thresholds(); as t) {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Dokumen akan expired</p>
            <p class="text-2xl font-bold text-primary-700">{{ t.documentExpiringDaysBefore }} hari</p>
            <p class="text-xs text-slate-400 mt-1">Sebelum tanggal kadaluarsa</p>
          </div>
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">SIM akan expired</p>
            <p class="text-2xl font-bold text-primary-700">{{ t.simExpiringDaysBefore }} hari</p>
            <p class="text-xs text-slate-400 mt-1">Sebelum tanggal kadaluarsa</p>
          </div>
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pengajuan stuck</p>
            <p class="text-2xl font-bold text-amber-600">{{ t.pengajuanStuckBusinessDays }} hari kerja</p>
            <p class="text-xs text-slate-400 mt-1">Sebelum notifikasi eskalasi</p>
          </div>
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Eskalasi critical unread</p>
            <p class="text-2xl font-bold text-red-600">{{ t.unreadCriticalEscalationHours }} jam</p>
            <p class="text-xs text-slate-400 mt-1">Sebelum eskalasi ke atasan</p>
          </div>
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pagu anggaran</p>
            <p class="text-2xl font-bold text-amber-600">{{ t.budgetThresholdPercent }}%</p>
            <p class="text-xs text-slate-400 mt-1">Realisasi memicu warning</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationThresholdsComponent {
  private readonly store = inject(Store);
  protected readonly thresholds = this.store.selectSignal(NotificationsState.thresholds);
}
