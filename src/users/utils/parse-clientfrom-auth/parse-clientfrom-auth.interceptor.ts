import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RoleEnum } from 'src/roles/roles.enum';

@Injectable()
export class ParseClientfromAuthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Parse filters if they exist
    const parsedFilters = request.query.filters
      ? JSON.parse(request.query.filters)
      : {};

    // If DEMO mode is enabled, remove `clientId` and `endClientId` from filters
    if (process.env.IS_DEMO === 'true') {
      delete parsedFilters.clientId;
      delete parsedFilters.endClientId;
    } else if (request.user !== undefined) {
      if (
        request.user.role.id === RoleEnum.general_contractor ||
        request.user.role.id === RoleEnum.manufacturer ||
        request.user.role.id === RoleEnum.wood_processing
      ) {
        if (request.user.isSubUser) {
          parsedFilters.clientId = request.user.parentUserId;
        } else {
          parsedFilters.clientId = request.user.id;
        }
      }
    }

    // Convert filters back to JSON string
    request.query.filters = JSON.stringify(parsedFilters);

    return next.handle();
  }
}
