import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from 'src/api-key/api-key.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const headerKey: string | undefined =
      req.headers['x-api-key'] || req.headers['authorization'];
    if (!headerKey) throw new UnauthorizedException('Missing API key');

    const rawKey = headerKey.startsWith('Bearer ')
      ? headerKey.slice(7)
      : headerKey;

    const user = await this.apiKeyService.validateApiKey(rawKey);
    if (!user) throw new UnauthorizedException('Invalid or expired API key');

    req.user = user;
    return true;
  }
}


