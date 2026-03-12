/** Maximum file size: 25MB */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Allowed MIME types */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Images
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  // Documents
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  // Text / Logs
  "text/plain": [".txt", ".log", ".csv"],
  "text/csv": [".csv"],
  "text/markdown": [".md"],
  // Data
  "application/json": [".json"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],
  // Archives
  "application/zip": [".zip"],
  "application/gzip": [".gz"],
};

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUpload(
  filename: string,
  mimeType: string,
  size: number
): UploadValidationResult {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed`,
    };
  }

  // Check filename
  if (!filename || filename.length > 255) {
    return { valid: false, error: "Invalid filename" };
  }

  return { valid: true };
}

/** Generate a safe storage key for uploaded files */
export function generateStorageKey(roomCode: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 100);
  return `rooms/${roomCode}/${timestamp}-${random}-${sanitized}`;
}
