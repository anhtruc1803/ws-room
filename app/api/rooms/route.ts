import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/services/room.service";
import { errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createRoomSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000).optional().nullable(),
  durationMinutes: z.coerce.number().min(15).max(1440).default(60),
  password: z.string().max(100).optional().nullable(),
  createdByName: z.string().min(1, "Display name is required").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request payload
    const parsedResult = createRoomSchema.safeParse(body);
    
    if (!parsedResult.success) {
      return NextResponse.json(
        { error: "Validation Error", details: parsedResult.error.format() },
        { status: 400 }
      );
    }
    
    const parsed = parsedResult.data;

    const result = await createRoom({
      title: parsed.title,
      description: parsed.description || undefined,
      durationMinutes: parsed.durationMinutes,
      password: parsed.password || undefined,
      createdByName: parsed.createdByName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

