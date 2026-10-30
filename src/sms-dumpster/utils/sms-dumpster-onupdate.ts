import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { DumpsterStatusEntity } from 'src/dumpster-status/infrastructure/persistence/relational/entities/dumpster-status.entity';
import { GlobalDataEntity } from 'src/global-data/infrastructure/persistence/relational/entities/global-data.entity';
import { SmsDumpster } from '../domain/sms-dumpster';
import { SmsDumpsterStatusesEnum } from '../sms-dumpster-statuses.enum';

async function smsDumpsterOnUpdate(dt: SmsDumpster, reset = false) {
  if (dt.status == SmsDumpsterStatusesEnum.accept) {
    const globalData = await GlobalDataEntity.findOne({
      where: {
        id: Number(process.env.GLOBAL_DATA_DB_ID) ?? 1,
      },
    });

    // let distanceMmr = 0;
    // if (dt.jobSite.mmrLocation == 1) {
    //   distanceMmr = Number(globalData?.distanceMmrMacomb);
    // } else {
    //   distanceMmr = Number(globalData?.distanceMmrLivonia);
    // }
    let woodCollected = 0;
    if (dt.details['dsSize'] == 10) {
      woodCollected = Number(globalData?.tonage10yrd);
    } else if (dt.details['dsSize'] == 20) {
      woodCollected = Number(globalData?.tonage20yrd);
    } else if (dt.details['dsSize'] == 30) {
      woodCollected = Number(globalData?.tonage30yrd);
    } else if (dt.details['dsSize'] == 40) {
      woodCollected = Number(globalData?.tonage40yrd);
    }
    const distanceMmr = Number(dt.dumpster.distanceToMmr);
    let dumpsterStatus = await DumpsterStatusEntity.findOne({
      where: {
        jobSite: { id: dt.jobSite.id },
        dumpsterLocationId: dt.dumpster.id,
        dumspterSize: dt.details['dsSize'],
      },
    });
    if (!dumpsterStatus) {
      dumpsterStatus = await DumpsterStatusEntity.save(
        DumpsterStatusEntity.create({
          jobSite: { id: Number(dt.jobSite.id) },
          dumpsterLocationId: Number(dt.dumpster.id),
          dumspterSize: dt.details['dsSize'],
        }),
      );
    }

    let dumspterCount =
      dumpsterStatus.dumspterCount == null ? 0 : dumpsterStatus.dumspterCount;
    reset === true && dumspterCount++;
    dumpsterStatus.dumspterCount = dumspterCount;
    dumpsterStatus.miles = dumspterCount * distanceMmr;
    dumpsterStatus.waste = dumspterCount * woodCollected;
    await dumpsterStatus.save();

    const dumpsterRefusedMmr = await DumpsterRefusedMmrEntity.findOne({
      where: {
        jobSite: { id: dt.jobSite.id },
        dumpsterLocationId: dt.dumpster.id,
        dumspterSize: dt.details['dsSize'],
      },
    });
    if (!dumpsterRefusedMmr) {
      await DumpsterRefusedMmrEntity.save(
        DumpsterRefusedMmrEntity.create({
          jobSite: { id: Number(dt.jobSite.id) },
          dumpsterLocationId: Number(dt.dumpster.id),
          dumspterSize: dt.details['dsSize'],
        }),
      );
    }
  }
}

export default smsDumpsterOnUpdate;
