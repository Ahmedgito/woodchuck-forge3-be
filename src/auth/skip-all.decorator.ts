import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'skipAll';

export const SkipAll = () => SetMetadata('skipAll', true);
