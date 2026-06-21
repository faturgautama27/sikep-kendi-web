import { HttpInterceptorFn } from '@angular/common/http';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export const idempotencyKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next(req);
  }

  const path = req.url.toLowerCase();
  const skip = path.includes('/auth/login') || path.includes('/auth/logout');

  if (skip || req.headers.has('Idempotency-Key')) {
    return next(req);
  }

  const idempotencyKey = crypto.randomUUID();
  return next(
    req.clone({
      setHeaders: {
        'Idempotency-Key': idempotencyKey,
      },
    }),
  );
};