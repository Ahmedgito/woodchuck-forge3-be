import { GlobalDataEntity } from 'src/global-data/infrastructure/persistence/relational/entities/global-data.entity';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { SmsDumpsterStatusesEnum } from 'src/sms-dumpster/sms-dumpster-statuses.enum';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteEntity } from '../entities/job-site.entity';
import { JobSiteStats } from 'src/job-sites-waste-streams/utils/job-sites-stats';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

export class JobSiteMapper {
  // eslint-disable-next-line @typescript-eslint/require-await
  static async toDomain(raw: JobSiteEntity) {
    const jobsite = new JobSite();
    jobsite.id = raw.id;
    jobsite.title = raw.title;
    // jobsite.street = raw.street;
    // jobsite.city = raw.city;
    // jobsite.state = raw.state;
    // jobsite.zipcode = raw.zipcode;
    jobsite.name = raw.name;
    jobsite.phone = raw.phone;
    jobsite.email = raw.email;

    //jobsite.completedAt = raw.completedAt;
    jobsite.clientId = raw.clientId;
    jobsite['clientName'] = raw.client?.name;
    //jobsite.haulerId = raw.haulerId;

    jobsite['address'] = raw.address;
    jobsite['powerplants'] = raw.jobSiteDetails?.powerplants;
    jobsite['completionBy'] = raw.jobSiteDetails?.completionBy;
    jobsite['size'] = raw.jobSiteDetails?.size;
    jobsite['sustainabilityGoal'] = raw.jobSiteDetails?.sustainabilityGoal;

    jobsite['jobSiteWastestreams'] = raw.jobSitesWasteStreams;

    jobsite.status = raw.status;
    jobsite.createdAt = raw.createdAt;
    jobsite.updatedAt = raw.updatedAt;

    jobsite.closedAt = raw.closedAt;
    jobsite.startDate = raw.startDate;

    const jobSiteStats: JobSiteStats = new JobSiteStats();
    jobSiteStats.jobSiteId = raw.id;

    jobsite.biomassForCleanEnergy = (
      await jobSiteStats.biomassCleanEnergy()
    ).totalTons;
    jobsite.plastic = (await jobSiteStats.plastic()).totalTons;
    jobsite.metal = (await jobSiteStats.metal()).totalTons;
    jobsite.wasteHauling = (await jobSiteStats.wasteHauling()).totalTons;
    jobsite.cardBoard = (await jobSiteStats.cardBoard()).totalTons;
    jobsite.concrete = (await jobSiteStats.concrete()).totalTons;
    jobsite.woodWasteDiverted = await jobSiteStats.chuckResult();
    jobsite.endClientId = raw.endClientId;
    jobsite['endClientName'] = null;
    if (jobsite.endClientId != null) {
      const userEntity = UserEntity.createQueryBuilder('user');
      userEntity.where('user.id = :id', { id: jobsite.endClientId });
      const endClient = await userEntity.getOne();
      jobsite['endClientName'] = endClient?.name;
    }

    jobsite.photo = raw.client?.photo || null;

    // jobsite.woodWasteRecycled = jobSiteStats.totalWaste;
    // jobsite.diverted = jobSiteStats.percent_delivered;
    // jobsite.refused = jobSiteStats.percent_refused;
    // jobsite.co2Avoided = jobSiteStats.totalAvoided;
    // jobsite.totalHailed = jobSiteStats.totalHauled;
    // jobsite.totalTonnage = jobSiteStats.totalTonnage;
    // jobsite.mmrLocation = raw.mmrLocation;

    // jobsite.dumpsters = raw.dumpsters?.sort((a, b) => {
    //   const dateA = new Date(a.updatedAt);
    //   const dateB = new Date(b.updatedAt);
    //   return dateB.getTime() - dateA.getTime();
    // });

    return jobsite;
  }

