import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateSmsDumpDto } from './dto/create-sms-dump.dto';
import { UpdateSmsDumpDto } from './dto/update-sms-dump.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { SmsDumpEntity } from './infrastructure/persistence/relational/entities/sms-dump.entity';
import { Repository } from 'typeorm';
import { SmsDump } from './domain/sms-dump';
@Injectable()
export class SmsDumpService {
  constructor(
    @InjectRepository(SmsDumpEntity)
    private smsDumpRepository: Repository<SmsDumpEntity>,
  ) {}
  async create(createSmsDumpDto: CreateSmsDumpDto): Promise<SmsDump> {
    try {
      const smsDump = this.smsDumpRepository.create(createSmsDumpDto);
      return await this.smsDumpRepository.save(smsDump);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const smsDump = await this.smsDumpRepository.find();
    return smsDump;
  }
  async findOne(id: string) {
    const smsDump = await this.smsDumpRepository.findOne({
      where: { id: Number(id) },
    });
    return smsDump;
  }
  async update(id: string, updateSmsDumpDto: UpdateSmsDumpDto) {
    try {
      await this.smsDumpRepository.update({ id: Number(id) }, updateSmsDumpDto);
      const getSmsDump = this.findOne(id);
      return getSmsDump;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
}
