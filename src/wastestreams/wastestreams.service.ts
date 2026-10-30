import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { WasteStreamsEntity } from './infrastructure/persistence/relational/entities/wastestreams.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { WasteStreams } from './domain/wastestreams';
import { CreateWasteStreamsDto } from './dto/create-wastestreams.dto';
import { UpdateWasteStreamsDto } from './dto/update-wastestreams.dto';
import { QueuesService } from 'src/queues/queues.service';
import { WasteStreamTypeVesselsEntity } from 'src/wastestream-type-vessels/infrastructure/persistence/relational/entities/wastestream-type-vessels.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { WasteStreamMapper } from './infrastructure/persistence/relational/mappers/wastestreams.mapper';

@Injectable()
export class WastestreamsService {
  constructor(
    private queueService: QueuesService,
    @InjectRepository(WasteStreamsEntity)
    private wasteStreamRepository: Repository<WasteStreamsEntity>,
    @InjectRepository(WasteStreamTypeVesselsEntity)
    private wasteStreamTypeVesselsRepository: Repository<WasteStreamTypeVesselsEntity>,
    @InjectRepository(WasteStreamTypesEntity)
    private wasteStreamTypesRepository: Repository<WasteStreamTypesEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {}

  async findAll() {
    const data = await this.wasteStreamRepository.find({
      relations: [
        'wasteStreamTypes',
        'wasteStreamTypes.vessels',
        'wasteStreamTypes.vessels.vessel',
      ],
      order: { createdAt: 'asc' },
    });

    // Get all waste stream type IDs that are associated with jobSiteWasteStreams
    // Include soft-deleted records to mark types associated with deleted waste streams
    const jobSiteWasteStreams = await this.jobSitesWasteStreamsRepository.find({
      where: {
        wasteStreamType: { id: Not(IsNull()) },
      },
      withDeleted: true,
    });
    const associatedTypeIds = new Set<number>();
    for (const jsws of jobSiteWasteStreams) {
      if (jsws.wasteStreamTypeId) {
        associatedTypeIds.add(jsws.wasteStreamTypeId);
      }
    }

    // Map the data first
    const mappedData = WasteStreamMapper.toResponse(data);

    // Add flag to each waste stream type after mapping
    return mappedData.map((wasteStream) => ({
      ...wasteStream,
      wasteStreamTypes: wasteStream.wasteStreamTypes.map((type) => ({
        ...type,
        isAssociatedWithJobSiteWasteStreams: associatedTypeIds.has(type.id),
      })),
    }));
  }

  async findOne(id: number) {
    // Get all job site waste streams to check associations
    // Include soft-deleted records to mark types associated with deleted waste streams
    const jobSiteWasteStreams = await this.jobSitesWasteStreamsRepository.find({
      where: {
        wasteStreamType: { id: Not(IsNull()) },
      },
      withDeleted: true,
    });

    // Get all composite keys from job site waste streams (for vessel disabled flag)
    const usedKeys = new Set<string>();
    const associatedTypeIds = new Set<number>();
    for (const jsws of jobSiteWasteStreams) {
      if (jsws.wasteStreamTypeId) {
        associatedTypeIds.add(jsws.wasteStreamTypeId);
        // Only add to usedKeys if vesselId is also present
        if (jsws.vesselId) {
          usedKeys.add(`${jsws.wasteStreamTypeId}_${jsws.vesselId}`);
        }
      }
    }

    const dt = await this.wasteStreamRepository.findOne({
      relations: [
        'wasteStreamTypes',
        'wasteStreamTypes.vessels',
        'wasteStreamTypes.vessels.vessel',
      ],
      where: { id: id },
    });

    // Add disabled flag to each vessel in each waste stream type
    // Add flag to each waste stream type indicating if it's associated with jobSiteWasteStreams
    if (dt && dt.wasteStreamTypes) {
      for (const type of dt.wasteStreamTypes) {
        // Add flag for type association
        (type as any).isAssociatedWithJobSiteWasteStreams =
          associatedTypeIds.has(type.id);

        if (type.vessels && type.vessels.length > 0) {
          for (const vessel of type.vessels as any[]) {
            const key = `${type.id}_${vessel.vesselId}`;
            vessel.disabled = usedKeys.has(key);
          }
        }
      }
    }
    return dt;
  }

  async create(createDto: CreateWasteStreamsDto): Promise<WasteStreams> {
    try {
      const wastestreams = this.wasteStreamRepository.create(createDto);
      return await this.wasteStreamRepository.save(wastestreams);
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: number, dto: UpdateWasteStreamsDto) {
    try {
      // 1. Get WasteStream with types and vessels
      const wasteStream = await this.wasteStreamRepository.findOne({
        where: { id },
        relations: ['wasteStreamTypes', 'wasteStreamTypes.vessels'],
      });
      if (!wasteStream) {
        throw new Error(`WasteStream with id ${id} not found`);
      }

      // 2. Update root WasteStream fields explicitly
      if (dto.name !== undefined) wasteStream.name = dto.name;

      if (dto.colorCodeEst !== undefined)
        wasteStream.colorCodeEst = dto.colorCodeEst;

      if (dto.colorCodeReal !== undefined)
        wasteStream.colorCodeReal = dto.colorCodeReal;

      if (dto.tonPerOffRoleYard !== undefined)
        wasteStream.tonPerOffRoleYard = dto.tonPerOffRoleYard;

      if (dto.tonPerFrontLoadYard !== undefined)
        wasteStream.tonPerFrontLoadYard = dto.tonPerFrontLoadYard;

      if (dto.tonPerCompactorYard !== undefined)
        wasteStream.tonPerCompactorYard = dto.tonPerCompactorYard;

      // ...add other root fields as needed...

      // 3. Map incoming types by id for quick lookup
      const incomingTypesMap = new Map<
        number | undefined,
        (typeof dto.wasteStreamTypes)[number]
      >();
      dto.wasteStreamTypes.forEach((t) => incomingTypesMap.set(t.id, t));

      // 4. Remove types that no longer exist in DTO
      const typesToRemove: WasteStreamTypesEntity[] = [];
      for (const existingType of wasteStream.wasteStreamTypes) {
        const incoming = incomingTypesMap.get(existingType.id);
        if (!incoming) {
          // Check if this type is associated with any jobSiteWasteStreams
          const associatedJobSiteWasteStreams =
            await this.jobSitesWasteStreamsRepository.findOne({
              where: { wasteStreamType: { id: existingType.id } },
            });

          // Only remove if not associated with any jobSiteWasteStreams
          if (!associatedJobSiteWasteStreams) {
            // Remove all vessel associations for this type
            if (existingType.vessels && existingType.vessels.length > 0) {
              for (const v of existingType.vessels) {
                await this.wasteStreamTypeVesselsRepository.remove(v);
              }
            }
            // Remove the type itself
            await this.wasteStreamTypesRepository.remove(existingType);
            typesToRemove.push(existingType);
          }
        }
      }
      wasteStream.wasteStreamTypes = wasteStream.wasteStreamTypes.filter(
        (t) => !typesToRemove.includes(t),
      );

      // 5. Update existing types and their vessels
      for (const existingType of wasteStream.wasteStreamTypes) {
        const incoming = incomingTypesMap.get(existingType.id);
        if (incoming) {
          existingType.name = incoming.name ?? '';
          existingType.colorCodeEst = incoming.colorCodeEst ?? '';
          existingType.colorCodeReal = incoming.colorCodeReal ?? '';
          await this.wasteStreamTypesRepository.save(existingType);

          // Build a map of incoming vessels by composite key (wasteStreamTypeId + vesselId)
          const incomingVesselMap = new Map<
            string,
            (typeof incoming.vessels)[number]
          >();
          incoming.vessels.forEach((v) => {
            const key = `${existingType.id}_${v.vesselId}`;
            incomingVesselMap.set(key, v);
          });

          // Step 1: Remove vessels not in DTO
          const vesselsToRemove: typeof existingType.vessels = [];
          for (const v of existingType.vessels) {
            const key = `${v.wasteStreamTypeId}_${v.vesselId}`;
            const incomingVessel = incomingVesselMap.get(key);
            if (!incomingVessel) {
              await this.wasteStreamTypeVesselsRepository.remove(v);
              vesselsToRemove.push(v);
            }
          }
          existingType.vessels = existingType.vessels.filter(
            (v) => !vesselsToRemove.includes(v),
          );

          // // Step 2: Update existing or insert new
          for (const vesselDto of incoming.vessels) {
            const existingVessel = existingType.vessels.find(
              (v) =>
                v.wasteStreamTypeId === existingType.id &&
                v.vesselId === vesselDto.vesselId,
            );

            if (existingVessel) {
              // Check if tons value has changed and log it
              const oldTons = existingVessel.tons;
              const newTons = vesselDto.tons;

              if (oldTons !== newTons) {
                const queueDt = {
                  wasteStreamTypeId: existingType.id,
                  vesselId: vesselDto.vesselId,
                };
                await this.queueService.updateAllJobSiteWastestreamsDumpsterEstValue(
                  queueDt,
                );
              }

              // Update tons
              existingVessel.tons = newTons;
              await this.wasteStreamTypeVesselsRepository.save(existingVessel);
            } else {
              // Create new association
              const newVessel = this.wasteStreamTypeVesselsRepository.create({
                wasteStreamTypeId: existingType.id,
                vesselId: vesselDto.vesselId,
                tons: vesselDto.tons,
              });
              const savedVessel =
                await this.wasteStreamTypeVesselsRepository.save(newVessel);
              existingType.vessels.push(savedVessel);
            }
          }
        }
      }

      // 6. Add new types and their vessels
      for (const incomingType of dto.wasteStreamTypes) {
        if (!incomingType.id) {
          const newType = this.wasteStreamTypesRepository.create({
            name: incomingType.name,
            wasteStreamId: id,
            colorCodeEst: incomingType.colorCodeEst ?? '',
            colorCodeReal: incomingType.colorCodeReal ?? '',
          });
          const savedType = await this.wasteStreamTypesRepository.save(newType);
          savedType.vessels = [];
          for (const vesselDto of incomingType.vessels) {
            const newVessel = this.wasteStreamTypeVesselsRepository.create({
              wasteStreamTypeId: savedType.id,
              vesselId: vesselDto.vesselId,
              tons: vesselDto.tons,
            });
            await this.wasteStreamTypeVesselsRepository.save(newVessel);
            savedType.vessels.push(newVessel);
          }
          wasteStream.wasteStreamTypes.push(savedType);
        }
      }

      // 7. Save root WasteStream
      await this.wasteStreamRepository.save(wasteStream);

      // 8. Return updated WasteStream with fresh relations
      return await this.wasteStreamRepository.findOne({
        where: { id },
        relations: [
          'wasteStreamTypes',
          'wasteStreamTypes.vessels',
          'wasteStreamTypes.vessels.vessel',
        ],
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