  static toPersistence(jobsite): JobSiteEntity {
    let status: StatusEntity | undefined = undefined;

    if (jobsite.status) {
      status = new StatusEntity();
      status.id = jobsite.status.id;
    }

    const jobSiteEntity = new JobSiteEntity();
    if (jobsite.id && typeof jobsite.id === 'number') {
      jobSiteEntity.id = jobsite.id;
    }
    jobSiteEntity.street = jobsite.street;
    jobSiteEntity.city = jobsite.city;
    jobSiteEntity.state = jobsite.state;
    jobSiteEntity.zipcode = jobsite.zipcode;
    jobSiteEntity.name = jobsite.name;
    jobSiteEntity.phone = jobsite.phone;
    jobSiteEntity.email = jobsite.email;

    jobSiteEntity.sizeSqft = jobsite.sizeSqft;
    jobSiteEntity.completedAt = jobsite.completedAt;
    jobSiteEntity.client = jobsite.clientId;
    //jobSiteEntity.haulerId = jobsite.haulerId;

    // const jobSiteDetailsEntity = new JobSiteDetailsEntity();

    // jobSiteDetailsEntity.address = jobsite.address;
    // jobSiteDetailsEntity.powerplants.id = jobsite.powerplants;
    // jobSiteDetailsEntity.completionBy = jobsite.completionBy;
    // jobSiteDetailsEntity.size = jobsite.size;
    // jobSiteDetailsEntity.sustainabilityGoal = jobsite.sustainabilityGoal;
    // jobSiteDetailsEntity.jobSite = jobsite;

    // jobSiteEntity.jobSiteDetails = jobSiteDetailsEntity;

    jobSiteEntity.status = status;
    jobSiteEntity.createdAt = jobsite.createdAt;
    jobSiteEntity.updatedAt = jobsite.updatedAt;

    jobSiteEntity.biomassForCleanEnergy = jobsite.biomassForCleanEnergy;
    jobSiteEntity.plastic = jobsite.plastic;
    jobSiteEntity.metal = jobsite.metal;
    jobSiteEntity.wasteHauling = jobsite.wasteHauling;
    jobSiteEntity.cardBoard = jobsite.cardBoard;
    jobSiteEntity.concrete = jobsite.concrete;
    jobSiteEntity.woodWasteDiverted = jobsite.woodWasteDiverted;

    jobSiteEntity.closedAt = jobsite.closedAt;
    jobSiteEntity.startDate = jobsite.startDate;

    jobSiteEntity.woodWasteRecycled = jobsite.woodWasteRecycled;
    jobSiteEntity.diverted = jobsite.diverted;
    jobSiteEntity.refused = jobsite.refused;
    jobSiteEntity.co2Avoided = jobsite.co2Avoided;
    jobSiteEntity.totalHailed = jobsite.totalHailed;
    jobSiteEntity.totalTonnage = jobsite.totalTonnage;
    jobSiteEntity.mmrLocation = jobsite.mmrLocation;
    jobSiteEntity.title = jobsite.title;
    jobSiteEntity.endClientId = jobsite.endClientId;
    return jobSiteEntity;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getJobSiteStats(id) {
  const globalData = await GlobalDataEntity.findOne({
    where: {
      id: 1,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let totalRefused = 0;
  let totalRefusedWeight = 0;
  //const where = {};
  //where['jobSite.id'] = Number(id);
  const dumpstersRefused = await DumpsterRefusedMmrEntity.find({
    where: { jobSite: { id: Number(id) } },
    order: {
      updatedAt: 'ASC',
    },
  });
  //delete where['jobSite.Id'];
  dumpstersRefused.forEach((dumpster) => {
    totalRefused += Number(dumpster.dumspterCount);
    let woodCollected = 0;
    if (dumpster.dumspterSize == 10) {
      woodCollected = Number(globalData?.tonage10yrd);
    } else if (dumpster.dumspterSize == 20) {
      woodCollected = Number(globalData?.tonage20yrd);
    } else if (dumpster.dumspterSize == 30) {
      woodCollected = Number(globalData?.tonage30yrd);
    } else if (dumpster.dumspterSize == 40) {
      woodCollected = Number(globalData?.tonage40yrd);
    }
    totalRefusedWeight += Number(dumpster.dumspterCount) * woodCollected;
  });

  //where['status'] = 'accept';
  //where['jobSite.id'] = Number(id);
  let totalMiles = 0;
  let totalWaste = 0;
  let totalHauled = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let totalAccepted = 0;
  const smsDumpsters = await SmsDumpsterEntity.find({
    where: {
      jobSite: { id: Number(id) },
      status: SmsDumpsterStatusesEnum.accept,
    },
  });
  smsDumpsters.forEach((smsDumpster) => {
    let woodCollected = 0;
    if (smsDumpster.details['dsSize'] == 10) {
      woodCollected = Number(globalData?.tonage10yrd);
    } else if (smsDumpster.details['dsSize'] == 20) {
      woodCollected = Number(globalData?.tonage20yrd);
    } else if (smsDumpster.details['dsSize'] == 30) {
      woodCollected = Number(globalData?.tonage30yrd);
    } else if (smsDumpster.details['dsSize'] == 40) {
      woodCollected = Number(globalData?.tonage40yrd);
    }
    let mmrCmsMiles = 0;
    if (Number(smsDumpster.jobSite.mmrLocation) == 1) {
      mmrCmsMiles = Number(globalData?.distanceMmrMacomb);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      mmrCmsMiles = Number(globalData?.distanceMmrLivonia);
    }
    const distanceMmr = Number(smsDumpster.dumpster.distanceToMmr);
    totalMiles += distanceMmr;
    totalWaste += woodCollected;

    //totalHauled += (distanceMmr / 21) * mmrCmsMiles;
    //totalHauled += Number((totalWaste / 21).toFixed()) * mmrCmsMiles;

    totalAccepted++;
  });

  const produced = totalMiles * totalWaste * 253;
  let avoided = 958000 * totalWaste;
  avoided = avoided - produced;
  // eslint-disable-next-line prettier/prettier
  totalHauled += totalMiles * totalWaste;

  let percent_delivered = Number(
    Number((100 / (totalWaste + totalRefusedWeight)) * totalWaste).toFixed(2),
  );
  let percent_refused = Number(
    Number(
      (100 / (totalWaste + totalRefusedWeight)) * totalRefusedWeight,
    ).toFixed(2),
  );

  if (isNaN(percent_delivered)) percent_delivered = 0;
  if (isNaN(percent_refused)) percent_refused = 0;

  return {
    percent_delivered: percent_delivered,
    percent_refused: percent_refused,
    totalWaste: totalWaste,
    totalAvoided: avoided,
    totalHauled: Number(totalHauled.toFixed(2)),
    totalTonnage: totalWaste + totalRefusedWeight,
  };
}
