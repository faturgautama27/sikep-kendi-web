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
        store.dispatch(new Logout());
        router.navigateByUrl('/login');
      } else if (err.status === 403) {
        router.navigateByUrl('/403');
      }

      return throwError(() => err);
    }),
  );
};