import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { APP_ENV } from '@core/data-access/app-env.token';

@Component({
  selector: 'app-preview-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        class="sticky top-0 z-50 flex w-full items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <i class="pi pi-info-circle"></i>
        <span>Mode Preview — Data Dummy</span>
      </div>
    }
  `,
})
export class PreviewBannerComponent {
  private readonly env = inject(APP_ENV);
  readonly visible = computed(() => this.env.previewMode);
}
