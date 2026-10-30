import { Process, Processor } from '@nestjs/bull';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { TwilioService } from 'nestjs-twilio';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { SmsDumpsterStatusesEnum } from 'src/sms-dumpster/sms-dumpster-statuses.enum';
import { Repository } from 'typeorm';

@Processor('sms-dumpster-request')
export class SendSmsDumpsterReqConsumer {
  constructor(
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
  ) {}

  @Process('smsDumpsterReq-job')
  async smsDumpsterReq(job: Job) {
    const jobData = job.data;

    const smsDumpster = await this.smsDumpsterRepository.findOneOrFail({
      where: { id: jobData.SmsDumpsterId },
    });

    smsDumpster.status =
      SmsDumpsterStatusesEnum[jobData.updateSmsDumpsterDto.status];
    await smsDumpster.save();
    const supervisorPhone: any = smsDumpster.jobSite?.phone;
    let bodyResp;
    try {
      if (this.configService.get('SEND_SMS', { infer: true }) === 'true') {
        if (smsDumpster.status == SmsDumpsterStatusesEnum.accept) {
          bodyResp = 'Accepted: Order received. Our Dumpster is on its way!.';
        } else if (smsDumpster.status == SmsDumpsterStatusesEnum.reject) {
          bodyResp =
            'Rejected: We have declined your request. Please give us a call: ';
        }
        // send twillio sms
        await this.twilioService.client.messages.create({
          body: bodyResp,
          from: this.configService.get('TWILIO_FROM_NUMBER', { infer: true }),
          to: supervisorPhone,
        });
      }
    } catch (exceptions) {
      //throw exceptions;
      throw new HttpException(exceptions.message, HttpStatus.FORBIDDEN);
    }
  }
}
