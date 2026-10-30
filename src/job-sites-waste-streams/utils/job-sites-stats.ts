import { JobSitesWasteStreamsEntity } from '../infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { Brackets } from 'typeorm';
import { LocationsTypeEnum } from 'src/locations/locationTypes.enum';
import { LocationsToTypesEnum } from 'src/locations/locationToTypes.enum';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { Injectable, Logger } from '@nestjs/common';
import { JobSite } from 'src/job-sites/domain/job-site';
import { RoleEnum } from 'src/roles/roles.enum';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { JobsiteWasteStreamLocationsEntity } from 'src/job-site-waste-stream-locations/infrastructure/persistence/relational/entities/job-site-waste-stream-locations.entity';
import { EmissionFactorsService } from 'src/emission-factors/emission-factors.service';

@Injectable()
export class JobSiteStats {
  private readonly logger = new Logger(JobSiteStats.name);

  formattedStartDate: any;
  formattedEndDate: any;
  jobSiteId: any;
  jobSiteDt: any;
  userId: string | number | null | undefined;
  userRoleId: string | number | null | undefined;

  constructor(
    private readonly emissionFactorsService?: EmissionFactorsService,
  ) {}

  async jobSite() {
    return await JobSiteEntity.findOneOrFail({
      where: { id: this.jobSiteId },
    });
  }

  private async calculateCleanEnergyFromStreams(
    streams: any[],
  ): Promise<number> {
    let totalCleanEnergy = 0;
    for (const stream of streams) {
      const wasteStreamLocations = await JobsiteWasteStreamLocationsEntity.find(
        {
          where: { jobsiteWasteStreamId: stream.id },
        },
      );
      const endpoint = wasteStreamLocations?.find((loc) => loc.type === 2);
      const processing = wasteStreamLocations?.find((loc) => loc.type === 1);
      let selectedPowerplant: PowerPlants | null = null;
      if (endpoint && endpoint.powerplant) {
        // Case B type=2: end location directly references a powerplant
        selectedPowerplant = endpoint.powerplant;
      } else if (!endpoint && processing && processing.powerplant) {
        // Case B type=1: delivery location directly references a powerplant
        selectedPowerplant = processing.powerplant;
      } else if (
        !endpoint &&
        processing &&
        processing.location?.toType === LocationsToTypesEnum.powerplant &&
        processing.location?.to
      ) {
        // Case A: delivery location is Wood Waste Process routing to a powerplant via toType
        selectedPowerplant = await PowerPlantsEntity.findOne({
          where: { id: processing.location.to },
        });
      }
      if (selectedPowerplant && selectedPowerplant.kwhPerTon) {
        totalCleanEnergy +=
          stream.getJobsiteWastestreamDumpstersTotalWeight() *
          selectedPowerplant.kwhPerTon;
      }
    }
    return totalCleanEnergy;
  }

  async cleanEnergy() {
    let totalCleanEnergy = 0;
    if (this.jobSiteId === undefined) {
      let jobSites;
      if (this.userId !== null && this.userId !== undefined) {
        if (this.userRoleId === RoleEnum.end_client) {
          jobSites = await JobSiteEntity.find({
            where: { endClientId: Number(this.userId) },
          });
        } else {
          jobSites = await JobSiteEntity.find({
            where: { client: { id: Number(this.userId) } },
          });
        }
      } else {
        jobSites = await JobSiteEntity.find();
      }
      for (const jobSite of jobSites) {
        // Get all waste streams for this job site
        const jobSiteStats = new JobSiteStats(this.emissionFactorsService);
        jobSiteStats.jobSiteId = jobSite.id;
        jobSiteStats.formattedStartDate = this.formattedStartDate;
        jobSiteStats.formattedEndDate = this.formattedEndDate;
        const biomassResult = await jobSiteStats.biomassCleanEnergy(jobSite.id);
        const streams = biomassResult.jobSitesWasteStreamsData || [];
        totalCleanEnergy += await this.calculateCleanEnergyFromStreams(streams);
      }
      return Number(totalCleanEnergy.toFixed(2));
    } else {
      const biomassResult = await this.biomassCleanEnergy();
      const streams = biomassResult.jobSitesWasteStreamsData || [];
      totalCleanEnergy = await this.calculateCleanEnergyFromStreams(streams);
      return Number(totalCleanEnergy.toFixed(2));
    }
  }

