import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';

/**
 * Safety net for Preview Mode.
 *
 * When `previewMode === true`, all outbound HTTP calls are blocked except:
 * - Static assets (i18n files, fixtures) served by Angular's dev/static server
 *   These typically have URLs starting with `/i18n/`, `/fixtures/`, `/assets/`,
 *   or are absolute relative paths to local resources.
 *
 * Any accidental API call in Preview Mode will be rejected with a clear error
 * to alert the developer that the demo data should come from in-memory state.
 */
export const previewSafetyNetInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);

  if (!env.previewMode) {
    return next(req);
  }

  const url = req.url;

  // Allow static assets that are part of the static build (relative paths)
  const isStaticAsset =
    url.startsWith('/i18n/') ||
    url.startsWith('/fixtures/') ||
    url.startsWith('/assets/') ||
    url.startsWith('./i18n/') ||
    url.startsWith('./fixtures/') ||
    (url.endsWith('.json') && !url.includes('://'));

  if (isStaticAsset) {
    return next(req);
  }

  // Block any other call (typically API calls)
  return throwError(
    () =>
      new Error(
        `[Preview Mode Safety Net] Outbound HTTP call blocked: ${req.method} ${req.url}\n` +
          `Preview Mode forbids network calls. Use in-memory NGXS state via Preview*Data adapters.`,
      ),
  );
};
