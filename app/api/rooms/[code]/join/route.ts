import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/services/room.service";
import { errorResponse } from "@/lib/api-utils";

/** POST /api/rooms/[code]/join — Join an existing room */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();

    const { displayName, password } = body;

    const result = await joinRoom(code, { displayName, password });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
