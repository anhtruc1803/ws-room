import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, errorResponse } from "@/lib/api-utils";
import { getFileDownloadUrl } from "@/services/attachment.service";

/**
 * GET /api/files/[id]
 * Get a signed download URL for an attachment. Requires auth.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await authenticateRequest(request);

    const result = await getFileDownloadUrl(id, session.id);

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
