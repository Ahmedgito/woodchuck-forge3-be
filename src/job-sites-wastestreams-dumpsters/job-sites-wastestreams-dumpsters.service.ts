/* eslint-disable no-restricted-syntax */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { QueuesService } from 'src/queues/queues.service';
import { UpdateJobSitesWastestreamsDumpstersDto } from './dto/update-job-sites-wastestreams-dumpsters.dto';
import { CreateJobSitesWastestreamsDumpstersDto } from './dto/create-job-sites-wastestreams-dumpsters.dto';
import { BulkCreateJobSitesWastestreamsDumpstersDto } from './dto/bulk-create-job-sites-wastestreams-dumpsters.dto';
import {
  BulkCreateJobSitesWastestreamsDumpstersResponseDto,
  BulkCreateItemResult,
} from './dto/bulk-create-response.dto';
import { BulkDeleteJobSitesWastestreamsDumpstersDto } from './dto/bulk-delete-job-sites-wastestreams-dumpsters.dto';
import {
  BulkDeleteJobSitesWastestreamsDumpstersResponseDto,
  BulkDeleteItemResult,
} from './dto/bulk-delete-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from './infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { ConfigService } from '@nestjs/config';
import { format, lastDayOfMonth, isWithinInterval } from 'date-fns';

@Injectable()
export class JobSitesWastestreamsDumpstersService {
  constructor(
    private queueService: QueuesService,
    private configService: ConfigService,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private JobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private JobSiteWastestreamsDumpstersRepository: Repository<JobSiteWastestreamsDumpstersEntity>,
  ) {}

  async create(createDto: CreateJobSitesWastestreamsDumpstersDto) {
    try {
      const dt = createDto;
      if (dt.no_of_dumpster > 0) {
        const jobSiteWastestreams =
          await this.JobSitesWasteStreamsRepository.findOne({
            where: { id: dt.jobSiteWastestreamsId },
            relations: { jobSitesWasteStreamsDumpsters: true },
          });

        const suppliedDate = new Date(dt.creationDate);
        const firstDateOfMonth = format(suppliedDate, 'yyyy-MM-01');
        const lastDateOfMonth = format(
          lastDayOfMonth(suppliedDate),
          'yyyy-MM-dd',
        );

        if (
          jobSiteWastestreams &&
          jobSiteWastestreams.jobSitesWasteStreamsDumpsters != undefined
        ) {
          const updatedList: any[] = [];
          for (
            let index = 0;
            index < jobSiteWastestreams.jobSitesWasteStreamsDumpsters.length;
            index++
          ) {
            const currObj =
              jobSiteWastestreams.jobSitesWasteStreamsDumpsters[index];
            const creationDate = new Date(currObj.creationDate);
            if (
              isWithinInterval(creationDate, {
                start: firstDateOfMonth,
                end: lastDateOfMonth,
              })
            ) {
              updatedList.push(currObj);
            }
          }
          jobSiteWastestreams.jobSitesWasteStreamsDumpsters = updatedList;
        }

        if (
          jobSiteWastestreams &&
          jobSiteWastestreams.jobSitesWasteStreamsDumpsters != undefined &&
          jobSiteWastestreams.jobSitesWasteStreamsDumpsters?.length >=
            this.configService.get('MAX_NO_OF_WASTESTREAMS_DUMPSTERS')
        ) {
          throw new HttpException(
            'Maximum no of dumpsters exceeded. Only ' +
              (this.configService.get('MAX_NO_OF_WASTESTREAMS_DUMPSTERS') -
                jobSiteWastestreams.jobSitesWasteStreamsDumpsters?.length) +
              ' number allowed',
            HttpStatus.FORBIDDEN,
          );
        }

        let noOfDumpstersToAdd = dt.no_of_dumpster;
        if (
          jobSiteWastestreams &&
          jobSiteWastestreams.jobSitesWasteStreamsDumpsters != undefined
        ) {
          const previousDumpsterCount =
            jobSiteWastestreams.jobSitesWasteStreamsDumpsters?.length;
          let availableLimit =
            this.configService.get('MAX_NO_OF_WASTESTREAMS_DUMPSTERS') -
            previousDumpsterCount;

          if (availableLimit < 0) availableLimit = 0;

          if (availableLimit < noOfDumpstersToAdd)
            noOfDumpstersToAdd = availableLimit;
        }

        for (let index = 0; index < noOfDumpstersToAdd; index++) {
          const queueDt = {
            creationDate: dt.creationDate,
            jobSiteWastestreams: { id: dt.jobSiteWastestreamsId },
            real_weight: dt.real_weight,
          };
          await this.queueService.addJobsiteWastestreamsDumpsters(queueDt);
        }
      }
    } catch (exceptions) {
      // throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
      throw exceptions;
    }
  }

