/** Extensions allowed for generic image uploads (waste stream verification, etc.). */
export const ALLOWED_UPLOAD_IMAGE_EXTENSION_REGEX =
  /\.(jpg|jpeg|png|gif|heic|heif)$/i;

export function isAllowedUploadImageName(fileName: string): boolean {
  return ALLOWED_UPLOAD_IMAGE_EXTENSION_REGEX.test(fileName);
}
