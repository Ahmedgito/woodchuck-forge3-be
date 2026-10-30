import { Module, forwardRef } from '@nestjs/common';

import { UsersController } from './users.controller';
import { FilesModule } from 'src/files/files.module';
import { FilesS3PresignedModule } from 'src/files/infrastructure/uploader/s3-presigned/files.module';
import { UsersService } from './users.service';
import { RelationalUserPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MailModule } from 'src/mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { SessionModule } from 'src/session/session.module';
import { IsUniqueEmailConstraint } from './utils/unique-validation.ts';
import { ApiKeyModule } from 'src/api-key/api-key.module';
import { JobSitesModule } from 'src/job-sites/job-sites.module';

const infrastructurePersistenceModule = RelationalUserPersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    FilesModule,
    FilesS3PresignedModule,
    MailModule,
    JwtModule.register({}),
    SessionModule,
    ApiKeyModule,
    forwardRef(() => JobSitesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, IsUniqueEmailConstraint],
  exports: [UsersService, infrastructurePersistenceModule],
})
export class UsersModule {}
