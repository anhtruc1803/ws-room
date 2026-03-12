# War Room - Ephemeral Incident Collaboration

War Room is a secure, ephemeral real-time collaboration space designed for incident management. It provides a temporary chat room for your team to communicate, share files, and resolve incidents quickly.

## Features

- **Ephemeral Rooms:** Rooms automatically expire and hard-delete themselves after a set duration.
- **Real-time Chat:** Instant messaging powered by Socket.IO with a horizontally scalable Redis backplane.
- **Secure File Sharing:** Temporary file uploads and auto-expiring signed download URLs backed by S3 or Local storage.
- **Passcode Protection:** Lock your rooms behind secure passcodes.
- **Audit Logs:** Track who joins, leaves, and what files are shared.
- **Microservice Architecture:** Web Server, Socket Server, and Background Workers run independently for scalability.

## Tech Stack

- **Frontend:** Next.js (React), TailwindCSS
- **Backend APIs:** Next.js API Routes (Zod Validation)
- **Realtime:** Socket.IO, `@socket.io/redis-adapter`
- **Database:** PostgreSQL via Prisma ORM
- **Cache & Pub/Sub:** Redis
- **Background Jobs:** BullMQ
- **File Storage:** Local or AWS S3 Compatible Storage

## Prerequisites

- Node.js v18+
- PostgreSQL server
- Redis server
- AWS S3 (optional, for production file storage)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/anhtruc1803/ws-room.git
cd war-room
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (you can copy from `.env.example` if available) and configure your connections:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/warroom?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SOCKET_PORT="3001"
JWT_SECRET="your-super-secret-key-change-me"

# Storage Settings (local | s3)
STORAGE_PROVIDER="local"
STORAGE_DIR="./storage-files"

# S3 Configuration (only if STORAGE_PROVIDER="s3")
S3_ENDPOINT=""
S3_REGION="us-east-1"
S3_BUCKET="warroom-uploads"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

### 3. Database Setup

Run Prisma migrations to set up your PostgreSQL schemas:

```bash
npm run db:migrate
```

### 4. Running the Application

The application is split into three decoupled services. During development, you can run all of them simultaneously using a single command:

```bash
npm run dev
```

This starts:
1. **Next.js Web Server** at `http://localhost:3000`
2. **Socket.IO Realtime Server** at `http://localhost:3001`
3. **BullMQ Background Workers** (runs silently)

## Production Deployment

**For a comprehensive step-by-step production setup on Ubuntu 22.04 LTS (with Nginx, PM2, Redis, Postgres), please read the [Ubuntu 22.04 Deployment Guide](DEPLOYMENT.md).**

If you prefer to deploy manually, you should build the Next.js app and run the services independently to scale them horizontally.

**Build:**
```bash
npm run build
```

**Start (All-in-one using concurrently):**
```bash
npm start
```

**Scaling Independently:**
Instead of `npm start`, run these commands on separate container instances (e.g., Docker/K8s/ECS):
- Web: `npm run start:web`
- Socket: `npm run start:socket`
- Workers: `npm run start:worker`

### Notes on Scaling Socket.IO
The Socket.IO server uses `@socket.io/redis-adapter` and sliding-window Redis rate-limiting. You can safely spin up multiple instances of `start:socket` behind a load balancer. Ensure your load balancer uses sticky sessions (Session Affinity) to support WebSocket fallbacks.

## Maintenance & Cleanup

The BullMQ workers handle:
1. Auto-locking expired active rooms.
2. Hard-deleting locked room data from the database and purging associated S3 storage files.

Leave the `worker.ts` process running to ensure compliance with the ephemeral design.
