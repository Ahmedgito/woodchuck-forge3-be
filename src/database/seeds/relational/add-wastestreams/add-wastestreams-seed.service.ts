import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WasteStreamsEntity } from 'src/wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { WasteStreams } from 'src/wastestreams/wastestreams';
import { Repository } from 'typeorm';

@Injectable()
export class AddWastestreamsSeedService {
  constructor(
    @InjectRepository(WasteStreamsEntity)
    private repository: Repository<WasteStreamsEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (count === 0) {
      const wastestreams = WasteStreams;
      for (const wastestream of wastestreams) {
        await this.repository.save(
          this.repository.create({ name: wastestream.name }),
        );
      }
    }
  }
}
