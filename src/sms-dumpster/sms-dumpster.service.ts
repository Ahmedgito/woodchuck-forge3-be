import { Injectable } from '@nestjs/common';
import { UpdateSmsDumpsterDto } from './dto/update-sms-dumpster.dto';
import { SmsDumpster } from './domain/sms-dumpster';
import { Repository } from 'typeorm';
import { SmsDumpsterEntity } from './infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QueuesService } from 'src/queues/queues.service';

@Injectable()
export class SmsDumpsterService {
  constructor(
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
    private queueService: QueuesService,
  ) {}
  // create(createSmsDumpsterDto: CreateSmsDumpsterDto) {
  //   return 'This action adds a new smsDumpster';
  // }

  findAll() {
    return `This action returns all smsDumpster`;
  }

  findOne(id: number) {
    return `This action returns a #${id} smsDumpster`;
  }

  async update(
    id: SmsDumpster['id'],
    updateSmsDumpsterDto: UpdateSmsDumpsterDto,
  ) {
    await this.queueService.smsDumpsterRequest({
      updateSmsDumpsterDto,
      ...{ SmsDumpsterId: id },
    });
    return { message: 'reuqest updated' };
  }

  remove(id: number) {
    return `This action removes a #${id} smsDumpster`;
  }
}
