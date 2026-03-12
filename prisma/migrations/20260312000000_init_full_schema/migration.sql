-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('active', 'locked', 'deleted');

-- CreateEnum
CREATE TYPE "SecurityLevel" AS ENUM ('open', 'password');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'system', 'attachment');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "roomCode" VARCHAR(8) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'active',
    "securityLevel" "SecurityLevel" NOT NULL DEFAULT 'open',
    "passwordHash" TEXT,
    "createdByName" VARCHAR(100) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "deleteAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_sessions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'member',
    "sessionToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "participant_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderSessionId" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actorSessionId" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_roomCode_key" ON "rooms"("roomCode");
CREATE INDEX "rooms_status_expiresAt_idx" ON "rooms"("status", "expiresAt");
CREATE INDEX "rooms_status_deleteAt_idx" ON "rooms"("status", "deleteAt");

-- CreateIndex
CREATE UNIQUE INDEX "participant_sessions_sessionToken_key" ON "participant_sessions"("sessionToken");
CREATE INDEX "participant_sessions_roomId_isActive_idx" ON "participant_sessions"("roomId", "isActive");
CREATE INDEX "participant_sessions_sessionToken_idx" ON "participant_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "messages_roomId_createdAt_idx" ON "messages"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_messageId_key" ON "attachments"("messageId");
CREATE INDEX "attachments_roomId_idx" ON "attachments"("roomId");
CREATE INDEX "attachments_expiresAt_idx" ON "attachments"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_roomId_createdAt_idx" ON "audit_logs"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderSessionId_fkey" FOREIGN KEY ("senderSessionId") REFERENCES "participant_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorSessionId_fkey" FOREIGN KEY ("actorSessionId") REFERENCES "participant_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
