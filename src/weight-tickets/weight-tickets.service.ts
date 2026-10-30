import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSitesWastestreamsDumpstersService } from 'src/job-sites-wastestreams-dumpsters/job-sites-wastestreams-dumpsters.service';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { FileRepository } from 'src/files/infrastructure/persistence/file.repository';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import fileConfig from 'src/files/config/file.config';
import { FileType } from 'src/files/domain/file';
import { ApplyTicketDto } from './dto/apply-ticket.dto';

const DEFAULT_WEIGHT_TICKET_ML_SERVICE = 'https://weight-ticket-dev.folio3.site';
const WEIGHT_TICKET_ML_TIMEOUT_MS = 120_000;

export interface TicketExtraction {
  date: string;
  tonnage: number;
  material: string;
  address: string;
}

@Injectable()
export class WeightTicketsService {
  private readonly logger = new Logger(WeightTicketsService.name);

  constructor(
    @InjectRepository(JobSitesWasteStreamsEntity)
    private readonly wasteStreamsRepo: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private readonly dumpstersRepo: Repository<JobSiteWastestreamsDumpstersEntity>,
    private readonly dumpstersService: JobSitesWastestreamsDumpstersService,
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  // Legacy JSON path: client already uploaded via /files/upload and sends fileId.
  // Returns the interim TicketExtraction shape until the OCR/LLM service is wired in.
  processTicket(_fileId: string): TicketExtraction {
    return this.buildInterimExtraction();
  }

  // Multipart path: client uploads the ticket image + waste stream context in one request.
  async processTicketWithUpload(
    file: Express.Multer.File | Express.MulterS3.File | undefined,
    wasteStreamId: number,
    materialType: string,
  ): Promise<TicketExtraction> {
    if (!file) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { file: 'selectFile' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!Number.isFinite(wasteStreamId) || wasteStreamId <= 0) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { wasteStreamId: 'invalidWasteStreamId' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!materialType || !materialType.trim()) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { materialType: 'required' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const stream = await this.wasteStreamsRepo.findOne({
      where: { id: wasteStreamId },
      withDeleted: true,
    });
    if (!stream) {
      throw new HttpException('Waste stream not found', HttpStatus.NOT_FOUND);
    }

    const persistedFile = await this.persistUploadedFile(file);

    const ticketUrl = this.buildTicketUrl(persistedFile.path);
    const serverUrl = (
      this.configService.get<string>('WEIGHT_TICKET_ML_SERVICE', {
        infer: true,
      }) ?? DEFAULT_WEIGHT_TICKET_ML_SERVICE
    ).replace(/\/+$/, '');
    const endpoint = `${serverUrl}/process`;

    this.logger.log(
      `Weight ticket received: fileId=${persistedFile.id} wasteStreamId=${wasteStreamId} materialType="${materialType}". Calling ML service ${endpoint} for ${ticketUrl}`,
    );

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ticketUrl }),
        signal: AbortSignal.timeout(WEIGHT_TICKET_ML_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(
        `Weight ticket ML request failed: ${(err as Error).message}`,
      );
      throw new HttpException(
        'Failed to process weight ticket image',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.logger.error(
        `Weight ticket ML returned ${response.status}: ${bodyText}`,
      );
      throw new HttpException(
        'Failed to process weight ticket image',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    this.logger.log(
      `Weight ticket ML response: ${JSON.stringify(data)}`,
    );

    return this.mapMlResponse(data, materialType);
  }

  async applyTicket(dto: ApplyTicketDto) {
    const { wasteStreamId, date, tonnage, action } = dto;

    // [APPLY:1] Inbound request — full DTO. Confirms what the client sent
    // (date / tonnage / action) before any processing.
    this.logger.log(
      `[APPLY:1] request wasteStreamId=${wasteStreamId} date="${date}" tonnage=${tonnage} action=${action}`,
    );

    const stream = await this.wasteStreamsRepo.findOne({
      where: { id: wasteStreamId },
      relations: { jobSitesWasteStreamsDumpsters: true },
      withDeleted: true,
    });

    if (!stream) {
      this.logger.warn(
        `[APPLY:2] stream not found wasteStreamId=${wasteStreamId}`,
      );
      throw new HttpException('Waste stream not found', HttpStatus.NOT_FOUND);
    }

    // [APPLY:2] Stream loaded. deletedAt != null means the stream is closed —
    // affects whether 'add' is allowed and which error fires on overwrite miss.
    this.logger.log(
      `[APPLY:2] stream loaded id=${stream.id} deletedAt=${stream.deletedAt ? stream.deletedAt.toISOString?.() ?? String(stream.deletedAt) : 'null'} totalDumpstersIncludingDeleted=${stream.jobSitesWasteStreamsDumpsters?.length ?? 0}`,
    );

    const targetDate = new Date(date);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // [APPLY:3] Month window — overwrite/match logic is scoped to this range.
    // If the parsed date looks wrong (e.g. ML returned a past year), it's
    // visible here.
    this.logger.log(
      `[APPLY:3] targetDate=${isNaN(targetDate.getTime()) ? 'INVALID' : targetDate.toISOString()} monthStart=${monthStart.toISOString()} monthEnd=${monthEnd.toISOString()}`,
    );

    const allDumpsters =
      stream.jobSitesWasteStreamsDumpsters?.filter((d) => !d.deletedAt) ?? [];

    // [APPLY:4] All non-deleted dumpsters on the stream (any month).
    this.logger.log(
      `[APPLY:4] non-deleted dumpsters count=${allDumpsters.length}`,
    );

    const monthDumpsters = allDumpsters
      .filter((d) => {
        const cd = new Date(d.creationDate);
        return isWithinInterval(cd, { start: monthStart, end: monthEnd });
      })
      .sort((a, b) => {
        const dateDiff =
          new Date(a.creationDate).getTime() -
          new Date(b.creationDate).getTime();
        return dateDiff || a.id - b.id;
      });

    // [APPLY:5] Dumpsters in the target month, ordered oldest→newest. The
    // overwrite branches always touch the LAST entry of the matching subset.
    this.logger.log(
      `[APPLY:5] month dumpsters count=${monthDumpsters.length} ids=[${monthDumpsters
        .map(
          (d) =>
            `${d.id}(${new Date(d.creationDate).toISOString().slice(0, 10)},est=${d.estimated_weight},real=${d.real_weight})`,
        )
        .join(', ')}]`,
    );

    if (action === 'add') {
      if (stream.deletedAt) {
        this.logger.warn(
          `[APPLY:6a] add blocked — stream is closed wasteStreamId=${wasteStreamId}`,
        );
        throw new HttpException(
          'This waste stream is closed and you can no longer add a dumpster.',
          HttpStatus.FORBIDDEN,
        );
      }

      // Direct DB write — avoid Bull/Redis here so apply is synchronous and
      // the mobile UI doesn't hang on "Saving..." if Redis isn't reachable.
      // Mirror the queue consumer exactly: write whatever calculateEstWeight()
      // returns (0 if relations can't compute it). Storing null here makes the
      // web's vessel views skip the row, since historic rows always had a
      // numeric estimated_weight.
      const estWeight =
        typeof stream.calculateEstWeight === 'function'
          ? stream.calculateEstWeight()
          : 0;
      this.logger.log(
        `[APPLY:6b] add — creating dumpster creationDate=${targetDate.toISOString()} estimated=${estWeight} real=${tonnage}`,
      );
      const saved = await this.dumpstersRepo.save(
        this.dumpstersRepo.create({
          creationDate: targetDate,
          estimated_weight: estWeight,
          real_weight: tonnage,
          jobSiteWastestreams: { id: wasteStreamId },
        }),
      );
      this.logger.log(
        `[APPLY:6c] added dumpster id=${saved.id} wasteStreamId=${wasteStreamId} tonnage=${tonnage}`,
      );
      return { action: 'added', dumpsterId: saved.id, success: true };
    }

    // action === 'overwrite'
    const estimated = monthDumpsters.filter(
      (d) => d.estimated_weight != null && d.real_weight == null,
    );
    this.logger.log(
      `[APPLY:7] overwrite — estimated-only count=${estimated.length} ids=[${estimated.map((d) => d.id).join(', ')}]`,
    );
    if (estimated.length > 0) {
      const last = estimated[estimated.length - 1];
      this.logger.log(
        `[APPLY:7a] overwriting estimated dumpster id=${last.id} prevReal=${last.real_weight} newReal=${tonnage}`,
      );
      await this.dumpstersRepo.update({ id: last.id }, { real_weight: tonnage });
      this.logger.log(
        `[APPLY:7b] overwrote estimated dumpster id=${last.id} tonnage=${tonnage}`,
      );
      return { action: 'overwritten', dumpsterId: last.id, success: true };
    }

    if (stream.deletedAt) {
      this.logger.warn(
        `[APPLY:8] overwrite miss on closed stream — no estimated vessel in month wasteStreamId=${wasteStreamId}`,
      );
      throw new HttpException(
        'No estimated vessel was found for the selected month',
        HttpStatus.NOT_FOUND,
      );
    }

    const confirmed = monthDumpsters.filter((d) => d.real_weight != null);
    this.logger.log(
      `[APPLY:9] overwrite fallback — confirmed count=${confirmed.length} ids=[${confirmed.map((d) => d.id).join(', ')}]`,
    );
    if (confirmed.length > 0) {
      const last = confirmed[confirmed.length - 1];
      this.logger.log(
        `[APPLY:9a] overwriting confirmed dumpster id=${last.id} prevReal=${last.real_weight} newReal=${tonnage}`,
      );
      await this.dumpstersRepo.update({ id: last.id }, { real_weight: tonnage });
      this.logger.log(
        `[APPLY:9b] overwrote confirmed dumpster id=${last.id} tonnage=${tonnage}`,
      );
      return { action: 'overwritten', dumpsterId: last.id, success: true };
    }

    this.logger.warn(
      `[APPLY:10] overwrite miss — no vessel in month wasteStreamId=${wasteStreamId} month=${monthStart.toISOString().slice(0, 7)}`,
    );
    throw new HttpException(
      'No vessel was found for the selected month',
      HttpStatus.NOT_FOUND,
    );
  }

  private buildInterimExtraction(materialType?: string): TicketExtraction {
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      tonnage: 1.1,
      material: materialType?.trim() || 'C&D',
      address: '',
    };
  }

  // Build a publicly reachable URL the ML service can fetch. For S3 drivers
  // we expand the stored key into a region-qualified https URL; the local
  // driver already stores a server-relative path that won't be reachable from
  // the ML host, so it's rejected here rather than silently failing.
  private buildTicketUrl(storedPath: string): string {
    const driver = this.configService.get('file.driver', { infer: true }) as
      | FileConfig['driver']
      | undefined;

    if (driver === FileDriver.LOCAL) {
      throw new HttpException(
        'Weight ticket ML processing requires S3 storage (set FILE_DRIVER=s3 or s3-presigned).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (/^https?:\/\//i.test(storedPath)) {
      return storedPath;
    }

    const cfg = fileConfig() as FileConfig;
    const bucket = cfg.awsDefaultS3Bucket;
    const region = cfg.awsS3Region;
    if (!bucket || !region) {
      throw new HttpException(
        'AWS_DEFAULT_S3_BUCKET / AWS_S3_REGION are not configured.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const key = storedPath.replace(/^\/+/, '');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // ML response shape:
  //   { success: true, source_url: "...", data: { Date, Weight, Unit, Material, Address } }
  // Older/alternate shapes are tolerated by also searching the root object.
  private mapMlResponse(
    body: Record<string, unknown>,
    materialType: string,
  ): TicketExtraction {
    const inner =
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : {};

    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        const v = inner[k] ?? body[k];
        if (v != null && v !== '') return v;
      }
      return undefined;
    };

    const rawDate = pick('Date', 'date', 'ticket_date', 'ticketDate');
    const rawWeight = pick(
      'Weight',
      'weight',
      'tonnage',
      'net_weight',
      'netWeight',
      'tons',
    );
    const rawUnit = pick('Unit', 'unit');
    const rawMaterial = pick('Material', 'material', 'material_type');
    const rawAddress = pick('Address', 'address', 'location', 'site_address');

    const parsedDate =
      typeof rawDate === 'string' && rawDate.trim()
        ? this.normalizeDate(rawDate)
        : format(new Date(), 'yyyy-MM-dd');

    const weightNum =
      typeof rawWeight === 'number'
        ? rawWeight
        : typeof rawWeight === 'string'
          ? Number(rawWeight.replace(/[^\d.-]/g, ''))
          : NaN;

    // Normalize to tons. Anything that isn't TON is assumed to be pounds.
    const unit = typeof rawUnit === 'string' ? rawUnit.trim().toUpperCase() : '';
    const tonnage = !Number.isFinite(weightNum)
      ? 0
      : unit === 'TON' || unit === 'TONS' || unit === ''
        ? weightNum
        : unit === 'LB' || unit === 'LBS' || unit === 'POUND' || unit === 'POUNDS'
          ? weightNum / 2000
          : weightNum;

    return {
      date: parsedDate,
      tonnage,
      material:
        (typeof rawMaterial === 'string' && rawMaterial.trim()) ||
        materialType.trim() ||
        'C&D',
      address: typeof rawAddress === 'string' ? rawAddress : '',
    };
  }

  // ML returns dates as M/D/YYYY ("4/25/2025"); also accepts ISO and other
  // Date-parseable forms. Falls back to the raw string if unparseable.
  private normalizeDate(value: string): string {
    const trimmed = value.trim();
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const [, m, d, y] = slash;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    return trimmed;
  }

  // Mirrors how FilesLocalService / FilesS3Service persist the upload, so the
  // future OCR/LLM service can fetch by file id regardless of storage driver.
  private async persistUploadedFile(
    file: Express.Multer.File | Express.MulterS3.File,
  ): Promise<FileType> {
    const driver = this.configService.get('file.driver', { infer: true }) as
      | FileConfig['driver']
      | undefined;

    if (driver === FileDriver.LOCAL) {
      const local = file as Express.Multer.File;
      const apiPrefix = this.configService.get('app.apiPrefix', {
        infer: true,
      });
      return this.fileRepository.create({
        path: `/${apiPrefix}/v1/${local.path}`,
      });
    }

    // S3 / S3-presigned both store the object key on the uploaded file.
    const s3 = file as Express.MulterS3.File;
    return this.fileRepository.create({ path: s3.key });
  }
}
