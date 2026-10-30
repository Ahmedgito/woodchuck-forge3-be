import { BadRequestException } from '@nestjs/common';
import { CreateWasteStreamImageDto } from '../dto/create-waste-stream-image.dto';
import { ImageMetadataSource } from '../enums/image-metadata-source.enum';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_GEOFENCE_METERS = 1000;
const MAX_CAPTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface ParsedImageMetadata {
  capturedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  metadataSource: ImageMetadataSource | null;
}

export interface LocationVerificationResult {
  distanceFromJobSiteMeters: number | null;
  locationVerified: boolean | null;
}

export function getGeofenceMeters(): number {
  const raw = process.env.IMAGE_VERIFICATION_GEOFENCE_METERS;
  if (!raw) return DEFAULT_GEOFENCE_METERS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GEOFENCE_METERS;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function evaluateLocationVerification(
  imageLat: number,
  imageLng: number,
  jobSiteLat: number,
  jobSiteLng: number,
  thresholdMeters = getGeofenceMeters(),
): LocationVerificationResult {
  const distanceFromJobSiteMeters = haversineMeters(
    imageLat,
    imageLng,
    jobSiteLat,
    jobSiteLng,
  );

  return {
    distanceFromJobSiteMeters:
      Math.round(distanceFromJobSiteMeters * 100) / 100,
    locationVerified: distanceFromJobSiteMeters <= thresholdMeters,
  };
}

export function parseImageMetadata(
  dto: CreateWasteStreamImageDto,
): ParsedImageMetadata {
  const hasLatitude = dto.latitude !== undefined && dto.latitude !== null;
  const hasLongitude = dto.longitude !== undefined && dto.longitude !== null;

  if (hasLatitude !== hasLongitude) {
    throw new BadRequestException(
      'latitude and longitude must both be provided together',
    );
  }

  let capturedAt: Date | null = null;
  if (dto.capturedAt) {
    capturedAt = new Date(dto.capturedAt);
    if (Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('capturedAt must be a valid ISO date');
    }
    if (capturedAt.getTime() > Date.now() + MAX_CAPTURE_CLOCK_SKEW_MS) {
      throw new BadRequestException('capturedAt cannot be in the future');
    }
  }

  const latitude = hasLatitude ? Number(dto.latitude) : null;
  const longitude = hasLongitude ? Number(dto.longitude) : null;

  if (
    latitude !== null &&
    (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180)
  ) {
    throw new BadRequestException('latitude or longitude is out of range');
  }

  if (latitude === 0 && longitude === 0) {
    throw new BadRequestException('coordinates (0, 0) are not allowed');
  }

  const metadataSource = dto.metadataSource ?? null;
  if (
    metadataSource &&
    !Object.values(ImageMetadataSource).includes(metadataSource)
  ) {
    throw new BadRequestException('metadataSource is invalid');
  }

  if ((latitude !== null || capturedAt) && !metadataSource) {
    throw new BadRequestException(
      'metadataSource is required when capturedAt or coordinates are provided',
    );
  }

  return {
    capturedAt,
    latitude,
    longitude,
    metadataSource,
  };
}

export function resolveLocationVerification(
  metadata: ParsedImageMetadata,
  jobSiteLat?: number | null,
  jobSiteLng?: number | null,
): LocationVerificationResult {
  if (
    metadata.latitude === null ||
    metadata.longitude === null ||
    jobSiteLat === undefined ||
    jobSiteLat === null ||
    jobSiteLng === undefined ||
    jobSiteLng === null
  ) {
    return {
      distanceFromJobSiteMeters: null,
      locationVerified: null,
    };
  }

  return evaluateLocationVerification(
    metadata.latitude,
    metadata.longitude,
    Number(jobSiteLat),
    Number(jobSiteLng),
  );
}
