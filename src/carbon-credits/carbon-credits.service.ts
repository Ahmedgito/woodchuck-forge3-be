import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarbonCreditEntity } from './infrastructure/persistence/relational/entities/carbon-credit.entity';
import { UpsertCarbonCreditDto } from './dto/upsert-carbon-credit.dto';

export type CarbonCreditWebhookResponse = {
  id: number;
  jobSiteId: number;
  carbonCreditDollars: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CarbonCreditsService {
  constructor(
    @InjectRepository(CarbonCreditEntity)
    private readonly carbonCreditRepo: Repository<CarbonCreditEntity>,
  ) {}

  async upsert(dto: UpsertCarbonCreditDto): Promise<CarbonCreditWebhookResponse> {
    const existing = await this.carbonCreditRepo.findOne({
      where: { jobSiteId: dto.jobSiteId },
    });

    if (existing) {
      await this.carbonCreditRepo.update(existing.id, {
        carbonCreditDollars: dto.carbonCreditDollars,
      });
      const updated = await this.carbonCreditRepo.findOneOrFail({
        where: { id: existing.id },
      });
      return this.toWebhookResponse(updated);
    }

    const entity = this.carbonCreditRepo.create({
      jobSiteId: dto.jobSiteId,
      carbonCreditDollars: dto.carbonCreditDollars,
    });
    const saved = await this.carbonCreditRepo.save(entity);
    return this.toWebhookResponse(saved);
  }

  async upsertBulk(
    dtos: UpsertCarbonCreditDto[],
  ): Promise<CarbonCreditWebhookResponse[]> {
    const results: CarbonCreditWebhookResponse[] = [];
    for (const dto of dtos) {
      results.push(await this.upsert(dto));
    }
    return results;
  }

  async findByJobSiteId(
    jobSiteId: number,
  ): Promise<CarbonCreditEntity | null> {
    return this.carbonCreditRepo.findOne({ where: { jobSiteId } });
  }

  async getClientAggregation(
    clientId: number,
  ): Promise<{ totalCo2Value: number; totalCarbonCreditDollars: number }> {
    const result = await this.carbonCreditRepo
      .createQueryBuilder('cc')
      .innerJoin('cc.jobSite', 'js')
      .innerJoin('js.client', 'client')
      .where('client.id = :clientId', { clientId })
      .select('COALESCE(SUM(cc.co2Value), 0)', 'totalCo2Value')
      .addSelect(
        'COALESCE(SUM(cc.carbonCreditDollars), 0)',
        'totalCarbonCreditDollars',
      )
      .getRawOne();

    return {
      totalCo2Value: parseFloat(result.totalCo2Value) || 0,
      totalCarbonCreditDollars:
        parseFloat(result.totalCarbonCreditDollars) || 0,
    };
  }

  async getAdminAggregation(): Promise<{
    totalCo2Value: number;
    totalCarbonCreditDollars: number;
  }> {
    const result = await this.carbonCreditRepo
      .createQueryBuilder('cc')
      .select('COALESCE(SUM(cc.co2Value), 0)', 'totalCo2Value')
      .addSelect(
        'COALESCE(SUM(cc.carbonCreditDollars), 0)',
        'totalCarbonCreditDollars',
      )
      .getRawOne();

    return {
      totalCo2Value: parseFloat(result.totalCo2Value) || 0,
      totalCarbonCreditDollars:
        parseFloat(result.totalCarbonCreditDollars) || 0,
    };
  }

  async getClientBreakdown(): Promise<
    {
      clientId: number;
      clientName: string;
      totalCo2Value: number;
      totalCarbonCreditDollars: number;
    }[]
  > {
    const results = await this.carbonCreditRepo
      .createQueryBuilder('cc')
      .innerJoin('cc.jobSite', 'js')
      .innerJoin('js.client', 'client')
      .select('client.id', 'clientId')
      .addSelect('client.name', 'clientName')
      .addSelect('COALESCE(SUM(cc.co2Value), 0)', 'totalCo2Value')
      .addSelect(
        'COALESCE(SUM(cc.carbonCreditDollars), 0)',
        'totalCarbonCreditDollars',
      )
      .groupBy('client.id')
      .addGroupBy('client.name')
      .getRawMany();

    return results.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName,
      totalCo2Value: parseFloat(r.totalCo2Value) || 0,
      totalCarbonCreditDollars: parseFloat(r.totalCarbonCreditDollars) || 0,
    }));
  }

  private toWebhookResponse(
    entity: CarbonCreditEntity,
  ): CarbonCreditWebhookResponse {
    return {
      id: entity.id,
      jobSiteId: entity.jobSiteId,
      carbonCreditDollars: Number(entity.carbonCreditDollars),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
