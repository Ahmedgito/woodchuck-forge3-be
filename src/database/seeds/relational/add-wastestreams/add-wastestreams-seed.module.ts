import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddWastestreamsSeedService } from './add-wastestreams-seed.service';
import { WasteStreamsEntity } from 'src/wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WasteStreamsEntity])],
  providers: [AddWastestreamsSeedService],
  exports: [AddWastestreamsSeedService],
})
export class AddWastestreamsSeedModule {}
