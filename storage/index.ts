import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";

/**
 * Storage singleton.
 * Uses LocalStorageProvider in dev, S3StorageProvider in prod.
 */

let storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storage) {
    if (process.env.STORAGE_PROVIDER === "s3") {
      // Dynamic import to avoid requiring AWS SDK in dev
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { S3StorageProvider } = require("./s3");
      storage = new S3StorageProvider();
    } else {
      storage = new LocalStorageProvider();
    }
  }
  return storage!;
}

export { LocalStorageProvider } from "./local";
export type { StorageProvider } from "./provider";
