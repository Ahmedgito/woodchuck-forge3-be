import { AiStatus } from '../enums/ai-status.enum';
import { ImageMetadataSource } from '../enums/image-metadata-source.enum';

export class WasteStreamImage {
  id: string;
  jobsiteWasteStreamId: number;
  jobSiteId: number;
  wasteStreamId: number;
  fileId: string;
  filePath: string;
  uploadedById: number;
  uploadedAt: Date;
  capturedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  metadataSource: ImageMetadataSource | null;
  distanceFromJobSiteMeters: number | null;
  locationVerified: boolean | null;
  aiStatus: AiStatus;
  aiConfidenceLevel: number | null;
  adminConfidenceOverride: number | null;
  aiVerified: boolean | null;
  aiResponseRaw: Record<string, any> | null;
  isLatest: boolean;
  replacedById: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
