import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePowerPlantsDto } from './dto/create-power-plants.dto';
import { UpdatePowerPlantsDto } from './dto/update-power-plants.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PowerPlantsEntity } from './infrastructure/persistence/relational/entities/power-plants.entity';
import { Repository } from 'typeorm';
import { PowerPlants } from './domain/power-plants';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Injectable()
export class PowerPlantsService {
  constructor(
    @InjectRepository(PowerPlantsEntity)
    private powerPlantsRepository: Repository<PowerPlantsEntity>,
    @InjectRepository(AddressEntity)
    private addressRepository: Repository<AddressEntity>,
  ) {}
  async create(
    createPowerPlantsDto: CreatePowerPlantsDto,
  ): Promise<PowerPlants> {
    try {
      const { address, ...powerPlantData } = createPowerPlantsDto;
      const powerPlants = this.powerPlantsRepository.create(powerPlantData);
      const savedPowerPlant =
        await this.powerPlantsRepository.save(powerPlants);

      // Save address if provided
      if (address) {
        const savedAddress = await this.addressRepository.save(
          this.addressRepository.create({
            ...address,
          }),
        );

        // Attach address to power plant via addressId
        await this.powerPlantsRepository.update(savedPowerPlant.id, {
          address: { id: savedAddress.id } as any,
        });
      }

      const result = await this.findOne(savedPowerPlant.id);
      if (!result) {
        throw new HttpException('Power plant not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (exceptions) {
      console.log(exceptions);
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
  async findAll() {
    const powerPlants = await this.powerPlantsRepository.find({
      order: { updatedAt: 'desc' },
    });
    return powerPlants;
  }
  async findOne(id: number) {
    const powerPlants = await this.powerPlantsRepository.findOne({
      where: { id: id },
    });
    return powerPlants;
  }
  async update(id: number, updatePowerPlantsDto: UpdatePowerPlantsDto) {
    try {
      const { address, ...powerPlantData } = updatePowerPlantsDto;
      await this.powerPlantsRepository.update({ id: id }, powerPlantData);

      // Update or create address if provided
      if (address) {
        const powerPlantEntity = await this.powerPlantsRepository.findOne({
          where: { id },
          relations: ['address'],
        });

        const existingAddress = powerPlantEntity?.address
          ? await this.addressRepository.findOne({
              where: { id: powerPlantEntity.address.id },
            })
          : null;

        if (existingAddress) {
          // If placeId changed, delete old address and create a new one
          if (existingAddress.placeId !== address.placeId) {
            await this.addressRepository.delete(existingAddress.id);

            const newAddress = await this.addressRepository.save(
              this.addressRepository.create({
                ...address,
              }),
            );

            await this.powerPlantsRepository.update(id, {
              address: { id: newAddress.id } as any,
            });
          } else {
            // Same placeId: just update existing address fields
            await this.addressRepository.update(existingAddress.id, {
              ...address,
            });
          }
        } else {
          const newAddress = await this.addressRepository.save(
            this.addressRepository.create({
              ...address,
            }),
          );

          await this.powerPlantsRepository.update(id, {
            address: { id: newAddress.id } as any,
          });
        }
      }

      const getPowerPlants = this.findOne(id);
      return getPowerPlants;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }
}
