import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface ApiEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  meta?: Record<string, unknown>;
}

export const responseUnwrapperInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  return next(req).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse)) return event;

      const body = event.body;
      if (!body || typeof body !== 'object') return event;

      const env = body as ApiEnvelope<unknown>;
      if (env.success !== true || !Object.prototype.hasOwnProperty.call(env, 'data')) {
        return event;
      }

      if (env.meta && typeof env.meta === 'object') {
        return event.clone({
          body: {
            data: env.data,
            ...env.meta,
          },
        });
      }

      return event.clone({ body: env.data });
    }),
  );
};
