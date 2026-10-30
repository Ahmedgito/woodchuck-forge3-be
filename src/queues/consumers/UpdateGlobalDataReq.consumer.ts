import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import smsDumpsterOnUpdate from 'src/sms-dumpster/utils/sms-dumpster-onupdate';
import { FindOptionsWhere, In, Repository } from 'typeorm';

@Processor('global-data-update')
export class UpdateGlobalDataReqConsumer {
  constructor(
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
  ) {}

  @Process('globalDataUpdate-job')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async globalDataUpdateReq(job: Job) {
    const jobDt = job.data;
    const SmsDumpsterIds = jobDt.smsDumpsterIds;
    const where: FindOptionsWhere<SmsDumpsterEntity> = {};
    if (SmsDumpsterIds != undefined) {
      where.id = In(SmsDumpsterIds.map(({ id }) => id));
    }
    try {
      const smsDumpsters = await this.smsDumpsterRepository.find({
        where: where,
      });
      if (smsDumpsters) {
        smsDumpsters.forEach(async (smsDumpster) => {
          await smsDumpsterOnUpdate(smsDumpster);
        });
      }
    } catch (exceptions) {
      throw exceptions;
    }
  }
}
