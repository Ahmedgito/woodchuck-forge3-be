import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LocationsEntity } from './infrastructure/persistence/relational/entities/locations.entity';
import { Repository } from 'typeorm';
import { PowerPlantsEntity } from '../power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { LocationsToTypesEnum } from './locationToTypes.enum';
import { Locations } from './domain/locations';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationsEntity)
    private locationsEntityRepository: Repository<LocationsEntity>,
    @InjectRepository(PowerPlantsEntity)
    private powerPlantsRepository: Repository<PowerPlantsEntity>,
    @InjectRepository(AddressEntity)
    private addressRepository: Repository<AddressEntity>,
  ) {}

  async create(createDto): Promise<Locations> {
    try {
      const { address, ...locationData } = createDto;
      const createLocations = await this.locationsEntityRepository.save(
        this.locationsEntityRepository.create(locationData),
      );

      // Save address if provided
      if (address) {
        const savedAddress = (await this.addressRepository.save(
          this.addressRepository.create({
            ...address,
          }),
        )) as unknown as AddressEntity;

        // Attach address to location via addressId
        await this.locationsEntityRepository.update(createLocations['id'], {
          address: { id: savedAddress.id } as any,
        });
      }

      return this.findOne(createLocations['id']);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: number, updateDto): Promise<Locations> {
    try {
      const { address, ...locationData } = updateDto;
      await this.locationsEntityRepository.update(id, locationData);

      // Update or create address if provided
      if (address) {
        const locationEntity = await this.locationsEntityRepository.findOne({
          where: { id },
          relations: ['address'],
        });

        const existingAddress = locationEntity?.address
          ? await this.addressRepository.findOne({
              where: { id: locationEntity.address.id },
            })
          : null;

        if (existingAddress) {
          // If placeId changed, delete old address and create a new one
          if (existingAddress.placeId !== address.placeId) {
            await this.addressRepository.delete(existingAddress.id);

            const newAddress = (await this.addressRepository.save(
              this.addressRepository.create({
                ...address,
              }),
            )) as unknown as AddressEntity;

            await this.locationsEntityRepository.update(id, {
              address: { id: newAddress.id } as any,
            });
          }
          // else {
          //   // Same placeId: just update existing address fields
          //   await this.addressRepository.update(existingAddress.id, {
          //     ...address,
          //   });
          // }
        } else {
          const newAddress = (await this.addressRepository.save(
            this.addressRepository.create({
              ...address,
            }),
          )) as unknown as AddressEntity;

          await this.locationsEntityRepository.update(id, {
            address: { id: newAddress.id } as any,
          });
        }
      }

      return this.findOne(id);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll() {
    const locations = await this.locationsEntityRepository.find({
      order: { updatedAt: 'desc' },
      //relations: ['relatedLocation', 'relatedPowerPlant'],
    });

    if (!locations) {
      throw new Error('Location not found');
    }

    // Map through each location and fetch related details if necessary
    const locationsWithDetails = await Promise.all(
      locations.map(async (location) => {
        if (location.to != null && location.inMiles != null) {
          if (location.toType === LocationsToTypesEnum.powerplant) {
            const powerPlant = await this.powerPlantsRepository.findOneBy({
              id: location.to,
            });
            return { ...location, relatedPowerPlant: powerPlant };
          } else if (
            location.toType === LocationsToTypesEnum.location &&
            location.to
          ) {
            const relatedLocation =
              await this.locationsEntityRepository.findOneBy({
                id: location.to,
              });
            return { ...location, relatedLocation: relatedLocation };
          }
        }
        return location;
      }),
    );

    return locationsWithDetails;
  }

  async findOne(id: number) {
    const location = await this.locationsEntityRepository.findOne({
      where: { id },
      //relations: ['relatedLocation', 'relatedPowerPlant'],
    });

    if (!location) {
      throw new Error('Location not found');
    }

    if (location.to != null && location.inMiles != null) {
      if (location.toType === LocationsToTypesEnum.powerplant) {
        const powerPlant = await this.powerPlantsRepository.findOneBy({
          id: location.to,
        });
        return { ...location, relatedPowerPlant: powerPlant };
      } else if (location.toType === LocationsToTypesEnum.location) {
        const relatedLocation = await this.locationsEntityRepository.findOneBy({
          id: location.to,
        });
        return { ...location, relatedLocation: relatedLocation };
      }
    }

    return location;
  }

  async getCombinedList() {
    const locations = await this.locationsEntityRepository.find({
      select: ['id', 'name', 'toType', 'type'],
    });

    const powerplants = await this.powerPlantsRepository.find({
      select: ['id', 'name'],
    });

    return [...locations, ...powerplants];
  }
}
