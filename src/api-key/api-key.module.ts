import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyService } from './api-key.service';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}


