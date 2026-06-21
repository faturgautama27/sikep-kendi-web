import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { APP_ENV } from '@core/data-access/app-env.token';
import { AuthState } from '@features/login/state';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  const store = inject(Store);

  if (env.previewMode) {
    return next(req);
  }

  const token = store.selectSnapshot(AuthState.token);
  if (!token) {
    return next(req);
  }

  const withAuth = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(withAuth);
};