import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { APP_ENV } from '@core/data-access/app-env.token';
import { AuthState } from '@features/login/state';

export const authGuard: CanActivateFn = () => {
  const env = inject(APP_ENV);
  const store = inject(Store);
  const router = inject(Router);

  // Preview Mode: bypass auth so demo works without actual login
  if (env.previewMode) return true;

  const user = store.selectSnapshot(AuthState.user);
  if (user) return true;

  router.navigateByUrl('/login');
  return false;
};
