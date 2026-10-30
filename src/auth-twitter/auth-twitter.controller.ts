import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthTwitterService } from './auth-twitter.service';

@ApiTags('Auth')
@Controller({
  path: 'auth/twitter',
  version: '1',
})
export class AuthTwitterController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTwitterService: AuthTwitterService,
  ) {}
}
