import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDumpsterLiveViewDto } from './dto/create-dumpster-live-view.dto';
import { UpdateDumpsterLiveViewDto } from './dto/update-dumpster-live-view.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DumpsterLiveViewEntity } from './infrastructure/persistence/relational/entities/dumpster-live-view.entity';
import { Repository } from 'typeorm';
import { DumpsterLiveView } from './domain/dumpster-live-view';
@Injectable()
export class DumpsterLiveViewService {
  constructor(
    @InjectRepository(DumpsterLiveViewEntity)
    private dumpsterLiveViewRepository: Repository<DumpsterLiveViewEntity>,
  ) {}
  async create(
    createDumpsterLiveViewDto: CreateDumpsterLiveViewDto,
  ): Promise<DumpsterLiveView> {
    try {
      const dumpsterLiveView = this.dumpsterLiveViewRepository.create({
        ...createDumpsterLiveViewDto,
        jobSite: { id: createDumpsterLiveViewDto.jobSiteId },
      });
      return await this.dumpsterLiveViewRepository.save(dumpsterLiveView);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const dumpsterLiveView = await this.dumpsterLiveViewRepository.find();
    return dumpsterLiveView;
  }
  async findOne(id: string) {
    const dumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
      where: { id: Number(id) },
    });
    return dumpsterLiveView;
  }

  async findByJobSiteId(jobSiteId: string) {
    const dumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
      where: { jobSite: { id: Number(jobSiteId) } },
    });
    return dumpsterLiveView;
  }

  async update(
    jobSiteId: string,
    gateId: string,
    updateDumpsterLiveViewDto: UpdateDumpsterLiveViewDto,
  ) {
    try {
      let getDumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
        where: {
          jobSite: { id: Number(jobSiteId) },
          gateId: Number(gateId),
        },
      });

      if (!getDumpsterLiveView) {
        const dumpsterLiveView = this.dumpsterLiveViewRepository.create({
          ...updateDumpsterLiveViewDto,
          jobSite: { id: Number(jobSiteId) },
          gateId: Number(gateId),
        });

        await this.dumpsterLiveViewRepository.save(dumpsterLiveView);
      } else {
        await this.dumpsterLiveViewRepository.update(
          // {
          //   jobSite: { id: Number(jobSiteId) },
          //   gateId: Number(gateId),
          // },
          {}, // to update all other job sites data in table with the one client is updating (syncing)
          updateDumpsterLiveViewDto,
        );
      }

      getDumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
        where: {
          jobSite: { id: Number(jobSiteId) },
          gateId: Number(gateId),
        },
      });
      return getDumpsterLiveView;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  /*
  async updateByJobsiteLocationSize(
    jobSiteId: string,
    dumpsterLocationId: string,
    dumspterSize: string,
    updateDumpsterLiveViewDto: UpdateDumpsterLiveViewDto,
  ) {
    try {
      await this.dumpsterLiveViewRepository.update(
        {
          jobSite: { id: Number(jobSiteId) },
          dumpsterLocationId: Number(dumpsterLocationId),
          dumspterSize: Number(dumspterSize),
        },
        updateDumpsterLiveViewDto,
      );
      const getDumpsterLiveView = this.dumpsterLiveViewRepository.findOne({
        where: {
          jobSite: { id: Number(jobSiteId) },
          dumpsterLocationId: Number(dumpsterLocationId),
          dumspterSize: Number(dumspterSize),
        },
      });
      return getDumpsterLiveView;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
    */
}
