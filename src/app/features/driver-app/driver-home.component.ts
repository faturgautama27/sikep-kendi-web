import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state';
import { DriversState } from '@features/drivers/state';
import { ChecklistExecutionsState } from '@features/checklist/state';
import { FuelState } from '@features/fuel/state';

@Component({
  selector: 'app-driver-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './driver-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverHomeComponent {
  private readonly store = inject(Store);

  protected readonly user = this.store.selectSignal(AuthState.user);

  protected readonly currentDriver = computed(() => {
    const u = this.user();
    if (!u) return null;
    return this.store.selectSignal(DriversState.list)().find(d => d.userId === u.id) ?? null;
  });

  protected readonly activeAssignment = computed(() => {
    const driver = this.currentDriver();
    if (!driver) return null;
    return this.store.selectSignal(DriversState.activeAssignments)()
      .find(a => a.driverId === driver.id && a.mode === 'utama') ?? null;
  });

  protected readonly todayExecutions = computed(() => {
    const today = new Date().toDateString();
    return this.store.selectSignal(ChecklistExecutionsState.list)()
      .filter(e => new Date(e.startedAt).toDateString() === today);
  });

  protected readonly todayFuel = computed(() => {
    const today = new Date().toDateString();
    const driver = this.currentDriver();
    if (!driver) return [];
    return this.store.selectSignal(FuelState.transactions)()
      .filter(t => t.driverId === driver.id && new Date(t.tanggal).toDateString() === today);
  });

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Sore';
  });

  protected readonly checklistDone = computed(() => this.todayExecutions().length > 0);

  protected formatDate(): string {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }
}
