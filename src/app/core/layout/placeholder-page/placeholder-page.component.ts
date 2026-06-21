import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Placeholder page sederhana untuk Phase 1.
 *
 * Setiap route fitur (vehicles, regulations, dst.) di-rute ke komponen ini
 * sampai halaman aslinya diimplementasi di task 6.x dan 7.x. Komponen
 * mengambil judul halaman dari `route.data.title` atau dari segmen URL
 * sebagai fallback.
 */
@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  templateUrl: './placeholder-page.component.html',
  styleUrl: './placeholder-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Snapshot route data untuk membaca title yang diset di `app.routes.ts`. */
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  protected readonly title = computed(() => {
    const dataTitle = this.data()['title'];
    if (typeof dataTitle === 'string' && dataTitle.length > 0) {
      return dataTitle;
    }
    // Fallback: derivasi dari URL aktif.
    const url = this.router.url.split('?')[0];
    const last = url.split('/').filter(Boolean).pop() ?? 'halaman';
    return last.charAt(0).toUpperCase() + last.slice(1);
  });

  protected readonly currentPath = computed(() => this.router.url);
}
