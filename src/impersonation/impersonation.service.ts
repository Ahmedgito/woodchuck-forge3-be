import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImpersonationLogEntity } from './infrastructure/persistence/relational/entities/impersonation-log.entity';

@Injectable()
export class ImpersonationService {
  constructor(
    @InjectRepository(ImpersonationLogEntity)
    private readonly impersonationRepository: Repository<ImpersonationLogEntity>,
  ) {}

  async createLog(superAdminId: number, targetUserId: number, reason?: string) {
    const entity = this.impersonationRepository.create({
      superAdmin: { id: superAdminId } as any,
      targetUser: { id: targetUserId } as any,
      reason: reason ?? null,
    });

    return this.impersonationRepository.save(entity);
  }

  async endLog(id: number) {
    const log = await this.impersonationRepository.findOne({ where: { id } });
    if (!log) return null;
    log.endedAt = new Date();
    return this.impersonationRepository.save(log);
  }
}
