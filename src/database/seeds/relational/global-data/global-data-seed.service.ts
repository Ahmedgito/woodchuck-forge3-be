import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GlobalDataEntity } from 'src/global-data/infrastructure/persistence/relational/entities/global-data.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GlobalDataSeedService {
  constructor(
    @InjectRepository(GlobalDataEntity)
    private repository: Repository<GlobalDataEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (!count) {
      await this.repository.save([
        this.repository.create({
          id: 1,
          distanceMmrMacomb: 66.7,
          distanceMmrLivonia: 60.8,
          tonage10yrd: 1,
          tonage20yrd: 1.5,
          tonage30yrd: 2,
          tonage40yrd: 2.5,
          supervisorOnboarding:
            'Hi $SV_NAME (Micheal), \r\nThis is Chuck!\r\nOur dumpster service if fully automatic.\r\nIf you need a dumpster just send a message with $_Hauler_DS_#10” NEW20 or NEW40.\r\nIf your dumpster is full and need to be swopped answer with SWAP20 or SWAP40.\r\n$_if_sub_locations: Add the sub location “$_sub_location_name” \r\nIf you want us the stop the service just send STOP.',
          autoResponse:
            'Confirmed: Order received. Our Dumpster is on it way! \r\nStop: You have stopped our service. \r\nRejected: We have declined your request. Please give us a call: $_Matt_phone#',
        }),
      ]);
    }
  }
}
