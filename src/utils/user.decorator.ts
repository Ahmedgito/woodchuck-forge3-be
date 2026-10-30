import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();

    if (process.env.IS_DEMO === 'true') {
      return { id: null };
    }
    return request.user;
  },
);
