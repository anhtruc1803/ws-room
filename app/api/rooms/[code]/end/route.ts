import { NextRequest, NextResponse } from "next/server";
import { endRoom } from "@/services/room.service";
import { authenticateRequest, errorResponse } from "@/lib/api-utils";

/** POST /api/rooms/[code]/end — End/lock room (owner only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await authenticateRequest(request);

    const result = await endRoom(code, session.id);

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
