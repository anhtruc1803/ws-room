import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, errorResponse } from "@/lib/api-utils";
import { uploadFile } from "@/services/attachment.service";
import { broadcastAttachmentMessage } from "@/realtime/broadcast";
import { MAX_FILE_SIZE } from "@/lib/upload-validation";

/**
 * POST /api/rooms/[code]/upload
 * Upload a file to a room. Requires auth.
 * Accepts: multipart/form-data with a "file" field.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await authenticateRequest(request);

    // Verify session belongs to this room
    const room = await prisma.room.findUnique({
      where: { roomCode: code },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (room.status !== "active") {
      return NextResponse.json(
        { error: "Room is not active", code: "ROOM_INACTIVE" },
        { status: 400 }
      );
    }

    if (session.roomId !== room.id) {
      return NextResponse.json(
        { error: "You are not a participant of this room", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: "FILE_TOO_LARGE",
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFile({
      roomId: room.id,
      roomCode: room.roomCode,
      senderSessionId: session.id,
      senderDisplayName: session.displayName,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      buffer,
    });

    // Broadcast attachment message to all room clients via Socket.IO
    broadcastAttachmentMessage(room.roomCode, result.message);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
