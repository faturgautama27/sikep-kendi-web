import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { catchError, throwError } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { Logout } from '@features/login/state';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  const router = inject(Router);
  const store = inject(Store);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || env.previewMode) {
        return throwError(() => err);
      }

      if (err.status === 401) {
        // Hanya logout jika request sebenarnya membawa token (401 = token
        // invalid/expired). 401 pada request tanpa token terjadi saat startup
        // mobile sebelum NGXS rehydration selesai (race condition) dan TIDAK
        // boleh membuang sesi tersimpan.
        const hadToken =
          !!req.headers.get('Authorization') || !!req.headers.get('X-Authorization');
        if (hadToken) {
          store.dispatch(new Logout());
          router.navigateByUrl('/login');
        }
      } else if (err.status === 403) {
        router.navigateByUrl('/403');
      }

      return throwError(() => err);
    }),
  );
};