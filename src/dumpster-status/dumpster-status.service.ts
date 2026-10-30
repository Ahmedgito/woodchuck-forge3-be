import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDumpsterStatusDto } from './dto/create-dumpster-status.dto';
import { UpdateDumpsterStatusDto } from './dto/update-dumpster-status.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DumpsterStatusEntity } from './infrastructure/persistence/relational/entities/dumpster-status.entity';
import { Repository } from 'typeorm';
import { DumpsterStatus } from './domain/dumpster-status';
@Injectable()
export class DumpsterStatusService {
  constructor(
    @InjectRepository(DumpsterStatusEntity)
    private dumpsterStatusRepository: Repository<DumpsterStatusEntity>,
  ) {}
  async create(
    createDumpsterStatusDto: CreateDumpsterStatusDto,
  ): Promise<DumpsterStatus> {
    try {
      const dumpsterStatus = this.dumpsterStatusRepository.create(
        createDumpsterStatusDto,
      );
      return await this.dumpsterStatusRepository.save(dumpsterStatus);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const dumpsterStatus = await this.dumpsterStatusRepository.find();
    return dumpsterStatus;
  }
  async findOne(id: string) {
    const dumpsterStatus = await this.dumpsterStatusRepository.findOne({
      where: { id: Number(id) },
    });
    return dumpsterStatus;
  }
  async update(id: string, updateDumpsterStatusDto: UpdateDumpsterStatusDto) {
    try {
      await this.dumpsterStatusRepository.update(
        { id: Number(id) },
        updateDumpsterStatusDto,
      );
      const getDumpsterStatus = this.findOne(id);
      return getDumpsterStatus;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
}
