# WD-1433: Add Wastestream Images

## Overview

Feature ticket **WD-1433** adds support for uploading images to waste stream assignments. Images can be captured from the field (mobile/web) and are processed by an AI vision service for material verification (e.g., wood waste, metal, cardboard).

---

## Requirements

- Maximum **4 images per waste stream** assignment
- Images are uploaded to S3 and linked via the `files` table
- AI analysis runs asynchronously (queue-based) after upload
- Admin can override AI confidence level
- Images appear in vessel overview, reports, and exports

---

## Architecture

### Database

**Table:** `waste_stream_images`

| Column                 | Type     | Description                                           |
|------------------------|----------|-------------------------------------------------------|
| id                     | UUID     | Primary key                                           |
| jobsiteWasteStreamId  | int      | FK → `job_sites_waste_streams.id`                     |
| jobSiteId              | int      | Denormalized for faster queries                       |
| wasteStreamId          | int      | Denormalized for faster queries                       |
| fileId                 | UUID     | FK → `files.id` (S3 path)                             |
| uploadedById           | int      | FK → `users.id`                                      |
| uploadedAt             | timestamp| When image was uploaded                               |
| aiStatus               | enum     | PENDING \| PROCESSING \| COMPLETE \| FAILED           |
| aiConfidenceLevel      | decimal  | AI confidence score (0–100)                           |
| adminConfidenceOverride| decimal  | Admin override (optional)                              |
| aiVerified             | boolean  | AI verification result                                |
| aiResponseRaw          | jsonb    | Raw AI response for debugging                         |
| isLatest               | boolean  | Soft delete / versioning                              |
| replacedById           | UUID     | Points to superseded image (for replace flow)          |
| displayOrder           | int      | Order 1–4                                             |
| createdAt, updatedAt   | timestamp| Audit                                                 |

**Migration:** `1772000000000-CreateWasteStreamImagesTable.ts`

### API Endpoints

**Base path:** `/api/v1/waste-stream-images`

| Method | Path                                | Roles   | Description                                  |
|--------|-------------------------------------|---------|----------------------------------------------|
| GET    | `/by-waste-stream/:id`              | Admin, GC, End Client, CMS | List latest images for a waste stream |
| POST   | `/`                                 | Admin   | Upload new image (creates record, enqueues AI)|
| POST   | `/:id/replace`                      | Admin   | Replace existing image (new version + AI)      |
| GET    | `/:id/status`                       | Admin, GC, End Client, CMS | Get AI processing status             |
| PATCH  | `/:id/confidence`                   | Admin   | Override confidence level                     |
| DELETE | `/:id`                              | Admin   | Soft delete (sets isLatest = false)           |

### Upload Flow (Two-Step)

1. **Upload file to S3**
   - `POST /api/v1/files/upload` (multipart when `FILE_DRIVER=s3`)
   - Or presigned flow when `FILE_DRIVER=s3-presigned`
   - Returns `file: { id, path }`

2. **Create waste stream image record**
   - `POST /api/v1/waste-stream-images`
   - Body: `{ jobsiteWasteStreamId, fileId, displayOrder (1–4) }`
   - Triggers AI analysis queue job

### AI Analysis

- **Queue:** `AI_IMAGE_ANALYSIS_QUEUE` (Bull)
- **Consumer:** `AiImageAnalysisConsumer`
- **Service:** `AiVisionService.analyzeImage()`
- **Confidence threshold:** Configurable via Genie `ai_image_confidence_threshold` (default 75%)

---

## Frontend Integration

### wc-frontend

- **Service:** `wc-frontend/src/services/wasteStreamImages.ts`
- **Components:**
  - `WasteStreamImageUploader` — upload UI in dumpster bar chart
  - `WasteStreamImageViewer` — display images (client view)
  - `WasteStreamReportImages` — images in reports

### wc-mobile

- **Current:** Uses placeholder `uploadWasteStreamImage()` in `lib/api.ts`
- **TODO:** Integrate with real API — upload via files API, then create waste stream image record  
- **See:** `wc-mobile/docs/MOBILE_API_TODOS.md`

---

## Related Files

| Layer     | Path                                                                 |
|----------|----------------------------------------------------------------------|
| Controller | `wc-backend/src/waste-stream-images/waste-stream-images.controller.ts` |
| Service  | `wc-backend/src/waste-stream-images/waste-stream-images.service.ts` |
| Entity   | `wc-backend/src/waste-stream-images/.../entities/waste-stream-image.entity.ts` |
| Queue    | `wc-backend/src/waste-stream-images/waste-stream-images-queue.service.ts` |
| Consumer | `wc-backend/src/waste-stream-images/consumers/ai-image-analysis.consumer.ts` |
| Migration| `wc-backend/src/database/migrations/1772000000000-CreateWasteStreamImagesTable.ts` |

---

## Environment

File upload uses existing S3 configuration:

- `FILE_DRIVER` — `s3` or `s3-presigned`
- `AWS_*` — S3 bucket, region, credentials (see `docs/file-uploading.md`)

---

## References

- [File Uploading](file-uploading.md)
- [Mobile API TODOs (wc-mobile)](../wc-mobile/docs/MOBILE_API_TODOS.md)
