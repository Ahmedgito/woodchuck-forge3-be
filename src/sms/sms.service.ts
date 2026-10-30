/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SmsEntity } from './infrastructure/persistence/relational/entities/sms.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSiteRepository } from 'src/job-sites/infrastructure/persistence/job-site.repository';
import { CreateSmsDto } from './dto/create-sms.dto';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import * as mustache from 'mustache';
import { TwilioService } from 'nestjs-twilio';
import { ConfigService } from '@nestjs/config';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { SmsDumpsterNotificationGateway } from 'src/notifications/sms-dumpster-notification/sms-dumpster-notification.gateway';
import { GlobalDataRepository } from 'src/global-data/infrastructure/persistence/global-data.repository';

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SmsEntity)
    private smsRepository: Repository<SmsEntity>,
    private readonly jobSiteRepository: JobSiteRepository,
    @InjectRepository(DumpsterEntity)
    private dumpsterRepository: Repository<DumpsterEntity>,
    @InjectRepository(HaulerEntity)
    private haulerRepository: Repository<HaulerEntity>,
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
    private readonly globalDataRepository: GlobalDataRepository,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
    private readonly smsNotification: SmsDumpsterNotificationGateway,
  ) {}

  async create(createSmsDto: CreateSmsDto) {
    //first retrive template from global settings
    const globalData = await this.globalDataRepository.findOne({
      id: this.configService.get('GLOBAL_DATA_DB_ID', { infer: true }),
    });

    const message: any = globalData?.supervisorOnboarding;
    // const message = `
    //         Hi {{supervisorName}},
    //         This is Chuck!
    //         Our dumpster service is fully automatic. If you need a dumpster, just send us a message in this format:
    //         SMS ID = Dumpster ID - Requested Dumpster Size

    //         This SMS ID is: {{smsId}}
    //         Dumpster Location IDs:
    //         {{dumpsterLocs}}
    //         Available sizes for a new dumpster:
    //         {{newHaulersYds}}
    //         Available sizes for swapping a dumpster:
    //         {{swapHaulersYds}}
    //         Sample request: 13 DS14 NEW20

    //         If you want us to stop the service, just send SMSID STOP.`;

    // then save it in sms db
    let sms = await this.smsRepository.save(
      this.smsRepository.create({
        jobSite: { id: createSmsDto.jobSiteId },
        orignalSms: message,
      }),
    );
    const jobSite = await this.jobSiteRepository.findOne({
      id: createSmsDto.jobSiteId,
    });
    const supervisorName = jobSite?.name;
    const supervisorPhone: any = jobSite?.phone;

    const dumpsterLocs = jobSite?.dumpsters;

    let dsLocs = '';
    if (dumpsterLocs != null) {
      dumpsterLocs.forEach(function (dumpster) {
        dsLocs += 'DS' + dumpster.id + '=' + dumpster.sublocationName + ' \n ';
      });
    }

    let dsNewSizes = '';
    let dsSwapSizes = '';
    if (jobSite?.haulerId) {
      const hauler = await this.haulerRepository.findOne({
        where: { id: jobSite.haulerId },
      });

      const dumpsterSize: any = hauler?.dumpsterSize;
      const dumpsterSizeReq = ['NEW', 'SWAP'];
      if (dumpsterSize != null) {
        dumpsterSizeReq.forEach(function (dsSizeReq) {
          dumpsterSize.forEach(function (dsSize) {
            if (dsSizeReq == 'NEW') {
              dsNewSizes += dsSizeReq + dsSize + ' \n';
            } else if (dsSizeReq == 'SWAP') {
              dsSwapSizes += dsSizeReq + dsSize + ' \n';
            }
          });
        });
      }
    }

    // now set tempalte variables

    const dynamicValues = {
      supervisorName: supervisorName,
      smsId: sms.id,
      dumpsterLocs: dsLocs, //"DS14 = South Gate\nDS15 = North Gate 19th Street Short Stand",
      newHaulersYds: dsNewSizes,
      swapHaulersYds: dsSwapSizes,
    };

    const isNullOrEmpty = this.hasNullOrEmptyValues(dynamicValues);
    if (isNullOrEmpty) {
      throw new HttpException(
        'Information incomplete to request.',
        HttpStatus.FORBIDDEN,
      );
    }

    const interpolatedMessage = mustache.render(message, dynamicValues);

    // save it in db
    sms.orignalSms = interpolatedMessage;
    sms = await this.smsRepository.save(sms);

    try {
      if (this.configService.get('SEND_SMS', { infer: true }) === 'true') {
        // send twillio sms
        const respSms = await this.twilioService.client.messages.create({
          body: interpolatedMessage,
          from: this.configService.get('TWILIO_FROM_NUMBER', { infer: true }),
          to: supervisorPhone,
        });
      }
      return {
        message: 'Sms generated',
        ...(this.configService.get('SEND_SMS', { infer: true }) !== 'true' && {
          smsMessage: interpolatedMessage,
        }),
      };
    } catch (exceptions) {
      //throw exceptions;
      throw new HttpException(exceptions.message, HttpStatus.FORBIDDEN);
    }
  }

  findAll() {
    return `This action returns all sms`;
  }

  async findOne(id: string) {
    return await this.smsRepository.findOne({ where: { id: id } });
    return `This action returns a #${id} sm`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // update(id: number, updateSmsDto: UpdateSmsDto) {
  //   return `This action updates a #${id} sm`;
  // }

  remove(id: number) {
    return `This action removes a #${id} sm`;
  }

  async parseSms(reqData) {
    // Split the input string by spaces
    //const parts = reqData.sms.split(' ');
    //const reqDataParse = reqData.sms == undefined ? reqData.Body : reqData.sms;
    // const parts = reqData.Body.split(' ');

    // const smsId = parts[0];

    // const dumpsterLoc = parts[1];
    // const dumpsterLocId = this.separateString(
    //   dumpsterLoc,
    //   'dumspterLoc',
    // ).suffix;
    // const dsSizeReq = parts[2];
    // const haulerSize = await this.separateString(dsSizeReq, 'haulerSize')
    //   .suffix;
    // const dumpsterSizeReq = await this.separateString(dsSizeReq, 'haulerSize')
    //   .prefix;

    // const sms = await this.smsRepository.findOne({ where: { id: smsId } });

    // if (sms == null) {
    //   throw new BadRequestException('sms id dosent exist;');
    //   return 'sms id dosent exist;';
    // }

    // const jobSite: any = await this.jobSiteRepository.findOne({
    //   id: sms.jobSite.id,
    // });

    // if (parts[1] === 'STOP') {
    //   const smsDumpster = await this.smsDumpsterRepository.save(
    //     this.smsDumpsterRepository.create(),
    //   );

    //   smsDumpster.sms = sms;
    //   smsDumpster.jobSite = jobSite;
    //   await smsDumpster.save();

    //   throw new BadRequestException('dumpster request stopped');
    //   return { message: 'dumpster request stopeed' };
    // }

    // const dumpster = await this.dumpsterRepository.findOne({
    //   where: { id: dumpsterLocId, jobSite: { id: sms.jobSite.id } },
    // });

    // if (dumpster == null) {
    //   throw new BadRequestException('dumpster dont exists');
    //   return 'dumpster dont exists';
    // }

    // const hauler = await this.haulerRepository.findOne({
    //   where: { id: jobSite?.haulerId },
    // });

    // if (hauler == null) {
    //   throw new BadRequestException('hauler size request not exists');
    //   return 'hauler size request not exists';
    // }
    // const dsSize: any = hauler.dumpsterSize;
    // if (!dsSize.includes(haulerSize)) {
    //   throw new BadRequestException('hauler size request not exists');
    //   return 'hauler size request not exists';
    // }

    // const details: any = {
    //   dstype: dumpsterSizeReq,
    //   dsSize: haulerSize,
    // };

    // const smsDumpster = await this.smsDumpsterRepository.save(
    //   this.smsDumpsterRepository.create({
    //     details: details,
    //     jobSite: jobSite,
    //     dumpster: dumpster,
    //     sms: sms,
    //   }),
    // );

    // this.smsNotification.handleMessage('msgFromServer', [
    //   { message: 'new request added' },
    // ]);

    // smsDumpster.sms = sms;
    // smsDumpster.jobSite = jobSite;
    // smsDumpster.dumpster = dumpster;
    // await smsDumpster.save();

    return { message: 'dumpster request added' };
  }

  separateString(inputString: string, type) {
    let match;
    if (type == 'dumspterLoc') {
      match = inputString.match(/([A-Za-z]+)([0-9]+)/);
    } else if (type == 'haulerSize') {
      match = inputString.toUpperCase().match(/([A-Z]+)([0-9]+)/);
    }

    if (match) {
      const prefix = match[1]; // Prefix (e.g., "DS")
      const suffix = match[2]; // Suffix (e.g., "1")

      return { prefix, suffix };
    } else {
      throw new HttpException('Invalid input string', HttpStatus.FORBIDDEN);
    }
  }

  hasNullOrEmptyValues(obj: any): boolean {
    for (const key in obj) {
      if (!obj[key]) {
        return true; // If any value is null or empty, return true
      }
    }
    return false; // If all values are non-null and non-empty, return false
  }
}
