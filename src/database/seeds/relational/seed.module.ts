import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from 'src/config/app.config';
import databaseConfig from 'src/database/config/database.config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { RoleSeedModule } from './role/role-seed.module';
import { StatusSeedModule } from './status/status-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import { HaulerTypeSeedModule } from './hauler-type/hauler-type-seed.module';
import { GlobalDataSeedModule } from './global-data/global-data-seed.module';

import { AddWastestreamsSeedModule } from './add-wastestreams/add-wastestreams-seed.module';
import { EmissionFactorsSeedModule } from './emission-factors/emission-factors-seed.module';
import { GenieSeedModule } from './genie/genie-seed.module';

@Module({
  imports: [
    AddWastestreamsSeedModule,
    HaulerTypeSeedModule,
    RoleSeedModule,
    StatusSeedModule,
    UserSeedModule,
    GlobalDataSeedModule,
    EmissionFactorsSeedModule,
    GenieSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
