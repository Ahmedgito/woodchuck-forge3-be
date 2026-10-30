import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { DumpsterStatusEntity } from 'src/dumpster-status/infrastructure/persistence/relational/entities/dumpster-status.entity';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { NotificationEntity } from 'src/notifications/infrastructure/persistence/relational/entities/notification.entity';
import { RoleEnum } from 'src/roles/roles.enum';
import { SessionEntity } from 'src/session/infrastructure/persistence/relational/entities/session.entity';
import { SmsDumpEntity } from 'src/sms-dump/infrastructure/persistence/relational/entities/sms-dump.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { SmsEntity } from 'src/sms/infrastructure/persistence/relational/entities/sms.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { Not, Repository } from 'typeorm';

@Injectable()
export class TruncateService {
  constructor(
    @InjectRepository(DumpsterEntity)
    private dumpsterRepository: Repository<DumpsterEntity>,
    @InjectRepository(DumpsterRefusedMmrEntity)
    private dumpsterRefusedMmr: Repository<DumpsterRefusedMmrEntity>,
    @InjectRepository(DumpsterStatusEntity)
    private dumpsterStatusRepository: Repository<DumpsterStatusEntity>,
    @InjectRepository(HaulerEntity)
    private haulerRepository: Repository<HaulerEntity>,
    @InjectRepository(JobSiteEntity)
    private jobSiteRepository: Repository<JobSiteEntity>,
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
    @InjectRepository(SmsDumpEntity)
    private smsDumpRepository: Repository<SmsDumpEntity>,
    @InjectRepository(SmsEntity)
    private smsRepository: Repository<SmsEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
  ) {}

  async run() {
    try {
      console.log('Truncating database...');
      await this.sessionRepository.clear();
      console.log('Truncating session successful');
      await this.userRepository.delete({
        role: { id: Not(RoleEnum.admin) },
      });
      console.log('Truncating user successful');
      await this.smsDumpsterRepository.clear();
      console.log('Truncating smsDumpster successful');
      await this.dumpsterRefusedMmr.clear();
      console.log('Truncating dumpsterRefusedMmr successful');
      await this.dumpsterStatusRepository.clear();
      console.log('Truncating dumpsterStatus successful');
      await this.haulerRepository.clear();
      console.log('Truncating hauler successful');
      await this.notificationRepository.clear();
      console.log('Truncating notification successful');
      await this.smsDumpRepository.clear();
      console.log('Truncating smsDump successful');
      await this.smsRepository.delete({});
      console.log('Truncating sms successful');
      await this.dumpsterRepository.delete({});
      console.log('Truncating dumpster successful');
      await this.jobSiteRepository.delete({});
      console.log('Truncating jobSite successful');

      console.log('Truncating database successful!');
    } catch (e) {
      console.log(e);
    }
  }
}
