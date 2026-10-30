import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipAll } from 'src/auth/skip-all.decorator';

/**
 * Liveness vs readiness:
 *  - /health        — process is alive. Cheap. Used by load balancer target
 *                     group / CloudWatch synthetic canaries.
 *  - /health/ready  — process is ready to serve traffic. Pings the DB and
 *                     checks heap. Use this for orchestrator readiness.
 *
 * Both are public (SkipAll bypasses JwtAuthGuard) and excluded from request
 * logging in logger.constants.ts.
 */
@ApiTags('Health')
@SkipAll()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([
      // 512MB heap ceiling — adjust if your instance is larger.
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
