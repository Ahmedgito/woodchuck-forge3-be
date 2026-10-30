import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private readonly windowMs = 60_000; // 1 minute
  private readonly max = 60; // 60 req/min per key

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const keyHeader: string | undefined =
      req.headers['x-api-key'] || req.headers['authorization'] || req.ip;
    const identifier = typeof keyHeader === 'string' ? keyHeader : req.ip;

    const now = Date.now();
    const entry = this.hits.get(identifier);
    if (!entry || now > entry.resetAt) {
      this.hits.set(identifier, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) {
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count += 1;
    return true;
  }
}
