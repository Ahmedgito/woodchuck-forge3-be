import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesService } from 'src/job-sites/job-sites.service';
import { JobSitesWasteStreamsService } from 'src/job-sites-waste-streams/job-sites-waste-streams.service';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { Repository } from 'typeorm';

@Injectable()
export class ExternalApiService {
  private readonly liveStatsBatchSize = 5;

  constructor(
    @InjectRepository(JobSiteEntity)
    private readonly jobSitesRepository: Repository<JobSiteEntity>,
    private readonly jobSitesService: JobSitesService,
    private readonly jobSitesWasteStreamsService: JobSitesWasteStreamsService,
  ) {}

  async findAllJobSites(paginationOptions: IPaginationOptions) {
    const page = paginationOptions.page ?? 1;
    const limit = paginationOptions.limit ?? 50;

    const jobSites = await this.jobSitesRepository
      .createQueryBuilder('jobSite')
      .select('jobSite.id', 'id')
      .orderBy('jobSite.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany();

    const ids = jobSites.map((item) => Number(item.id)).filter((id) => !Number.isNaN(id));
    const results: any[] = [];

    for (let i = 0; i < ids.length; i += this.liveStatsBatchSize) {
      const batch = ids.slice(i, i + this.liveStatsBatchSize);
      const enrichedBatch = await Promise.all(batch.map((id) => this.findJobSiteById(id)));
      results.push(...enrichedBatch.filter((item) => item !== null));
    }

    return results;
  }

  async findJobSiteById(id: number) {
    const [jobSite, jobSiteWithCredit] = await Promise.all([
      this.jobSitesService.findOne({ id }, null, null),
      this.jobSitesRepository
        .createQueryBuilder('jobSite')
        .leftJoinAndSelect('jobSite.carbonCredit', 'carbonCredit')
        .where('jobSite.id = :id', { id })
        .getOne(),
    ]);

    if (!jobSite) return null;

    const { startDate, endDate } = this.getStatsDateRange(jobSite);
    const [
      treeGraphStatsRaw,
      treeGraphDiversionStatsRaw,
      treeGraphWasteStreamsTypeStatsRaw,
      treeGraphWoodWasteDiversionStatsRaw,
    ] = await Promise.all([
      this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
        startDate,
        endDate,
        id,
      ),
      this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
        startDate,
        endDate,
        id,
      ),
      this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
        startDate,
        endDate,
        id,
      ),
      this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
        startDate,
        endDate,
        id,
      ),
    ]);

    const treeStats = {
      ...this.safeStatsObject(treeGraphStatsRaw),
      ...this.safeStatsObject(treeGraphDiversionStatsRaw),
      ...this.safeStatsObject(treeGraphWasteStreamsTypeStatsRaw),
      ...this.safeStatsObject(treeGraphWoodWasteDiversionStatsRaw),
    };

    return this.sanitizeJobSite({
      ...(jobSite as any),
      carbonCredit: jobSiteWithCredit?.carbonCredit ?? null,
    }, treeStats);
  }

  private sanitizeJobSite(js: any, extraStats: Record<string, any> = {}) {
    return {
      id: js.id,
      name: js.name,
      title: js.title,
      street: js.street,
      city: js.city,
      state: js.state,
      zipcode: js.zipcode,
      address: js.address
        ? {
            addressFull: js.address.addressFull,
            addressLine1: js.address.addressLine1,
            city: js.address.city,
            state: js.address.state,
            postalCode: js.address.postalCode,
          }
        : null,
      status: js.status
        ? { id: js.status.id, name: js.status.name }
        : null,
      startDate: js.startDate,
      closedAt: js.closedAt,
      completedAt: js.completedAt,
      sizeSqft: js.sizeSqft,
      totalTonnage: js.totalTonnage,
      woodWasteRecycled: js.woodWasteRecycled,
      diverted: js.diverted,
      refused: js.refused,
      co2Avoided: js.co2Avoided,
      totalHailed: js.totalHailed,
      woodWasteDiverted: js.woodWasteDiverted,
      cardBoard: js.cardBoard,
      wasteHauling: js.wasteHauling,
      metal: js.metal,
      plastic: js.plastic,
      biomassForCleanEnergy: js.biomassForCleanEnergy,
      concrete: js.concrete,
      carbonCreditDollars: js.carbonCredit
        ? Number(js.carbonCredit.carbonCreditDollars)
        : 0,
      clientId: js.clientId,
      clientName: js.clientName ?? js.client?.name ?? null,
      createdAt: js.createdAt,
      updatedAt: js.updatedAt,
      ...extraStats,
    };
  }

  private getStatsDateRange(jobSite: any): { startDate: string; endDate: string } {
    const start = new Date(jobSite?.startDate ?? jobSite?.createdAt ?? '2000-01-01');
    const end = new Date();

    const safeStart = Number.isNaN(start.getTime())
      ? '2000-01-01'
      : start.toISOString().slice(0, 10);
    const safeEnd = Number.isNaN(end.getTime())
      ? '2099-12-31'
      : end.toISOString().slice(0, 10);

    return { startDate: safeStart, endDate: safeEnd };
  }

  private safeStatsObject(value: any): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    if ('message' in value && 'stack' in value) {
      return {};
    }
    return value;
  }
}
