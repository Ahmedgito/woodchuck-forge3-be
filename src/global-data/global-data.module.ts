import { Module } from '@nestjs/common';

import { GlobalDataController } from './global-data.controller';
// import { FilesModule } from 'src/files/files.module';
// import databaseConfig from 'src/database/config/database.config';
// import { DatabaseConfig } from 'src/database/config/database-config.type';
import { GlobalDataService } from './global-data.service';
// import { DocumentUserPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { RelationalGlobalDataPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalGlobalDataPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [GlobalDataController],
  providers: [GlobalDataService],
  exports: [GlobalDataService, infrastructurePersistenceModule],
})
export class GlobalDataModule {}
