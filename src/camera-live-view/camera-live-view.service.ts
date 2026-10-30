import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as ping from 'ping';
import DigestFetch from '@mhoc/axios-digest-auth';
import https from 'https';
import { In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CameraLiveViewEntity } from './infrastructure/persistence/relational/entities/camera-live-view.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import axios from 'axios';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { FilesS3PresignedService } from 'src/files/infrastructure/uploader/s3-presigned/files.service';
import { MailService } from 'src/mail/mail.service';
import { AlertToType } from 'src/job-sites-cameras/alertToType.enum';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Injectable()
export class CameraLiveViewService {
  private readonly logger = new Logger(CameraLiveViewService.name);
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileService: FilesS3PresignedService,
    private readonly mailService: MailService,
    @InjectRepository(CameraLiveViewEntity)
    private CameraLiveViewRepository: Repository<CameraLiveViewEntity>,
    @InjectRepository(HaulerEntity)
    private haulerRepository: Repository<HaulerEntity>,
    @InjectRepository(CameraEntity)
    private cameraRepository: Repository<CameraEntity>,
    @InjectRepository(WasteStreamCamerasEntity)
    private wasteStreamCamerasRepository: Repository<WasteStreamCamerasEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {}

  private readonly MAX_RETRIES = 3;

  private async getCameraAvailability(ip: string): Promise<boolean> {
    const isWindows = process.platform === 'win32';
    const pingArgs = isWindows ? ['-n', '1'] : ['-c', '1'];

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const res = await ping.promise.probe(ip, {
          timeout: 3,
          extra: pingArgs,
        });

        if (res.alive) {
          this.logger.log(`Camera at ${ip} is alive (attempt ${attempt})`);
          return true;
        }

        this.logger.warn(`Camera at ${ip} not alive (attempt ${attempt})`);
      } catch (error) {
        this.logger.error(
          `Error pinging camera at ${ip} (attempt ${attempt}):`,
          error,
        );
      }
    }

    return false;
  }

  private async getCameraImage(url: string) {
    const { username, password } = this.configService.getOrThrow<{
      username: string;
      password: string;
    }>('camera', { infer: true });

    const digestAuth = new DigestFetch({
      username: username,
      password: password,
    });

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const response = await digestAuth.request({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      httpsAgent: httpsAgent,
    });

    return response.data;
  }

  private getRefreshButtonStatus(): boolean {
    const { timezone, cameraStartTime, cameraEndTime } =
      this.configService.getOrThrow<{
        timezone: string;
        cameraStartTime: string;
        cameraEndTime: string;
      }>('camera', { infer: true });

    const now = new Date();

    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    let hour = Number(
      localTime.find((part) => part.type === 'hour')?.value || 0,
    );
    const minute = Number(
      localTime.find((part) => part.type === 'minute')?.value || 0,
    );

    if (hour === 24) {
      hour = 0;
    }

    const currentMinutes = hour * 60 + minute;
    const [startHour, startMinute] = cameraStartTime.split(':').map(Number);
    const [endHour, endMinute] = cameraEndTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  async findOne(id: string) {
    const CameraLiveView = await this.CameraLiveViewRepository.findOne({
      where: { id: Number(id) },
    });
    return CameraLiveView;
  }

  async findByCameraId(wasteStreamId: number, refresh = false) {
    try {
      if (refresh) {
        await this.getCameraLiveDetails(wasteStreamId);
      }

      const streamCameras = await this.wasteStreamCamerasRepository.find({
        where: { jobsiteWasteStream: { id: wasteStreamId } },
        relations: ['camera', 'additionalCamera'],
      });

      if (!streamCameras.length) {
        throw new HttpException(
          `No cameras found for waste stream ID ${wasteStreamId}.`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Extract unique camera IDs in one pass
      const cameraMap = new Map<string, CameraEntity>();
      for (const { camera, additionalCamera } of streamCameras) {
        if (camera) cameraMap.set(camera.cameraId, camera);
        if (additionalCamera)
          cameraMap.set(additionalCamera.cameraId, additionalCamera);
      }

      const cameraIds = [...cameraMap.keys()];
      if (!cameraIds.length) {
        throw new HttpException(
          `No valid cameras found for waste stream ID ${wasteStreamId}.`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Fetch live view records
      const liveViews = await this.CameraLiveViewRepository.find({
        where: { cameraId: In(cameraIds) },
      });

      // Build a quick lookup map for live views
      const liveViewMap = new Map(liveViews.map((lv) => [lv.cameraId, lv]));

      // Merge live view data into camera objects
      const mergedCameras = cameraIds.map((id) => {
        const camera = cameraMap.get(id);
        const liveView = liveViewMap.get(id) ?? null;
        return {
          ...camera,
          ...liveView,
        };
      });

      return { cameras: mergedCameras };
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  private async getRecipientForWasteStreamCamera(
    wasteStreamCamera: WasteStreamCamerasEntity,
  ) {
    if (!wasteStreamCamera)
      return { recipientName: null, recipientEmail: null };

    const associatedJobsite = wasteStreamCamera.jobsiteWasteStream?.jobSite;
    if (!associatedJobsite)
      return { recipientName: null, recipientEmail: null };

    let recipient;

    if (wasteStreamCamera.alertToType === AlertToType.HAULER) {
      recipient = await this.haulerRepository.findOne({
        where: { id: wasteStreamCamera.alertTo },
      });
    } else {
      recipient = associatedJobsite;
    }

    const { name: recipientName, email: recipientEmail } = recipient || {};
    return { recipientName, recipientEmail };
  }

  async update(
    wasteStreamId: number,
    cameraIds: string[],
    cameraArr: { camera_id: string; s3_url: string | null }[],
  ) {
    try {
      if (cameraArr && cameraArr.length > 0) {
        // ---------- Get WS & threshold (maxLevel) ----------
        const [wasteStream, wsCameraRecord] = await Promise.all([
          this.jobSitesWasteStreamsRepository.findOne({
            where: { id: wasteStreamId },
            relations: ['jobSite', 'wasteStream', 'wasteStreamType'],
          }),
          this.wasteStreamCamerasRepository.findOne({
            where: { jobsiteWasteStream: { id: wasteStreamId } },
            relations: {
              jobsiteWasteStream: { jobSite: true },
            },
          }),
        ]);

        if (!wasteStream) {
          throw new HttpException(
            'Waste stream not found',
            HttpStatus.NOT_FOUND,
          );
        }

        const threshold = wsCameraRecord?.maxLevel ?? 0;

        // ---------- Existing camera live views ----------
        const existingViews = await this.CameraLiveViewRepository.find({
          where: { cameraId: In(cameraIds) },
        });
        const viewMap = new Map(existingViews.map((v) => [v.cameraId, v]));

        // If any camera was already "polluted & above threshold", we consider
        // the notification already effectively sent for this waste stream.
        const previouslyPollutedTriggered =
          existingViews.some((v) => v.isPolluted === true) || false;

        const previouslyFillLevelTriggered =
          existingViews.some(
            (v) =>
              threshold == null ||
              (typeof v.folio3FillPercentage === 'number' &&
                v.folio3FillPercentage >= threshold),
          ) || false;

        // ---------- Call ML API ----------
        const mlAPI = this.configService.getOrThrow('app.mlBackendDomain', {
          infer: true,
        });
        const API_URL = `${mlAPI}/predict`;

        const payload = { cameras: cameraArr }; // [{ cameraId, s3ImageUrl }, ...]
        let resultsByCamera: Record<
          string,
          {
            fill_level?: number;
            is_polluted?: boolean;
            confidence?: number;
            wood_type_predictions?:
              | [string, number]
              | Array<any>
              | Record<string, any>;
          }
        > = {};

        try {
          const { data = {} } = await axios.post(API_URL, payload);
          // Support multiple possible shapes:
          // 1) { results: { [cameraId]: { fill_level, is_polluted, ... } } }
          // 2) { results: [{ cameraId, fill_level, ...}, ...] }
          // 3) Flat { fill_level, is_polluted, wood_type_predictions } -> apply to all
          if (
            data?.results &&
            typeof data.results === 'object' &&
            !Array.isArray(data.results)
          ) {
            resultsByCamera = data.results;
          } else if (Array.isArray(data?.results)) {
            resultsByCamera = Object.fromEntries(
              data.results
                .map((r: any) => {
                  const id = String(r.cameraId ?? r.id ?? '');
                  if (!id) return null;
                  return [id, r];
                })
                .filter(Boolean) as [string, any][],
            );
          } else {
            // Fallback single values for all cameras
            resultsByCamera = Object.fromEntries(
              cameraIds.map((id) => [
                id,
                {
                  fill_level: data.fill_level,
                  is_polluted: data.is_polluted,
                  wood_type_predictions: data.wood_type_predictions,
                },
              ]),
            );
          }

          this.logger.log(
            `ML API results for cameras ${cameraIds.join(', ')}: ${JSON.stringify(
              resultsByCamera,
            )}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Error calling ML API for cameras ${cameraIds.join(', ')}: ${error?.message}`,
          );
          // Continue with existing DB values if ML fails
        }

        // ---------- Determine waste stream type name for confidence mapping ----------
        const wasteStreamTypeName = wasteStream.wasteStreamType?.name ?? null;

        // ---------- Build saves & notifications ----------
        const enableRefresh = this.getRefreshButtonStatus();

        let isWSPolluted = previouslyPollutedTriggered;
        let fillPercentage = 0; // Default fill level if not set by ML
        for (const cameraId of cameraIds) {
          const existing = viewMap.get(cameraId);

          // Merge from ML result or fallback to existing
          const ml = resultsByCamera[cameraId] || {};
          const folio3FillPercentage =
            (typeof ml.fill_level === 'number' ? ml.fill_level : undefined) ??
            existing?.folio3FillPercentage ??
            0;

          const isPolluted =
            (typeof ml.is_polluted === 'boolean'
              ? ml.is_polluted
              : undefined) ??
            existing?.isPolluted ??
            false;

          isWSPolluted = isPolluted;
          fillPercentage = folio3FillPercentage;

          // Confidence logic: if ML provides wood_type_predictions, set confidence
          // only if it matches wasteStreamTypeName; else 0 (or keep existing if not provided).
          let folio3ConfidenceLevel =
            (typeof (ml as any).confidence === 'number'
              ? (ml as any).confidence
              : undefined) ??
            existing?.folio3ConfidenceLevel ??
            0;

          if (ml.wood_type_predictions && wasteStreamTypeName) {
            let predictedType: string | null = null;
            let predictedConfidence: number | null = null;

            // Support [type, confidence], array of arrays, or object shapes
            if (Array.isArray(ml.wood_type_predictions)) {
              // e.g., ['Pallet Wood', 0.87] or [{label, score}, ...]
              if (
                ml.wood_type_predictions.length >= 2 &&
                typeof ml.wood_type_predictions[0] === 'string' &&
                typeof ml.wood_type_predictions[1] === 'number'
              ) {
                predictedType = ml.wood_type_predictions[0];
                predictedConfidence = ml.wood_type_predictions[1];
              } else if (
                ml.wood_type_predictions.length &&
                typeof ml.wood_type_predictions[0] === 'object'
              ) {
                const best = ml.wood_type_predictions[0];
                predictedType = best.label ?? best.type ?? null;
                predictedConfidence =
                  typeof best.score === 'number' ? best.score : null;
              }
            } else if (typeof ml.wood_type_predictions === 'object') {
              // e.g., { label: 'Pallet Wood', score: 0.87 }
              const best = ml.wood_type_predictions as any;
              predictedType = best.label ?? best.type ?? null;
              predictedConfidence =
                typeof best.score === 'number' ? best.score : null;
            }

            if (
              predictedType &&
              typeof predictedConfidence === 'number' &&
              predictedType === wasteStreamTypeName
            ) {
              folio3ConfidenceLevel = predictedConfidence;
            } else {
              // mismatch -> zero out (per your original behavior)
              folio3ConfidenceLevel = 0;
            }
          }

          // Prepare final payload merge
          const s3ImageUrl = cameraArr.find(
            (v) => v.camera_id === cameraId,
          )?.s3_url;
          const newImage = Boolean(s3ImageUrl);

          const updateDto: any = {
            cameraId,
            folio3FillPercentage,
            isPolluted,
            folio3ConfidenceLevel,
            enableRefresh,
            isOnline: newImage ? true : existing?.isOnline ?? false,
            s3ImageUrl: newImage ? s3ImageUrl : existing?.s3ImageUrl ?? null,
            captureDatetime: newImage
              ? new Date().toISOString()
              : existing?.captureDatetime,
            captureCount:
              existing?.captureCount == null
                ? newImage
                  ? 1
                  : null
                : newImage
                  ? existing.captureCount + 1
                  : existing.captureCount,
          };

          // ---------- Upsert per camera ----------
          if (existing) {
            await this.CameraLiveViewRepository.update({ cameraId }, updateDto);
          } else {
            const entity = this.CameraLiveViewRepository.create(updateDto);
            await this.CameraLiveViewRepository.save(entity);
          }
        }

        // ---------- Send polluted notification (once per WS) ----------
        // Rule: send when (previously not polluted) -> (now polluted) AND crosses threshold.
        const sendPollutedNotification =
          !previouslyPollutedTriggered && isWSPolluted === true;
        const sendFillLevelNotification =
          !previouslyFillLevelTriggered && fillPercentage > threshold;

        if (sendPollutedNotification || sendFillLevelNotification) {
          const jobSiteName = wasteStream.jobSite?.title ?? '';
          const jobSiteId = wasteStream.jobSite?.id;
          const wasteStreamName = wasteStream.wasteStream?.name ?? '';
          const wasteStreamType = wasteStream.wasteStreamType?.name ?? '';

          if (wsCameraRecord) {
            const recipient =
              await this.getRecipientForWasteStreamCamera(wsCameraRecord);
            if (recipient) {
              try {
                if (sendPollutedNotification) {
                  await this.mailService.pollutedDumpsterNotification({
                    to: recipient.recipientEmail,
                    data: {
                      jobSiteName,
                      jobSiteId,
                      wasteStreamName,
                      wasteStreamType,
                    },
                  });
                  this.logger.log(
                    `Polluted notification sent to ${recipient} for WS ${wasteStreamId}`,
                  );
                }

                if (sendFillLevelNotification) {
                  await this.mailService.fillLevelNotification({
                    to: recipient.recipientEmail,
                    data: {
                      jobSiteName,
                      wasteStreamName,
                      wasteStreamType,
                      threshold,
                      fillPercentage,
                    },
                  });
                  this.logger.log(
                    `Fill level threshold exceed notification sent to ${recipient} for WS ${wasteStreamId}`,
                  );
                }
              } catch (e: any) {
                this.logger.warn(
                  `Failed to send polluted notification for WS ${wasteStreamId}: ${e.message}`,
                );
              }
            } else {
              this.logger.warn(
                `No recipient configured for polluted notification`,
              );
            }
          }
        }

        // Return fresh records
        const saved = await this.CameraLiveViewRepository.find({
          where: { cameraId: In(cameraIds) },
        });
        return saved;
      }
    } catch (e: any) {
      throw new HttpException(
        e.message ?? 'Bad Request',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateCameraDetails(cameraId: string, updateCameraLiveViewDto: any) {
    try {
      const getCameraLiveView = await this.CameraLiveViewRepository.findOne({
        where: { cameraId },
      });

      if (!getCameraLiveView) {
        throw new HttpException('Camera not found', HttpStatus.NOT_FOUND);
      }

      await this.CameraLiveViewRepository.update(
        { cameraId },
        updateCameraLiveViewDto,
      );

      return await this.CameraLiveViewRepository.findOne({
        where: { cameraId },
      });
    } catch (exceptions) {
      this.logger.log(exceptions);
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async getCameraLiveDetails(wasteStreamId) {
    const streamCameras = await this.wasteStreamCamerasRepository.find({
      where: { jobsiteWasteStream: { id: wasteStreamId } },
      relations: ['camera', 'additionalCamera'],
    });

    if (!streamCameras.length) {
      throw new HttpException(
        `No cameras found for waste stream ID ${wasteStreamId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Gather all unique cameras
    const cameraEntities: CameraEntity[] = [];
    for (const cam of streamCameras) {
      if (cam.camera) cameraEntities.push(cam.camera);
      if (cam.additionalCamera) cameraEntities.push(cam.additionalCamera);
    }
    const uniqueCameras = Array.from(
      new Map(cameraEntities.map((c) => [c.cameraId, c])).values(),
    );

    // Check online status
    const onlineStatusArr = await Promise.all(
      uniqueCameras.map((camera) =>
        this.getCameraAvailability(camera.ipAddress),
      ),
    );
    const onlineCameras = uniqueCameras.filter(
      (_, idx) => onlineStatusArr[idx],
    );
    const offlineCameras = uniqueCameras.filter(
      (_, idx) => !onlineStatusArr[idx],
    );

    // Prepare payload for update()
    const imagesArray: { camera_id: string; s3_url: string | null }[] = [];

    // Online cameras → fetch image & upload
    for (const camera of onlineCameras) {
      const { cameraId, url } = camera;
      const imageData = await this.getCameraImage(url);
      let s3ImageUrl: string | null = null;

      if (imageData) {
        const imageBuffer = Buffer.from(imageData, 'binary');
        const date = new Date();
        const formattedDate = date.toISOString().split('T')[0];
        const timestamp = date.getTime();
        const fileName = `${formattedDate}/${cameraId}/${formattedDate}_${timestamp}_${cameraId}.jpg`;
        s3ImageUrl = await this.fileService.uploadCameraImage(
          imageBuffer,
          fileName,
        );
        this.logger.log(`✅ Image uploaded for camera ${cameraId}`);
      }

      imagesArray.push({ camera_id: cameraId, s3_url: s3ImageUrl });
    }

    for (const camera of offlineCameras) {
      await this.updateCameraDetails(camera.cameraId, {
        isOnline: false,
        enableRefresh: this.getRefreshButtonStatus(),
      });
      this.logger.warn(
        `Camera with ID ${camera.cameraId} set to offline and refresh enabled.`,
      );
    }

    // Send all to update()
    const allCameraIds = uniqueCameras.map((c) => c.cameraId);
    await this.update(wasteStreamId, allCameraIds, imagesArray);

    this.logger.log(
      `✅ Successfully updated details for waste stream ${wasteStreamId} cameras`,
    );
  }

  async getPollutedCameraIds(): Promise<string[]> {
    try {
      const pollutedCameras = await this.CameraLiveViewRepository.find({
        where: { isPolluted: true },
        select: ['cameraId'],
      });
      return pollutedCameras
        .map((camera) => camera.cameraId)
        .filter((id): id is string => id !== null);
    } catch (error) {
      this.logger.error('Failed to get polluted camera IDs:', error);
      return [];
    }
  }

  async checkAndSendPollutedReminders(
    previouslyPollutedCameraIds: string[],
  ): Promise<void> {
    if (!previouslyPollutedCameraIds.length) {
      return;
    }

    try {
      // Get current polluted status for the cameras
      const currentPollutedCameras = await this.CameraLiveViewRepository.find({
        where: {
          cameraId: In(previouslyPollutedCameraIds),
          isPolluted: true,
        },
      });

      if (!currentPollutedCameras.length) {
        this.logger.log('No cameras are still polluted.');
        return;
      }

      const stillPollutedCameraIds = currentPollutedCameras.map(
        (camera) => camera.cameraId,
      );

      // Group cameras by waste stream to avoid sending duplicate emails
      const wasteStreamMap = new Map<
        number,
        {
          wasteStream: JobSitesWasteStreamsEntity;
          wsCameraRecord: WasteStreamCamerasEntity;
          cameraIds: string[];
        }
      >();

      for (const cameraId of stillPollutedCameraIds) {
        if (!cameraId) continue;

        // Find the waste stream camera record for this camera
        const wsCameraRecord = await this.wasteStreamCamerasRepository.findOne({
          where: [{ camera: { cameraId } }, { additionalCamera: { cameraId } }],
          relations: {
            jobsiteWasteStream: {
              jobSite: true,
              wasteStream: true,
              wasteStreamType: true,
            },
          },
        });

        if (!wsCameraRecord?.jobsiteWasteStream) {
          continue;
        }

        const wasteStreamId = wsCameraRecord.jobsiteWasteStream.id;

        if (!wasteStreamMap.has(wasteStreamId)) {
          wasteStreamMap.set(wasteStreamId, {
            wasteStream: wsCameraRecord.jobsiteWasteStream,
            wsCameraRecord,
            cameraIds: [],
          });
        }

        wasteStreamMap.get(wasteStreamId)?.cameraIds.push(cameraId);
      }

      // Send reminder emails for each waste stream
      for (const [
        wasteStreamId,
        { wasteStream, wsCameraRecord },
      ] of wasteStreamMap.entries()) {
        const recipient =
          await this.getRecipientForWasteStreamCamera(wsCameraRecord);

        if (recipient?.recipientEmail) {
          try {
            const jobSiteId = wasteStream.jobSite?.id;
            const jobSiteName = wasteStream.jobSite?.title ?? '';
            const wasteStreamName = wasteStream.wasteStream?.name ?? '';
            const wasteStreamType = wasteStream.wasteStreamType?.name ?? '';

            await this.mailService.pollutedDumpsterNotification(
              {
                to: recipient.recipientEmail,
                data: {
                  jobSiteId,
                  jobSiteName,
                  wasteStreamName,
                  wasteStreamType,
                },
              },
              true,
            );

            this.logger.log(
              `Polluted reminder notification sent to ${recipient.recipientEmail} for WS ${wasteStreamId}`,
            );
          } catch (e: any) {
            this.logger.warn(
              `Failed to send polluted reminder notification for WS ${wasteStreamId}: ${e.message}`,
            );
          }
        } else {
          this.logger.warn(
            `No recipient configured for polluted reminder notification for WS ${wasteStreamId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to check and send polluted reminders:', error);
    }
  }
}
