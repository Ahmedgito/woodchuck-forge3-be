import { NestFactory } from '@nestjs/core';
import { AddWastestreamsSeedService } from './add-wastestreams/add-wastestreams-seed.service';
import { HaulerTypeSeedService } from './hauler-type/hauler-type-seed.service';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { GlobalDataSeedService } from './global-data/global-data-seed.service';
import { EmissionFactorsSeedService } from './emission-factors/emission-factors-seed.service';
import { GenieSeedService } from './genie/genie-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(HaulerTypeSeedService).run();
  await app.get(GlobalDataSeedService).run();
  await app.get(EmissionFactorsSeedService).run();
  await app.get(GenieSeedService).run();

  await app.get(AddWastestreamsSeedService).run();

  await app.close();
};

void runSeed();
