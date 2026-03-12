import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { LocalStorageProvider } from "@/storage/local";

/**
 * GET /api/files/download?key=...&expires=...&sig=...
 * Serve local files via signed URL (dev mode only).
 * In production, S3 signed URLs go directly to S3.
 */
export async function GET(request: NextRequest) {
  try {
    // Only works with local storage
    if (process.env.STORAGE_PROVIDER === "s3") {
      return NextResponse.json(
        { error: "Direct download not available in S3 mode" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const expires = searchParams.get("expires");
    const sig = searchParams.get("sig");

    if (!key || !expires || !sig) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify signature
    const local = new LocalStorageProvider();
    if (!local.verifySignedUrl(key, parseInt(expires, 10), sig)) {
      return NextResponse.json(
        { error: "Invalid or expired download link" },
        { status: 403 }
      );
    }

    // Read and serve file
    const filePath = local.getFilePath(key);
    const buffer = await readFile(filePath);

    // Determine content type from key
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const contentTypeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      json: "application/json",
      txt: "text/plain",
      log: "text/plain",
      csv: "text/csv",
      md: "text/markdown",
      zip: "application/zip",
      gz: "application/gzip",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Extract filename from key
    const filename = key.split("/").pop() || "download";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "File not found or download failed" },
      { status: 404 }
    );
  }
}
