export class CameraLiveView {
  id?: number;
  s3ImageUrl?: string | null;
  fillPercentage?: number | null;
  cameraId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  captureCount?: number | null;
  isOnline?: boolean | null;
  captureDatetime?: string | null;
  folio3ConfidenceLevel?: number | null;
}
