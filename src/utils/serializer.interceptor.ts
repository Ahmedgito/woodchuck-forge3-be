import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import deepResolvePromises from './deep-resolver';

@Injectable()
export class ResolvePromisesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => deepResolvePromises(this.cresponse(data))),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }

  cresponse(dt) {
    return {
      data: dt,
      status: 'success',
    };
  }
}