  async update(id: number, updateDto: UpdateJobSitesWastestreamsDumpstersDto) {
    try {
      if (
        updateDto.real_weight !== undefined &&
        updateDto.real_weight !== null
      ) {
        const queueDt = {
          jobSiteWastestreamsDumpsters: { id: id },
          real_weight: updateDto.real_weight,
        };
        await this.queueService.updateJobsiteWastestreamsDumpsters(queueDt);
      }
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async delete(id: number) {
    try {
      const queueDt = {
        jobSiteWastestreamsDumpsters: { id: id },
      };
      await this.queueService.deleteJobsiteWastestreamsDumpsters(queueDt);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async bulkCreate(
    bulkCreateDto: BulkCreateJobSitesWastestreamsDumpstersDto,
  ): Promise<BulkCreateJobSitesWastestreamsDumpstersResponseDto> {
    // Validate max bulk create limit from config (default: 20)
    const maxBulkCreateLimit =
      this.configService.get<number>('MAX_BULK_CREATE_DUMPSTERS') ?? 20;

    if (bulkCreateDto.dumpsters.length > maxBulkCreateLimit) {
      throw new HttpException(
        `Maximum ${maxBulkCreateLimit} dumpsters allowed per bulk create request. Received ${bulkCreateDto.dumpsters.length} dumpsters.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const results: BulkCreateItemResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let index = 0; index < bulkCreateDto.dumpsters.length; index++) {
      const bulkItem = bulkCreateDto.dumpsters[index];
      const result: BulkCreateItemResult = {
        index,
        success: false,
        jobSiteWastestreamsId: bulkItem.jobSiteWastestreamsId,
      };

      try {
        // Convert bulk item to create DTO with no_of_dumpster = 1 (each item is a single dumpster)
        const createDto: CreateJobSitesWastestreamsDumpstersDto = {
          no_of_dumpster: 1,
          jobSiteWastestreamsId: bulkItem.jobSiteWastestreamsId,
          creationDate: bulkItem.creationDate,
          real_weight: bulkItem.real_weight,
        };

        await this.create(createDto);
        result.success = true;
        successful++;
      } catch (error) {
        result.success = false;
        result.error =
          error instanceof HttpException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error occurred';
        failed++;
      }

      results.push(result);
    }

    return {
      total: bulkCreateDto.dumpsters.length,
      successful,
      failed,
      results,
    };
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteJobSitesWastestreamsDumpstersDto,
  ): Promise<BulkDeleteJobSitesWastestreamsDumpstersResponseDto> {
    // Verify that the waste stream exists
    const wasteStream = await this.JobSitesWasteStreamsRepository.findOne({
      where: { id: bulkDeleteDto.jobSiteWastestreamsId },
    });

    if (!wasteStream) {
      throw new HttpException(
        `Waste stream with ID ${bulkDeleteDto.jobSiteWastestreamsId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Verify that all dumpster IDs exist and belong to the specified waste stream
    const dumpsters = await this.JobSiteWastestreamsDumpstersRepository.find({
      where: {
        id: In(bulkDeleteDto.ids),
        jobSiteWastestreams: { id: bulkDeleteDto.jobSiteWastestreamsId },
      },
      relations: ['jobSiteWastestreams'],
    });

    // Check if all requested IDs were found and belong to the waste stream
    const foundIds = dumpsters.map((d) => d.id);
    const missingIds = bulkDeleteDto.ids.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new HttpException(
        `The following dumpster IDs do not exist or do not belong to waste stream ${bulkDeleteDto.jobSiteWastestreamsId}: ${missingIds.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const results: BulkDeleteItemResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let index = 0; index < bulkDeleteDto.ids.length; index++) {
      const id = bulkDeleteDto.ids[index];
      const result: BulkDeleteItemResult = {
        id,
        success: false,
      };

      try {
        await this.delete(id);
        result.success = true;
        successful++;
      } catch (error) {
        result.success = false;
        result.error =
          error instanceof HttpException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error occurred';
        failed++;
      }

      results.push(result);
    }

    return {
      total: bulkDeleteDto.ids.length,
      successful,
      failed,
      results,
    };
  }
}
