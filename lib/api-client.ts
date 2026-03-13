const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

// ============================================================
// Types
// ============================================================

export interface RoomData {
  id: string;
  roomCode: string;
  title: string;
  description: string | null;
  status: string;
  securityLevel?: string;
  expiresAt: string;
  resolvedAt?: string | null;
  createdAt?: string;
}

export interface ParticipantData {
  id: string;
  displayName: string;
  role: string;
  joinedAt?: string;
}

export interface AttachmentData {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface MessageData {
  id: string;
  senderSessionId: string | null;
  senderName: string | null;
  type: "text" | "system" | "attachment";
  content: string;
  createdAt: string;
  attachment?: AttachmentData | null;
  replyTo?: {
    id: string;
    senderName?: string | null;
    content: string;
    sender?: {
      displayName: string;
    } | null;
  } | null;
}

export interface CreateRoomResponse {
  room: RoomData;
  inviteLink: string;
  sessionToken: string;
}

export interface JoinRoomResponse {
  room: RoomData;
  sessionToken: string;
  participant: ParticipantData;
}

export interface RoomInfoResponse {
  room: RoomData;
  participants: ParticipantData[];
  messages: MessageData[];
}

export interface FileDownloadResponse {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ============================================================
// API functions
// ============================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data.error || "Request failed",
      res.status,
      data.code || "UNKNOWN"
    );
  }

  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** POST /api/rooms — Create new incident room */
export async function createRoom(input: {
  title: string;
  description?: string;
  durationMinutes: number;
  password?: string;
  createdByName: string;
}): Promise<CreateRoomResponse> {
  return request("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** POST /api/rooms/[code]/join — Join existing room */
export async function joinRoom(
  code: string,
  input: { displayName: string; password?: string }
): Promise<JoinRoomResponse> {
  return request(`/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** GET /api/rooms/[code] — Get room info (auth required) */
export async function getRoomInfo(
  code: string,
  token: string
): Promise<RoomInfoResponse> {
  return request(`/api/rooms/${code}`, {
    headers: authHeaders(token),
  });
}

/** POST /api/rooms/[code]/end — End room (owner only) */
export async function endRoom(
  code: string,
  token: string
): Promise<{ room: RoomData }> {
  return request(`/api/rooms/${code}/end`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

/** POST /api/rooms/[code]/upload — Upload file */
export async function uploadFile(
  code: string,
  token: string,
  file: File
): Promise<{ message: MessageData }> {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/api/rooms/${code}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
}

/** GET /api/files/[id] — Get signed download URL */
export async function getFileDownloadUrl(
  attachmentId: string,
  token: string
): Promise<FileDownloadResponse> {
  return request(`/api/files/${attachmentId}`, {
    headers: authHeaders(token),
  });
}
