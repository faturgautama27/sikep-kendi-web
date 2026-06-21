import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AuthState } from '@features/login/state';
import { NotificationsState } from '@features/notifications/state';
import type { NotificationPreference } from '@shared/models';

interface ThresholdRow {
  readonly label: string;
  readonly value: string;
}

/**
 * ARMADIN — Halaman Notification Preferences (read-only Phase 1).
 *
 * Menampilkan preferensi notifikasi untuk user yang sedang login (filter
 * berdasarkan `AuthState.user.id`) dalam tabel severity × channel × enabled,
 * serta section konfigurasi global threshold notifikasi yang berlaku
 * untuk semua user.
 *
 * Toggle switch ditampilkan dalam mode read-only (`disabled`) — mutasi
 * preferensi dijadwalkan di task lanjutan via action `UpdatePreference`.
 *
 * Referensi: Requirement 12.4 (preferensi user), 12.7 (threshold).
 */
@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TableModule,
    ToggleSwitchModule,
  ],
  templateUrl: './notification-preferences.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPreferencesComponent {
  private readonly store = inject(Store);

  /** User aktif untuk filter `userId`. */
  private readonly user = this.store.selectSignal(AuthState.user);

  /** Semua preferensi (akan difilter ke user aktif). */
  private readonly allPreferences = this.store.selectSignal(NotificationsState.preferences);

  /** Threshold global notifikasi (read-only). */
  private readonly thresholds = this.store.selectSignal(NotificationsState.thresholds);

  /** Preferensi untuk user aktif saja. */
  protected readonly preferences = computed<NotificationPreference[]>(() => {
    const id = this.user()?.id;
    if (!id) {
      return [];
    }
    return this.allPreferences().filter((p) => p.userId === id);
  });

  /** Baris threshold yang dirender ke UI sebagai key/value pair. */
  protected readonly thresholdRows = computed<ThresholdRow[]>(() => {
    const t = this.thresholds();
    return [
      {
        label: 'Notifikasi dokumen akan kadaluarsa',
        value: `${t.documentExpiringDaysBefore} hari sebelum`,
      },
      {
        label: 'Notifikasi SIM akan kadaluarsa',
        value: `${t.simExpiringDaysBefore} hari sebelum`,
      },
      {
        label: 'Pengajuan tertunda (stuck)',
        value: `${t.pengajuanStuckBusinessDays} hari kerja`,
      },
      {
        label: 'Eskalasi notifikasi critical belum dibaca',
        value: `${t.unreadCriticalEscalationHours} jam`,
      },
      {
        label: 'Threshold pemakaian budget',
        value: `${t.budgetThresholdPercent}%`,
      },
    ];
  });

  /** Severity → label yang ramah pembaca. */
  protected severityLabel(severity: NotificationPreference['severity']): string {
    switch (severity) {
      case 'info':
        return 'Info';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
    }
  }

  /** Channel → label yang ramah pembaca. */
  protected channelLabel(channel: NotificationPreference['channel']): string {
    switch (channel) {
      case 'in_app':
        return 'In-App';
      case 'email':
        return 'Email';
      case 'whatsapp':
        return 'WhatsApp';
      case 'sms':
        return 'SMS';
    }
  }
}
