import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateRoomCode(): string {
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.participantSession.deleteMany();
  await prisma.room.deleteMany();

  // Create a sample active room
  const room = await prisma.room.create({
    data: {
      roomCode: generateRoomCode(),
      title: "Production DB Outage",
      description: "PostgreSQL primary node is not responding. All services affected.",
      status: "active",
      securityLevel: "open",
      createdByName: "Alice (SRE Lead)",
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    },
  });

  // Add participants
  const alice = await prisma.participantSession.create({
    data: {
      roomId: room.id,
      displayName: "Alice (SRE Lead)",
      role: "owner",
      sessionToken: generateSessionToken(),
    },
  });

  const bob = await prisma.participantSession.create({
    data: {
      roomId: room.id,
      displayName: "Bob (DBA)",
      role: "member",
      sessionToken: generateSessionToken(),
    },
  });

  const charlie = await prisma.participantSession.create({
    data: {
      roomId: room.id,
      displayName: "Charlie (Backend)",
      role: "member",
      sessionToken: generateSessionToken(),
    },
  });

  // Add messages
  await prisma.message.createMany({
    data: [
      {
        roomId: room.id,
        senderSessionId: null,
        type: "system",
        content: "Alice (SRE Lead) created the room",
      },
      {
        roomId: room.id,
        senderSessionId: alice.id,
        type: "text",
        content: "Primary DB node is down. Failover did not trigger automatically.",
      },
      {
        roomId: room.id,
        senderSessionId: null,
        type: "system",
        content: "Bob (DBA) joined the room",
      },
      {
        roomId: room.id,
        senderSessionId: bob.id,
        type: "text",
        content: "Checking replication lag on standby nodes now.",
      },
      {
        roomId: room.id,
        senderSessionId: null,
        type: "system",
        content: "Charlie (Backend) joined the room",
      },
      {
        roomId: room.id,
        senderSessionId: charlie.id,
        type: "text",
        content: "API error rate is at 45%. Users are getting 500s on all write operations.",
      },
      {
        roomId: room.id,
        senderSessionId: bob.id,
        type: "text",
        content: "Standby node pgstandby-02 has 0 lag. Initiating manual failover.",
      },
    ],
  });

  // Add audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        roomId: room.id,
        actorSessionId: alice.id,
        action: "room.created",
        metadata: { title: room.title },
      },
      {
        roomId: room.id,
        actorSessionId: bob.id,
        action: "user.joined",
        metadata: { displayName: "Bob (DBA)" },
      },
      {
        roomId: room.id,
        actorSessionId: charlie.id,
        action: "user.joined",
        metadata: { displayName: "Charlie (Backend)" },
      },
    ],
  });

  console.log(`Seeded room: ${room.roomCode} — "${room.title}"`);
  console.log(`  Participants: 3`);
  console.log(`  Messages: 7`);
  console.log(`  Expires at: ${room.expiresAt.toISOString()}`);
  console.log("Done.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
