import { mkdir, writeFile, unlink, access } from "fs/promises";
import path from "path";
import { createHmac } from "crypto";
import type { StorageProvider } from "./provider";

/**
 * Local filesystem storage for development.
 * Files stored in ./uploads/ directory.
 * Signed URLs use HMAC to verify authenticity.
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private secret: string;

  constructor() {
    this.basePath = path.join(process.cwd(), "uploads");
    this.secret = process.env.STORAGE_SECRET || "dev-secret-change-me";
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, buffer);
  }

  async getSignedUrl(key: string, ttlSeconds: number, filename?: string, mimeType?: string): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = this.sign(key, expires);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let url = `${baseUrl}/api/files/download?key=${encodeURIComponent(key)}&expires=${expires}&sig=${signature}`;
    if (filename) {
      url += `&filename=${encodeURIComponent(filename)}`;
    }
    if (mimeType) {
      url += `&mime=${encodeURIComponent(mimeType)}`;
    }
    return url;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await access(filePath);
      await unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.allSettled(keys.map((key) => this.delete(key)));
  }

  /** Verify a signed URL's signature and expiry */
  verifySignedUrl(key: string, expires: number, signature: string): boolean {
    if (Math.floor(Date.now() / 1000) > expires) {
      return false; // Expired
    }
    const expected = this.sign(key, expires);
    return expected === signature;
  }

  /** Get the local file path for a storage key */
  getFilePath(key: string): string {
    // Prevent path traversal
    const safe = key.replace(/\.\./g, "").replace(/[^a-zA-Z0-9_\-/.]/g, "_");
    return path.join(this.basePath, safe);
  }

  private sign(key: string, expires: number): string {
    return createHmac("sha256", this.secret)
      .update(`${key}:${expires}`)
      .digest("hex");
  }
}
