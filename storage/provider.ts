/**
 * Storage provider abstraction.
 * Implementations: LocalStorageProvider (dev), S3StorageProvider (prod).
 */
export interface StorageProvider {
  /** Upload a file buffer to storage */
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;

  /** Get a time-limited signed URL for downloading */
  getSignedUrl(key: string, ttlSeconds: number, filename?: string, mimeType?: string): Promise<string>;

  /** Delete a single file */
  delete(key: string): Promise<void>;

  /** Delete multiple files */
  deleteMany(keys: string[]): Promise<void>;
}
