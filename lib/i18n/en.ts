// ============================================================
// English translations
// ============================================================

const en = {
  // ── Common ───────────────────────────────────────────────
  common: {
    loading: "Loading...",
    error: "Error",
    confirm: "Confirm",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy",
    join: "Join",
    create: "Create",
    or: "or",
  },

  // ── Landing page ─────────────────────────────────────────
  landing: {
    subtitle:
      "Ephemeral incident collaboration. Create a room, invite your team, resolve the incident. Everything auto-deletes.",
    createRoom: "Create Incident Room",
    orJoinExisting: "or join existing",
    enterRoomCode: "Enter room code",
    joinButton: "Join",
    featureEncrypted: "Encrypted & Ephemeral",
    featureRealtime: "Real-time Chat",
    featureAutoDelete: "Auto-Delete",
  },

  // ── Create room page ────────────────────────────────────
  createRoom: {
    title: "Create Incident Room",
    description: "Set up a temporary collaboration space for your team.",
    incidentTitle: "Incident Title",
    incidentTitlePlaceholder: "e.g. Database outage - Production",
    descriptionLabel: "Description (optional)",
    descriptionPlaceholder: "Brief description of the incident...",
    displayName: "Your Display Name",
    displayNamePlaceholder: "e.g. Alice (SRE)",
    roomDuration: "Room Duration",
    requirePassword: "Require password to join",
    roomPassword: "Room password",
    createButton: "Create Room",
    errorTitleRequired: "Incident title is required",
    errorNameRequired: "Your display name is required",
    errorCreateFailed: "Failed to create room",
    duration15m: "15 min",
    duration30m: "30 min",
    duration1h: "1 hour",
    duration2h: "2 hours",
    duration4h: "4 hours",
    duration8h: "8 hours",
    duration24h: "24 hours",
  },

  // ── Join room page ──────────────────────────────────────
  joinRoom: {
    title: "Join Incident Room",
    roomCode: "Room Code",
    displayName: "Your Display Name",
    displayNamePlaceholder: "e.g. Bob (Backend)",
    roomPassword: "Room Password",
    roomPasswordPlaceholder: "Enter room password",
    joinButton: "Join Room",
    errorNameRequired: "Display name is required",
    errorJoinFailed: "Failed to join room",
  },

  // ── Room page ───────────────────────────────────────────
  room: {
    loadingRoom: "Loading room...",
    cannotAccess: "Cannot Access Room",
    roomNotFound: "Room not found",
    returnHome: "Return Home",
    connecting: "Connecting...",
    roomEnded: "This room has been ended. Messages are read-only.",
    confirmEndRoom:
      "Are you sure you want to end this room? This cannot be undone.",
    errorEndRoom: "Failed to end room",
  },

  // ── Room header ─────────────────────────────────────────
  roomHeader: {
    ended: "Ended",
    endRoom: "End Room",
    copyInviteLink: "Copy invite link",
    expired: "Expired",
  },

  // ── Chat area ───────────────────────────────────────────
  chat: {
    noMessages: "No messages yet. Start the discussion.",
    typePlaceholder: "Type a message... (Enter to send, Shift+Enter for new line)",
    roomEndedPlaceholder: "Room ended",
    uploadFile: "Upload file",
    fileTooLarge: "File too large. Max size is {size}MB",
    uploadFailed: "Upload failed",
  },

  // ── Participants ────────────────────────────────────────
  participants: {
    title: "Participants",
    you: "(you)",
    owner: "OWNER",
  },
};

export type TranslationKeys = typeof en;
export default en;
