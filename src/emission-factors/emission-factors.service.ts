import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmissionFactorDto } from './dto/create-emission-factor.dto';
import { UpdateEmissionFactorDto } from './dto/update-emission-factor.dto';
import { EmissionFactorEntity } from './infrastructure/persistence/relational/entities/emission-factor.entity';
import { EmissionFactor } from './domain/emission-factor';

@Injectable()
export class EmissionFactorsService {
  constructor(
    @InjectRepository(EmissionFactorEntity)
    private emissionFactorRepository: Repository<EmissionFactorEntity>,
  ) {}

  async create(
    createEmissionFactorDto: CreateEmissionFactorDto,
  ): Promise<EmissionFactor> {
    try {
      const emissionFactor = this.emissionFactorRepository.create(
        createEmissionFactorDto,
      );
      return await this.emissionFactorRepository.save(emissionFactor);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create emission factor',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(): Promise<EmissionFactor[]> {
    return await this.emissionFactorRepository.find();
  }

  async findOne(id: number): Promise<EmissionFactor> {
    const emissionFactor = await this.emissionFactorRepository.findOne({
      where: { id },
    });

    if (!emissionFactor) {
      throw new HttpException(
        'Emission factor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return emissionFactor;
  }

  async findByKey(key: string): Promise<EmissionFactor> {
    const emissionFactor = await this.emissionFactorRepository.findOne({
      where: { key },
    });

    if (!emissionFactor) {
      throw new HttpException(
        'Emission factor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return emissionFactor;
  }

  async update(
    id: number,
    updateEmissionFactorDto: UpdateEmissionFactorDto,
  ): Promise<EmissionFactor> {
    try {
      // Filter out computed/virtual fields and timestamps
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        __entity,
        toType,
        entityType,
        typeLabel,
        id: _id,
        createdAt,
        updatedAt,
        deletedAt,
        ...emissionFactorData
      } = updateEmissionFactorDto as any;

      await this.emissionFactorRepository.update({ id }, emissionFactorData);

      return await this.findOne(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update emission factor',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: number): Promise<void> {
    const emissionFactor = await this.findOne(id);
    await this.emissionFactorRepository.softRemove(emissionFactor);
  }
}

