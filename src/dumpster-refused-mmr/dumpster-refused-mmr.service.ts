import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDumpsterRefusedMmrDto } from './dto/create-dumpster-refused-mmr.dto';
import { UpdateDumpsterRefusedMmrDto } from './dto/update-dumpster-refused-mmr.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DumpsterRefusedMmrEntity } from './infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { Repository } from 'typeorm';
import { DumpsterRefusedMmr } from './domain/dumpster-refused-mmr';
@Injectable()
export class DumpsterRefusedMmrService {
  constructor(
    @InjectRepository(DumpsterRefusedMmrEntity)
    private dumpsterRefusedMmrRepository: Repository<DumpsterRefusedMmrEntity>,
  ) {}
  async create(
    createDumpsterRefusedMmrDto: CreateDumpsterRefusedMmrDto,
  ): Promise<DumpsterRefusedMmr> {
    try {
      const dumpsterRefusedMmr = this.dumpsterRefusedMmrRepository.create({
        ...createDumpsterRefusedMmrDto,
        jobSite: { id: createDumpsterRefusedMmrDto.jobSiteId },
      });
      return await this.dumpsterRefusedMmrRepository.save(dumpsterRefusedMmr);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const dumpsterRefusedMmr = await this.dumpsterRefusedMmrRepository.find();
    return dumpsterRefusedMmr;
  }
  async findOne(id: string) {
    const dumpsterRefusedMmr = await this.dumpsterRefusedMmrRepository.findOne({
      where: { id: Number(id) },
    });
    return dumpsterRefusedMmr;
  }
  async update(
    id: string,
    updateDumpsterRefusedMmrDto: UpdateDumpsterRefusedMmrDto,
  ) {
    try {
      await this.dumpsterRefusedMmrRepository.update(
        { id: Number(id) },
        updateDumpsterRefusedMmrDto,
      );
      const getDumpsterRefusedMmr = this.findOne(id);
      return getDumpsterRefusedMmr;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async updateByJobsiteLocationSize(
    jobSiteId: string,
    dumpsterLocationId: string,
    dumspterSize: string,
    updateDumpsterRefusedMmrDto: UpdateDumpsterRefusedMmrDto,
  ) {
    try {
      await this.dumpsterRefusedMmrRepository.update(
        {
          jobSite: { id: Number(jobSiteId) },
          dumpsterLocationId: Number(dumpsterLocationId),
          dumspterSize: Number(dumspterSize),
        },
        updateDumpsterRefusedMmrDto,
      );
      const getDumpsterRefusedMmr = this.dumpsterRefusedMmrRepository.findOne({
        where: {
          jobSite: { id: Number(jobSiteId) },
          dumpsterLocationId: Number(dumpsterLocationId),
          dumspterSize: Number(dumspterSize),
        },
      });
      return getDumpsterRefusedMmr;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
}