  async chuckResult() {
    return (await this.woodWaste()).totalTons === 0
      ? 0
      : Number(
          (
            ((await this.totalDiverted()).totalTons /
              (await this.woodWaste()).totalTons) *
            100
          ).toFixed(2),
        );
  }

  async avgSustainabilityGoal() {
    const jobSites = await JobSiteEntity.find({
      select: { jobSiteDetails: { sustainabilityGoal: true } },
      ...(this.userId !== null &&
        ((this.userRoleId !== RoleEnum.end_client && {
          where: { client: { id: Number(this.userId) } },
        }) ||
          (this.userRoleId == RoleEnum.end_client && {
            where: { endClientId: Number(this.userId) },
          }))),
    });

    const totalSustainabilityGoal = jobSites.reduce(
      (accumulator, currentValue) =>
        accumulator +
        (currentValue.jobSiteDetails?.sustainabilityGoal === null
          ? 0
          : currentValue.jobSiteDetails?.sustainabilityGoal),
      0,
    );

    return Number((totalSustainabilityGoal / jobSites.length).toFixed(2));
  }

  async woodWaste() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      powerplant: true,
      location: {
        sql: 'location.type != :locationType',
        params: {
          locationType: LocationsTypeEnum['Recycling'],
        },
        //type: Not(LocationsTypeEnum.Recycling)
      },
      wastestream: ['WOOD WASTE'],
    });
  }

  async landfill() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type = :locationType',
        params: {
          locationType: LocationsTypeEnum['Landfill'],
        },
      },
      //type: LocationsTypeEnum['Landfill'] },
      wastestream: ['WOOD WASTE'],
      powerplant: false,
    });
  }

  async remanufacturing() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type = :locationType',
        params: {
          locationType: LocationsTypeEnum['ReManufacturing'],
        },
        //type: LocationsTypeEnum['ReManufacturing']
      },
      wastestream: ['WOOD WASTE'],
      powerplant: false,
    });
  }

  async industrialProduct() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type = :locationType',
        params: {
          locationType: LocationsTypeEnum['Industrial Product'],
        },
      },
      //type: LocationsTypeEnum['Industrial Product'] },
      wastestream: ['WOOD WASTE'],
      powerplant: false,
    });
  }

  async biomassCleanEnergy(jobSiteId?: JobSite['id']) {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: jobSiteId !== undefined ? jobSiteId : this.jobSiteId,
      location: {
        sql: 'location.type = :locationType AND location.toType = :locationToType',
        params: {
          locationType: LocationsTypeEnum['Wood Waste Process'],
          locationToType: LocationsToTypesEnum.powerplant,
        },
      },
      wastestream: ['WOOD WASTE'],
      powerplant: true,
    });
  }

  async getWoodWasteDistance2(jobSiteId?: JobSite['id']) {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: jobSiteId !== undefined ? jobSiteId : this.jobSiteId,
      location: {
        sql: 'location.type = :locationType',
        params: {
          locationType: LocationsTypeEnum['Wood Waste Process'],
        },
      },
      endlocation: {
        sql: 'location.type IN (:...endLocationType)',
        params: {
          endLocationType: [
            LocationsTypeEnum['ReManufacturing'],
            LocationsTypeEnum['Industrial Product'],
          ],
        },
      },
      wastestream: ['WOOD WASTE'],
      powerplant: false,
    });
  }

  async getAllDistance2(type, jobSiteId?: JobSite['id']) {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: jobSiteId !== undefined ? jobSiteId : this.jobSiteId,
      location: {
        sql: 'location.type = :locationType',
        params: {
          locationType: LocationsTypeEnum['Recycling'],
        },
      },
      endlocation: false,
      wastestream: [type],
      powerplant: false,
    });
  }

  async totalDiverted() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type NOT IN (:...excludedTypes)',
        params: {
          excludedTypes: [
            LocationsTypeEnum['Landfill'],
            LocationsTypeEnum['Recycling'],
          ],
        },
        // type: And(
        //   Not(LocationsTypeEnum['Landfill']),
        //   Not(LocationsTypeEnum['Recycling']),
        // ),
      },
      wastestream: ['WOOD WASTE'],
      powerplant: true,
    });
  }

  async cardBoard() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type = :type',
        params: { type: LocationsTypeEnum['Recycling'] },
        //type: LocationsTypeEnum['Recycling'],
      },
      wastestream: ['WOOD WASTE', 'CARD BOARD'],
      powerplant: false,
    });
  }

  async wasteHauling() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: ['WASTE HAULING'],
      powerplant: false,
    });
  }

  async metal() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: ['METAL'],
      powerplant: false,
    });
  }

  async concrete() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: ['CONCRETE'],
      powerplant: false,
    });
  }

  async plastic() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: ['PLASTIC'],
      powerplant: false,
    });
  }

  async getTotalWeightWithoutLandfill() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: {
        sql: 'location.type != :type',
        params: { type: LocationsTypeEnum['Landfill'] },
      }, //{ type: Not(LocationsTypeEnum['Landfill']) },
      wastestream: undefined,
      powerplant: true,
    });
  }

  async getTotalWeight() {
    return await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: undefined,
      powerplant: false,
    });
  }

  calculateDistance2(wasteStreamsData, locationType) {
    let distance = 0;
    wasteStreamsData.forEach((jsWs) => {
      const location = jsWs.wasteStreamLocations?.find(
        (loc) => loc.type === locationType,
      );
      if (location) {
        distance +=
          location.distance;
      }
    });

    return distance;
  }

  async getTotalDistanceTravelled() {
    const { totalDistance, totalTons } = await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      powerplant: true,
      location: {
        sql: 'location.type != :locationType',
        params: {
          locationType: LocationsTypeEnum['Recycling'],
        },
      },
      wastestream: ['WOOD WASTE'],
    });

    const distance1 = totalDistance;
    const getWoodWastePowerplantJsWsDt = (await this.getWoodWasteDistance2())
      .jobSitesWasteStreamsData;
    const distance2 = this.calculateDistance2(getWoodWastePowerplantJsWsDt, 2);
    const distance = distance1 + distance2;
    return { distance, totalTons };
  }

  async getTotalDistanceTravelledforAll(type) {
    const { totalDistance, totalTons } = await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: [type],
      powerplant: false,
    });

    const distance1 = totalDistance;

    // commenting out for not calculating distance2 for non wood waste
    // const getWoodWastePowerplantJsWsDt = (await this.getAllDistance2(type))
    //   .jobSitesWasteStreamsData;
    const distance2 = 0; //this.calculateDistance2(getWoodWastePowerplantJsWsDt, 1);

    const distance = distance1 + distance2;
    return { distance, totalTons };
  }

  private async getEmissionFactor(key: string, defaultValue: number): Promise<number> {
    if (!this.emissionFactorsService) return defaultValue;
    try {
      const factor = await this.emissionFactorsService.findByKey(key);
      return Number(factor.value);
    } catch {
      return defaultValue;
    }
  }

  async getWoodWasteTransportCo2(jobSiteId?: JobSite['id']) {
    const [rollOffEmissionFactor, semiEmissionFactor, averageSemiTonsPerLoad] =
      await Promise.all([
        this.getEmissionFactor('roll_off_emission_factor', 0.0026),
        this.getEmissionFactor('semi_emission_factor', 0.0016),
        this.getEmissionFactor('average_semi_tons_per_load', 28),
      ]);

    // Run both DB queries in parallel — they are independent of each other
    const [woodWasteData, { jobSitesWasteStreamsData: getWoodWastePowerplantJsWsDt }] =
      await Promise.all([
        this.woodWaste(),
        this.getWoodWasteDistance2(jobSiteId),
      ]);

    let rollOffTonMiles = 0;
    for (const jsWs of woodWasteData?.jobSitesWasteStreamsData || []) {
      const tons = Number(
        jsWs.getJobsiteWastestreamDumpstersTotalWeight?.() ?? 0,
      );
      if (!tons || Number.isNaN(tons)) continue;
      const processingDistance =
        Number(jsWs.wasteStreamLocations?.find((l) => l.type === 1)?.distance) ||
        0;
      rollOffTonMiles += tons * processingDistance;
    }
    const distance1 = rollOffTonMiles * rollOffEmissionFactor;

    let semiLoadMiles = 0;
    for (const jsWs of getWoodWastePowerplantJsWsDt || []) {
      const tons = Number(
        jsWs.getJobsiteWastestreamDumpstersTotalWeight?.() ?? 0,
      );
      if (!tons || Number.isNaN(tons)) continue;
      const offTakeDistance =
        Number(jsWs.wasteStreamLocations?.find((l) => l.type === 2)?.distance) ||
        0;
      semiLoadMiles +=
        Math.floor(tons / averageSemiTonsPerLoad) * offTakeDistance;
    }
    const distance2 = semiLoadMiles * semiEmissionFactor;

    return distance1 + distance2;
  }

  async getTypeTransportCo2(type: string) {
    const [rollOffEmissionFactor, semiEmissionFactor, averageSemiTonsPerLoad] =
      await Promise.all([
        this.getEmissionFactor('roll_off_emission_factor', 0.0026),
        this.getEmissionFactor('semi_emission_factor', 0.0016),
        this.getEmissionFactor('average_semi_tons_per_load', 28),
      ]);
      this.logger.log(`Emission factors for ${type}: rollOffEmissionFactor=${rollOffEmissionFactor}, semiEmissionFactor=${semiEmissionFactor}, averageSemiTonsPerLoad=${averageSemiTonsPerLoad}`);

    const { jobSitesWasteStreamsData } = await this.getJobsiteWastestream({
      formattedEndDate: this.formattedEndDate,
      formattedStartDate: this.formattedStartDate,
      jobSiteId: this.jobSiteId,
      location: undefined,
      wastestream: [type],
      powerplant: false,
    });

    let rollOffTonMiles = 0;
    for (const jsWs of jobSitesWasteStreamsData || []) {
      const tons = Number(
        jsWs.getJobsiteWastestreamDumpstersTotalWeight?.() ?? 0,
      );
      if (!tons || Number.isNaN(tons)) continue;
      const processingDistance =
        Number(jsWs.wasteStreamLocations?.find((l) => l.type === 1)?.distance) ||
        0;
      rollOffTonMiles += tons * processingDistance;
    }
    const distance1 = rollOffTonMiles * rollOffEmissionFactor;

    let semiLoadMiles = 0;
    for (const jsWs of jobSitesWasteStreamsData || []) {
      const tons = Number(
        jsWs.getJobsiteWastestreamDumpstersTotalWeight?.() ?? 0,
      );
      if (!tons || Number.isNaN(tons)) continue;
      const offTakeDistance =
        Number(jsWs.wasteStreamLocations?.find((l) => l.type === 2)?.distance) ||
        0;
      semiLoadMiles +=
        Math.floor(tons / averageSemiTonsPerLoad) * offTakeDistance;
    }
    const distance2 = semiLoadMiles * semiEmissionFactor;

    return distance1 + distance2;
  }

  async getTransportCo2(type) {
    let getTotalDistanceTravelled: any = {};
    if (type === 'WOOD WASTE') {
      getTotalDistanceTravelled = await this.getTotalDistanceTravelled();
    } else {
      getTotalDistanceTravelled =
        await this.getTotalDistanceTravelledforAll(type);
    }

    const emissionFactor: any = 0.000994;

    const transportCo2 =
      getTotalDistanceTravelled.totalTons *
      getTotalDistanceTravelled.distance *
      emissionFactor;

    // return Number(transportCo2.toFixed(2));
    return Math.floor(transportCo2 * 100) / 100;
  }

  async getJobsiteWastestream({
    wastestream,
    location,
    jobSiteId,
    formattedStartDate,
    formattedEndDate,
    powerplant,
    endlocation = false as any,
  }) {
    const jobSitesWasteStreamsQuery =
      JobSitesWasteStreamsEntity.createQueryBuilder('jobSitesWasteStreams');

    jobSitesWasteStreamsQuery
      .leftJoinAndSelect('jobSitesWasteStreams.wasteStream', 'wasteStream')
      .leftJoinAndSelect(
        'jobSitesWasteStreams.jobSitesWasteStreamsDumpsters',
        'jobSitesWasteStreamsDumpsters',
      )
      // .leftJoinAndSelect('jobSitesWasteStreams.location', 'location')
      .leftJoinAndSelect(
        'jobSitesWasteStreams.wasteStreamLocations',
        'wasteStreamLocations',
      )
      .leftJoinAndSelect('wasteStreamLocations.location', 'location')
      .leftJoinAndSelect('wasteStreamLocations.powerplant', 'powerplant')
      .leftJoinAndSelect('jobSitesWasteStreams.jobSite', 'jobSite');

    // Add AND conditions for the other fields
    if (jobSiteId !== undefined) {
      jobSitesWasteStreamsQuery.andWhere(
        'jobSitesWasteStreams.jobSiteId = :jobSiteId',
        { jobSiteId: Number(jobSiteId) },
      );
    }

    if (this.userId !== undefined && this.userId !== null) {
      if (this.userRoleId === RoleEnum.end_client) {
        jobSitesWasteStreamsQuery.andWhere(
          'jobSite.endClientId = :endClientId',
          {
            endClientId: Number(this.userId),
          },
        );
      } else {
        jobSitesWasteStreamsQuery.andWhere('jobSite.clientId = :clientId', {
          clientId: Number(this.userId),
        });
      }
    }
    // todo handle in next merge
    if (wastestream !== undefined) {
      jobSitesWasteStreamsQuery.andWhere(
        'wasteStream.name IN (:...wastestream)',
        { wastestream },
      );
    }

    // Combine location and endlocation conditions with OR instead of AND
    if (location !== undefined && endlocation) {
      jobSitesWasteStreamsQuery.andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((subQb) => {
              subQb.where(
                new Brackets((b) => {
                  b.where('wasteStreamLocations.type = 1');
                  b.andWhere(location.sql, location.params);
                }),
              );
            }),
          );
          qb.orWhere(
            new Brackets((subQb) => {
              subQb.where(
                new Brackets((b) => {
                  b.where('wasteStreamLocations.type = 2');
                  b.andWhere(endlocation.sql, endlocation.params);
                }),
              );
              subQb.orWhere(
                new Brackets((b) => {
                  b.where('wasteStreamLocations.type = 2');
                  b.andWhere('wasteStreamLocations.powerplantId IS NOT NULL');
                }),
              );
            }),
          );
        }),
      );
    } else if (location !== undefined) {
      jobSitesWasteStreamsQuery.andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((subQb) => {
              subQb.where('wasteStreamLocations.type = 1');
              subQb.andWhere(location.sql, location.params);
            }),
          );
          if (powerplant === true) {
            qb.orWhere(
              new Brackets((subQb) => {
                subQb.where('wasteStreamLocations.type = 1');
                subQb.andWhere('wasteStreamLocations.powerplantId IS NOT NULL');
              }),
            );
            // bug/WD-1473: add powerplant condition for endlocation
            qb.orWhere(
              new Brackets((subQb) => {
                subQb.where('wasteStreamLocations.type = 2');
                subQb.andWhere('wasteStreamLocations.powerplantId IS NOT NULL');
              }),
            );
          }
        }),
      );
    } else if (endlocation) {
      jobSitesWasteStreamsQuery.andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((subQb) => {
              subQb.where('wasteStreamLocations.type = 2');
              subQb.andWhere(endlocation.sql, endlocation.params);
            }),
          );
          qb.orWhere(
            new Brackets((subQb) => {
              subQb.where('wasteStreamLocations.type = 2');
              subQb.andWhere('wasteStreamLocations.powerplantId IS NOT NULL');
            }),
          );
        }),
      );
    }

    if (formattedStartDate !== undefined && formattedEndDate !== undefined) {
      jobSitesWasteStreamsQuery.andWhere(
        'jobSitesWasteStreamsDumpsters.creationDate BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(formattedStartDate),
          endDate: new Date(formattedEndDate),
        },
      );
    }

    // if (endlocation) {
    //   const sql = jobSitesWasteStreamsQuery.getSql();
    //   fs.writeFileSync('jobSitesWasteStreamsQuery.sql', sql);
    // }
    const jobSitesWasteStreamsData = await jobSitesWasteStreamsQuery
      .withDeleted()
      .getMany();

    let totalTons: any = 0;
    let totalMoved: any = 0;
    let totalDistance: any = 0;
    let totalLocationMiles: any = 0;
    let locationsTo: any = [];

    jobSitesWasteStreamsData.forEach((item) => {
      const procesingLocation = item.wasteStreamLocations?.find(
        (loc) => loc.type === 1,
      );
      item.wasteStreamLocations?.forEach((loc) => {
        if (loc.location) {
          locationsTo.push(loc.location.name);
        }
        totalLocationMiles += loc.distance || 0;
      });
      totalTons += item.getJobsiteWastestreamDumpstersTotalWeight();
      totalMoved += Number(item.jobSitesWasteStreamsDumpsters?.length);
      totalDistance +=
        (procesingLocation?.distance || 0) *
        Number(item.jobSitesWasteStreamsDumpsters?.length);
    });

    totalTons = Number(totalTons.toFixed(2));
    totalMoved = Number(totalMoved.toFixed(2));
    totalDistance = Number(totalDistance.toFixed(2));
    totalLocationMiles = Number(totalLocationMiles.toFixed(2));
    locationsTo = locationsTo.filter(
      (item: any, index: any, self: string | any[]) =>
        self.indexOf(item) === index,
    );
    return {
      totalTons,
      totalMoved,
      totalDistance,
      totalLocationMiles,
      locationsTo,
      jobSitesWasteStreamsData,
    };
  }
}
