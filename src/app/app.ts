import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PreviewBannerComponent } from '@core/layout/preview-banner/preview-banner.component';

/**
 * Root komponen aplikasi ARMADIN.
 *
 * Layout strategy: route-driven. Login dan halaman error pakai blank layout,
 * authenticated routes dibungkus AppShell di app.routes.ts.
 *
 * `PreviewBanner` selalu di paling atas viewport (sticky) terlepas dari route.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PreviewBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
