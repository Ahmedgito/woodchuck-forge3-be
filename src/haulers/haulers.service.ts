import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHaulerDto } from './dto/create-hauler.dto';
import { UpdateHaulerDto } from './dto/update-hauler.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { HaulerEntity } from './infrastructure/persistence/relational/entities/hauler.entity';
import { Repository } from 'typeorm';
import { Hauler } from './domain/hauler';
@Injectable()
export class HaulersService {
  constructor(
    @InjectRepository(HaulerEntity)
    private haulerRepository: Repository<HaulerEntity>,
  ) {}
  async create(createHaulerDto: CreateHaulerDto): Promise<Hauler> {
    try {
      // const getHaulerType = await this.haulerTypeRepository.findOneBy({
      //   name: 'Diesel trucks',
      // });
      // createHaulerDto.haulerType = { id: getHaulerType?.id };
      const hauler = this.haulerRepository.create(createHaulerDto);
      return await this.haulerRepository.save(hauler);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const haulers = await this.haulerRepository.find({
      order: { updatedAt: 'desc' },
    });
    // remove the dumpsterSize from the response
    return haulers.map((hauler) => {
      if (hauler.dumpsterSize === null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { dumpsterSize, ...rest } = hauler; // Exclude `dumpsterSize`
        return rest;
      }
      return hauler;
    });
  }
  async findOne(id: number) {
    const hauler = await this.haulerRepository.findOne({ where: { id: id } });
    // remove the dumpsterSize from the response
    if (!hauler) {
      throw new NotFoundException(`Hauler with id ${id} not found`);
    }

    if (hauler.dumpsterSize === null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dumpsterSize, ...rest } = hauler; // Exclude `dumpsterSize`
      return rest;
    }
    return hauler;
  }
  async update(id: number, updateHaulerDto: UpdateHaulerDto) {
    try {
      await this.haulerRepository.update({ id: id }, updateHaulerDto);
      const getHauler = this.findOne(id);
      return getHauler;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  // remove(id: number) {
  //   return `This action removes a #${id} hauler`;
  // }
}
