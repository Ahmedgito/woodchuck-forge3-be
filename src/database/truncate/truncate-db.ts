import { NestFactory } from '@nestjs/core';
import { TruncateModule } from './truncate.module';
import { TruncateService } from './truncate.service';

const truncateDb = async () => {
  const app = await NestFactory.create(TruncateModule);

  // run
  await app.get(TruncateService).run();

  await app.close();
};

void truncateDb();
