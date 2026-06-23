import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state';
import type { ChecklistExecution, Driver, DriverAssignment, FuelTransaction } from '@shared/models';

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

  protected readonly currentDriver = computed<Driver | null>(() => null);
  protected readonly activeAssignment = computed<DriverAssignment | null>(() => null);

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Sore';
  });

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
