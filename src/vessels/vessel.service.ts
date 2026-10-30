import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { VesselEntity } from './infrastructure/persistence/relational/entities/vessel.entity';
import { SaveVesselDto } from './dto/save-vessel.dto';
import { VesselOptionsEntity } from 'src/vessel-options/infrastructure/persistence/relational/entities/vessel-options.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(VesselEntity)
    private vesselRepository: Repository<VesselEntity>,
    @InjectRepository(VesselOptionsEntity)
    private vesselOptionsRepository: Repository<VesselOptionsEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {}

  async findAll() {
    // Get all vesselOptionIds used in job site waste streams
    const usedOptionIds: number[] = [];
    const jobSiteWasteStreams = await this.jobSitesWasteStreamsRepository.find({
      where: { vesselOptionId: Not(IsNull()) },
    });

    for (const jsws of jobSiteWasteStreams) {
      if (jsws.vesselOptionId) usedOptionIds.push(jsws.vesselOptionId);
    }

    // Fetch vessels and options
    const vessels = await this.vesselRepository.find({
      relations: ['options'],
    });

    // Add optionsWithDisabled property for response
    for (const vessel of vessels) {
      if (vessel.options && vessel.options.length > 0) {
        const options = vessel.options as any[];
        for (const option of options) {
          option.disabled = usedOptionIds.includes(option.id);
        }
      }
    }
    return vessels;
  }

  async saveVessel(dto: SaveVesselDto) {
    try {
      const results: VesselEntity[] = [];

      for (const vesselData of dto.vessels) {
        let vesselEntity: VesselEntity | null;

        // --- Create or update vessel ---
        if (!vesselData.id) {
          vesselEntity = this.vesselRepository.create({
            name: vesselData.name,
          });
          await this.vesselRepository.save(vesselEntity);
        } else {
          vesselEntity = await this.vesselRepository.findOne({
            where: { id: vesselData.id },
            relations: ['options'],
          });
          if (!vesselEntity) {
            throw new Error(`Vessel with ID ${vesselData.id} not found`);
          }
          vesselEntity.name = vesselData.name;
          await this.vesselRepository.save(vesselEntity);
        }

        // --- Handle vessel options ---
        const savedOptions: VesselOptionsEntity[] = [];
        for (const optionData of vesselData.options) {
          if (!optionData.id) {
            // New option
            if (optionData.value !== 0) {
              const newOption = this.vesselOptionsRepository.create({
                vessel: { id: vesselEntity.id },
                value: optionData.value,
              });
              savedOptions.push(
                await this.vesselOptionsRepository.save(newOption),
              );
            }
          } else {
            // Update existing option
            const existingOption = await this.vesselOptionsRepository.findOne({
              where: { id: optionData.id, vessel: { id: vesselEntity.id } },
            });
            if (!existingOption) {
              throw new Error(
                `Option with ID ${optionData.id} not found for vessel ${vesselEntity.id}`,
              );
            }
            if (optionData.value === 0) {
              await this.vesselOptionsRepository.delete(existingOption.id);
              // Do not add to savedOptions
            } else {
              existingOption.value = optionData.value;
              savedOptions.push(
                await this.vesselOptionsRepository.save(existingOption),
              );
            }
          }
        }
        if (savedOptions.length === 0) {
          await this.vesselRepository.delete(vesselEntity.id);
        } else {
          results.push({
            ...vesselEntity,
            options: savedOptions,
          } as any);
        }
      }

      return results;
    } catch (e) {
      console.log(e);
    }
  }
}
