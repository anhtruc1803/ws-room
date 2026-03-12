import { NextRequest, NextResponse } from "next/server";
import { getRoomInfo } from "@/services/room.service";
import { authenticateRequest, errorResponse } from "@/lib/api-utils";

/** GET /api/rooms/[code] — Get room info (requires auth) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await authenticateRequest(request);

    const result = await getRoomInfo(code, session.id);

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
