-- Migration: gym community chat (single room per gym)

CREATE TYPE "ChatMediaType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "gym_chat_messages" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "ChatMediaType",
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gym_chat_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gym_chat_messages" ADD CONSTRAINT "gym_chat_messages_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gym_chat_messages" ADD CONSTRAINT "gym_chat_messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gym_chat_messages" ADD CONSTRAINT "gym_chat_messages_pinnedById_fkey"
  FOREIGN KEY ("pinnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "gym_chat_messages_gymId_createdAt_idx" ON "gym_chat_messages"("gymId", "createdAt");
CREATE INDEX "gym_chat_messages_gymId_isPinned_idx" ON "gym_chat_messages"("gymId", "isPinned");
