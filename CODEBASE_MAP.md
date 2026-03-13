# CODEBASE MAP — War Room

> Ephemeral Incident Collaboration Platform
> Tài liệu tham chiếu kiến trúc — cập nhật lần cuối: 2026-03-13

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Cấu trúc thư mục project](#3-cấu-trúc-thư-mục-project)
4. [Giải thích module chính](#4-giải-thích-module-chính)
5. [Database schema](#5-database-schema)
6. [Room lifecycle](#6-room-lifecycle)
7. [Realtime architecture](#7-realtime-architecture)
8. [File upload system](#8-file-upload-system)
9. [Background jobs](#9-background-jobs)
10. [Security model](#10-security-model)
11. [Environment variables](#11-environment-variables)
12. [Cách chạy project](#12-cách-chạy-project)
13. [Flow xử lý incident](#13-flow-xử-lý-incident)
14. [Hướng dẫn cho AI agents](#14-hướng-dẫn-cho-ai-agents)
15. [Nguyên tắc code](#15-nguyên-tắc-code)

---

## 1. Tổng quan hệ thống

### War Room là gì?

War Room là **ephemeral incident collaboration tool** — công cụ tạo phòng xử lý sự cố tạm thời, cho phép nhiều bên tham gia trao đổi realtime trong lúc hệ thống gặp sự cố.

### Mục đích

- Tạo phòng incident nhanh chóng bằng room code / invite link
- Chat realtime giữa nhiều bên (dev, ops, vendor)
- Upload file log, ảnh, tài liệu liên quan đến sự cố
- Watermark theo người xem để tăng accountability
- Tự động expire và xóa dữ liệu sau khi sự cố kết thúc

### Use case chính

1. **Host** tạo phòng incident → nhận room code + invite link
2. Gửi invite link cho các bên liên quan (vendor, team khác)
3. Mọi người join bằng display name → chat realtime, upload log/file
4. Khi sự cố kết thúc → host end room hoặc room tự expire
5. Background job tự động xóa toàn bộ dữ liệu sau 30 phút

### Các thành phần hệ thống

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| Frontend | Next.js + TypeScript + TailwindCSS | UI cho room, chat, upload |
| API Layer | Next.js API Routes | REST API cho room CRUD, upload |
| Realtime | Socket.IO (separate process) | WebSocket chat, events |
| Database | PostgreSQL + Prisma ORM | Persistent storage |
| Cache | Redis (ioredis) | Session cache, rate limiting, pub/sub |
| Background Jobs | BullMQ + Redis | Room expiration, data cleanup |
| File Storage | Local FS (dev) / S3-compatible (prod) | File upload/download |

---

## 2. Kiến trúc tổng thể

### Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  Next.js Pages ─── React Components ─── useSocket hook          │
└───────┬──────────────────────────────────────────┬──────────────┘
        │ HTTP (REST API)                          │ WebSocket
        ▼                                          ▼
┌───────────────────┐                ┌────────────────────────────┐
│  Next.js API      │ ── Redis ──▶   │  Socket.IO Server          │
│  Routes           │    pub/sub     │  (port 3001)               │
│  (port 3000)      │                │                            │
└───────┬───────────┘                └─────────┬──────────────────┘
        │                                      │
        ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│  room.service  │  message.service  │  attachment.service         │
│  cleanup.service                                                │
└───────┬──────────────────────────────────────────┬──────────────┘
        │                                          │
        ▼                                          ▼
┌───────────────────┐  ┌───────────────┐  ┌───────────────────────┐
│  PostgreSQL       │  │  Redis        │  │  File Storage         │
│  (Prisma ORM)     │  │  (Cache/Queue)│  │  (Local / S3)         │
└───────────────────┘  └───────┬───────┘  └───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  BullMQ Worker       │
                    │  (background jobs)   │
                    └──────────────────────┘
```

### Processes khi chạy `npm run dev`

| Process | Command | Port | Vai trò |
|---|---|---|---|
| `dev:web` | `next dev` | 3000 | Next.js app + API routes |
| `dev:socket` | `tsx socket.ts` | 3001 | Socket.IO WebSocket server |
| `dev:worker` | `tsx worker.ts` | — | BullMQ background worker |

### Cross-process communication

- **Next.js API → Socket.IO**: Qua **Redis pub/sub** (channel `socket-broadcast`)
- **Worker → DB**: Trực tiếp qua Prisma
- **Socket.IO ↔ Redis**: Socket.IO Redis Adapter (built-in scaling)

---

## 3. Cấu trúc thư mục project

```
war-room/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API routes
│   │   ├── files/
│   │   │   ├── [id]/route.ts     # GET  — get signed download URL
│   │   │   └── download/route.ts # GET  — serve local file (dev)
│   │   ├── health/route.ts       # GET  — health check
│   │   └── rooms/
│   │       ├── route.ts          # POST — create room
│   │       └── [code]/
│   │           ├── route.ts      # GET  — get room info
│   │           ├── join/route.ts  # POST — join room
│   │           ├── end/route.ts   # POST — end room
│   │           └── upload/route.ts# POST — upload file
│   ├── create/page.tsx           # Create room page
│   ├── join/[code]/page.tsx      # Join room page
│   ├── room/[code]/page.tsx      # Room chat page (main UI)
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── layout/
│   │   └── Logo.tsx              # App logo
│   ├── room/
│   │   ├── ChatArea.tsx          # Message list container
│   │   ├── MessageBubble.tsx     # Single message display
│   │   ├── MessageInput.tsx      # Text input + file upload trigger
│   │   ├── ParticipantList.tsx   # Sidebar participant list
│   │   ├── RoomHeader.tsx        # Room info header bar
│   │   └── WatermarkOverlay.tsx  # Transparent watermark overlay
│   └── ui/
│       ├── Button.tsx            # Reusable button
│       ├── Card.tsx              # Card wrapper
│       ├── Input.tsx             # Text input
│       └── Textarea.tsx          # Textarea
│
├── hooks/                        # Custom React hooks
│   ├── useSocket.ts              # Socket.IO connection hook
│   └── useCountdown.ts           # Countdown timer hook
│
├── lib/                          # Shared utilities & config
│   ├── api-client.ts             # Client-side API functions (fetch wrappers)
│   ├── api-utils.ts              # Server-side API helpers (auth, error)
│   ├── crypto.ts                 # Room code gen, session token, password hash
│   ├── env.ts                    # Environment variable loader
│   ├── errors.ts                 # Custom error classes (AppError, NotFoundError...)
│   ├── prisma.ts                 # Prisma client singleton
│   ├── queue.ts                  # BullMQ queue definition + schedulers
│   ├── redis.ts                  # Redis client singleton (ioredis)
│   ├── sanitize.ts               # Input sanitization (XSS prevention)
│   ├── session-store.ts          # Client-side session storage (sessionStorage)
│   └── upload-validation.ts      # File upload MIME type & size validation
│
├── services/                     # Business logic layer
│   ├── room.service.ts           # Create, join, get info, end room
│   ├── message.service.ts        # Save & retrieve messages
│   ├── attachment.service.ts     # Upload file, get signed URL
│   └── cleanup.service.ts        # Expire, lock, delete room data
│
├── realtime/                     # Socket.IO layer
│   ├── socket-server.ts          # Socket.IO server init + event handlers
│   └── broadcast.ts              # Broadcast helpers (room-ended, new-message)
│
├── jobs/                         # Background job workers
│   └── index.ts                  # BullMQ worker (scan-expired, delete-room)
│
├── storage/                      # File storage abstraction
│   ├── provider.ts               # StorageProvider interface
│   ├── local.ts                  # LocalStorageProvider (dev — filesystem)
│   ├── s3.ts                     # S3StorageProvider (prod — AWS/MinIO/R2)
│   └── index.ts                  # getStorage() factory singleton
│
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Prisma schema (5 models)
│   ├── seed.ts                   # Seed script
│   └── migrations/               # Migration files
│
├── server.ts                     # Combined server entry (Next.js + Socket.IO)
├── socket.ts                     # Standalone Socket.IO server entry
├── worker.ts                     # Standalone BullMQ worker entry
├── package.json                  # Dependencies & scripts
├── .env.example                  # Environment template
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
└── postcss.config.mjs            # PostCSS (TailwindCSS)
```

---

## 4. Giải thích module chính

### 4.1 Room Service

**Mục đích**: Quản lý toàn bộ lifecycle của room — tạo, join, lấy thông tin, kết thúc.

**File chính**: `services/room.service.ts`

**Các function**:

| Function | Mô tả |
|---|---|
| `createRoom()` | Tạo room mới, generate room code (8 hex chars), tạo owner session, cache status vào Redis |
| `joinRoom()` | Tham gia room, validate password nếu có, tạo member session |
| `getRoomInfo()` | Lấy thông tin room + participants + 100 messages gần nhất |
| `endRoom()` | Lock room (chỉ owner), deactivate tất cả participants, schedule delete 30 phút |

**Flow tạo room**:
```
createRoom() → generateRoomCode() → prisma.room.create()
  → redis.setex(status) → return { room, inviteLink, sessionToken }
```

---

### 4.2 Message Service

**Mục đích**: Lưu và truy vấn tin nhắn.

**File chính**: `services/message.service.ts`

**Các function**:

| Function | Mô tả |
|---|---|
| `saveMessage()` | Lưu tin nhắn vào DB (text, system, attachment) |
| `getRecentMessages()` | Lấy N tin nhắn gần nhất với sender info + attachment |

---

### 4.3 Attachment Service (File Upload)

**Mục đích**: Xử lý upload file, lưu metadata, tạo signed URL để download.

**File chính**: `services/attachment.service.ts`

**Các function**:

| Function | Mô tả |
|---|---|
| `uploadFile()` | Validate → upload to storage → tạo message + attachment record |
| `getFileDownloadUrl()` | Verify participant → tạo signed URL (5 phút TTL) |

**Flow upload**:
```
API route nhận multipart/form-data
  → attachment.service.uploadFile()
    → validateUpload() (MIME + size)
    → storage.upload() (local hoặc S3)
    → prisma.$transaction (message + attachment)
    → broadcastAttachmentMessage() via Redis pub/sub
```

---

### 4.4 Realtime Gateway (Socket.IO)

**Mục đích**: Xử lý WebSocket connections — chat realtime, join/leave events.

**File chính**: `realtime/socket-server.ts`, `realtime/broadcast.ts`

**Events**:

| Event (Client → Server) | Mô tả |
|---|---|
| `authenticate` | Gửi session token để xác thực |
| `join-room` | Join Socket.IO room (sau khi authenticated) |
| `send-message` | Gửi tin nhắn text |
| `leave-room` | Rời room |

| Event (Server → Client) | Mô tả |
|---|---|
| `authenticated` | Xác thực thành công |
| `new-message` | Tin nhắn mới (text, system, attachment) |
| `user-joined` | User mới tham gia |
| `user-left` | User rời room |
| `room-ended` | Room bị kết thúc |
| `participants-list` | Danh sách participants hiện tại |
| `error` | Lỗi |

---

### 4.5 Job Queue System

**Mục đích**: Background jobs cho room lifecycle — expire, lock, delete.

**File chính**: `jobs/index.ts`, `lib/queue.ts`

**Queue**: `room-lifecycle` (BullMQ)

| Job Name | Schedule | Mô tả |
|---|---|---|
| `scan-expired` | Mỗi 1 phút (repeatable) | Tìm room `active` đã quá `expiresAt`, lock lại |
| `scan-deletable` | Mỗi 5 phút (repeatable) | Safety net — tìm room `locked` quá `deleteAt`, xóa |
| `delete-room` | Delayed (30 phút sau lock) | Xóa toàn bộ data của 1 room cụ thể |

---

## 5. Database schema

### Entity Relationship Diagram

```
┌──────────────────┐
│      Room        │
│──────────────────│
│ id (PK)          │
│ roomCode (unique)│
│ title            │
│ description      │
│ status           │──── enum: active | locked | deleted
│ securityLevel    │──── enum: open | password
│ passwordHash     │
│ createdByName    │
│ expiresAt        │
│ resolvedAt       │
│ deleteAt         │
│ createdAt        │
│ updatedAt        │
└────────┬─────────┘
         │ 1:N
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌────────────────────────┐    ┌──────────────────────┐
│  ParticipantSession    │    │      Message          │
│────────────────────────│    │──────────────────────│
│ id (PK)                │    │ id (PK)              │
│ roomId (FK → Room)     │    │ roomId (FK → Room)   │
│ displayName            │    │ senderSessionId (FK) │
│ role                   │──  │ type                 │── enum: text | system | attachment
│ sessionToken (unique)  │    │ content              │
│ isActive               │    │ createdAt            │
│ joinedAt               │    └──────────┬───────────┘
│ leftAt                 │               │ 1:1 (optional)
└────────┬───────────────┘               ▼
         │                    ┌──────────────────────┐
         │                    │    Attachment         │
         │                    │──────────────────────│
         │                    │ id (PK)              │
         │                    │ roomId (FK → Room)   │
         │                    │ messageId (FK, unique)│
         │                    │ filename             │
         │                    │ mimeType             │
         │                    │ size                 │
         │                    │ storageKey           │
         │                    │ expiresAt            │
         │                    │ createdAt            │
         │                    └──────────────────────┘
         │
         ▼
┌────────────────────────┐
│      AuditLog          │
│────────────────────────│
│ id (PK)                │
│ roomId (FK → Room)     │
│ actorSessionId (FK)    │
│ action                 │── e.g. "room.created", "user.joined", "file.uploaded"
│ metadata (JSON)        │
│ createdAt              │
└────────────────────────┘
```

### Bảng & mục đích

| Bảng | Mục đích | Cascade |
|---|---|---|
| **Room** | Phòng incident chính, chứa metadata và TTL | Xóa room → xóa tất cả con |
| **ParticipantSession** | Phiên tham gia của user (không có account system) | FK → Room |
| **Message** | Tin nhắn chat (text, system event, attachment ref) | FK → Room, Session |
| **Attachment** | Metadata file đã upload (1:1 với Message) | FK → Room, Message |
| **AuditLog** | Ghi lại hành động quan trọng (tạo room, join, upload, end) | FK → Room, Session |

### Indexes quan trọng

- `rooms(status, expiresAt)` — cho job scan-expired
- `rooms(status, deleteAt)` — cho job scan-deletable
- `participant_sessions(roomId, isActive)` — lấy participants đang online
- `participant_sessions(sessionToken)` — auth lookup
- `messages(roomId, createdAt)` — lấy tin nhắn theo room
- `attachments(expiresAt)` — cleanup job

---

## 6. Room lifecycle

### State diagram

```
            ┌─────────┐
            │ CREATE   │  POST /api/rooms
            └────┬─────┘
                 │
                 ▼
            ┌─────────┐
     ┌──────│ ACTIVE   │──────────────────────────┐
     │      └────┬─────┘                          │
     │           │                                │
     │    Users join/chat/upload           TTL expires
     │           │                         (background job)
     │           │                                │
     │    Owner clicks "End Room"                 │
     │    POST /api/rooms/[code]/end              │
     │           │                                │
     │           ▼                                ▼
     │      ┌─────────┐                    ┌─────────┐
     │      │ LOCKED   │◄───────────────── │ LOCKED   │
     │      │ (manual) │                   │ (auto)   │
     │      └────┬─────┘                   └────┬─────┘
     │           │                              │
     │           │  +30 min grace period        │
     │           ▼                              ▼
     │      ┌──────────────────────────────────────┐
     │      │           delete-room job            │
     │      │  1. Delete storage files             │
     │      │  2. Delete attachments               │
     │      │  3. Delete messages                  │
     │      │  4. Delete audit logs                │
     │      │  5. Delete participant sessions      │
     │      │  6. Delete room record               │
     └──────│  7. Clear Redis cache                │
            └──────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  DELETED    │  (data không còn tồn tại)
                    └─────────────┘
```

### Thời gian lifecycle

| Giai đoạn | Thời gian | Mô tả |
|---|---|---|
| Active | 15 phút → 24 giờ (user chọn) | Room hoạt động bình thường |
| Locked | 30 phút (grace period) | Room bị khóa, read-only, chờ xóa |
| Deleted | — | Toàn bộ data bị xóa vĩnh viễn |

---

## 7. Realtime architecture

### Kiến trúc Socket.IO

```
Browser                    Socket.IO Server (port 3001)           Next.js API (port 3000)
  │                               │                                      │
  │── connect ──────────────────► │                                      │
  │◄── connected ─────────────── │                                      │
  │                               │                                      │
  │── authenticate({token}) ───► │ validate session via Prisma           │
  │◄── authenticated ─────────── │                                      │
  │                               │                                      │
  │── join-room ────────────────► │ socket.join("room:CODE")             │
  │◄── participants-list ──────── │                                      │
  │                               │                                      │
  │── send-message({content}) ──► │ rate limit check (Redis)             │
  │                               │ sanitize → saveMessage (Prisma)      │
  │◄── new-message ──────────── │ io.to("room:CODE").emit()            │
  │                               │                                      │
  │                               │            ┌─────────────────────────│
  │                               │            │  Upload file via HTTP   │
  │                               │            │  POST /api/rooms/.../upload
  │                               │            ▼                         │
  │                               │◄── Redis pub/sub ────────────────── │
  │◄── new-message ──────────── │  (attachment broadcast)               │
  │                               │                                      │
```

### Cách cross-process broadcast hoạt động

1. **Next.js API** upload file thành công
2. Gọi `broadcastAttachmentMessage()` trong `realtime/broadcast.ts`
3. Function thử `getIO()` — fail vì Socket.IO chạy ở process khác
4. Fallback: `redis.publish("socket-broadcast", payload)`
5. Socket.IO server đã subscribe channel `socket-broadcast`
6. Nhận message → `io.to("room:CODE").emit("new-message", payload)`

### Redis Adapter

Socket.IO sử dụng `@socket.io/redis-adapter` cho horizontal scaling. Nếu deploy nhiều instance Socket.IO, adapter tự sync events qua Redis.

---

## 8. File upload system

### Upload flow

```
Client                      Next.js API                  Storage              Socket.IO
  │                            │                           │                     │
  │── POST multipart form ───► │                           │                     │
  │                            │── validateUpload() ──►    │                     │
  │                            │   (MIME, size check)      │                     │
  │                            │                           │                     │
  │                            │── storage.upload() ──────►│                     │
  │                            │   (buffer → file)         │                     │
  │                            │                           │                     │
  │                            │── prisma.$transaction ──► │                     │
  │                            │   (message + attachment)  │                     │
  │                            │                           │                     │
  │                            │── redis.publish() ──────────────────────────────►│
  │                            │                           │                     │
  │◄── 201 { message } ────── │                           │                     │
  │                            │                           │                     │
  │◄── "new-message" (WS) ──────────────────────────────────────────────────────│
```

### Storage abstraction

```
StorageProvider (interface)
├── upload(key, buffer, contentType) → void
├── getSignedUrl(key, ttlSeconds) → string
├── delete(key) → void
└── deleteMany(keys) → void

Implementations:
├── LocalStorageProvider  — lưu file vào ./uploads/, signed URL dùng HMAC
└── S3StorageProvider     — AWS S3 / MinIO / R2 / DigitalOcean Spaces
```

### Signed URL

- **Local dev**: HMAC-SHA256 signature + expires timestamp → verify khi download
- **S3 prod**: AWS S3 Presigned URL (5 phút TTL)
- URL hết hạn sau TTL → không thể tải lại

### File types được phép

| Category | MIME Types |
|---|---|
| Images | png, jpeg, gif, webp, svg |
| Documents | pdf, doc, docx, xls, xlsx |
| Text/Logs | txt, log, csv, md |
| Data | json, xml |
| Archives | zip, gz |
| Unknown | application/octet-stream (fallback) |

**Max file size**: 25MB

---

## 9. Background jobs

### BullMQ Architecture

```
lib/queue.ts                    jobs/index.ts                worker.ts
┌──────────────┐               ┌──────────────────┐         ┌───────────┐
│ roomQueue    │               │  Worker          │         │  Entry    │
│ (room-       │──── Redis ──►│  - scan-expired  │◄────────│  point    │
│  lifecycle)  │               │  - scan-deletable│         │           │
│              │               │  - delete-room   │         └───────────┘
│ schedule     │               │                  │
│ Repeatable   │               │  → cleanup       │
│ Jobs()       │               │    .service.ts   │
└──────────────┘               └──────────────────┘
```

### Job details

#### `scan-expired` (mỗi 1 phút)
1. Query: `rooms WHERE status = 'active' AND expiresAt < now()`
2. Mỗi room tìm được → update `status = 'locked'`, set `deleteAt = now + 30min`
3. Deactivate tất cả participants
4. Broadcast `room-ended` qua Socket.IO
5. Schedule `delete-room` job (delayed 30 phút)

#### `scan-deletable` (mỗi 5 phút)
- Safety net cho trường hợp `delete-room` job fail
- Query: `rooms WHERE status = 'locked' AND deleteAt < now()`
- Gọi `deleteRoomData()` cho mỗi room tìm được

#### `delete-room` (delayed, 1 lần)
1. Xóa storage files (S3/local)
2. Transaction: xóa attachments → messages → audit logs → sessions → room
3. Clear Redis cache

### Job configuration

- **Retry**: 3 lần, exponential backoff (1s, 2s, 4s)
- **Concurrency**: 3 jobs đồng thời
- **Cleanup**: Giữ lại 100 completed jobs, 500 failed jobs

---

## 10. Security model

### Access Control

| Layer | Cơ chế |
|---|---|
| **Room access** | Session token (Bearer auth) — mỗi participant có unique token |
| **Room password** | SHA-256 hash + salt (optional khi tạo room) |
| **API auth** | `authenticateRequest()` verify token → lookup `ParticipantSession` |
| **Socket auth** | `authenticate` event → verify token trước khi join room |
| **Owner-only** | End room chỉ cho `role = "owner"` |

### Session Token Flow

```
Tạo room   → generateSessionToken() (32 bytes hex) → lưu sessionStorage (client)
Join room  → generateSessionToken() → lưu sessionStorage (client)
Mọi request→ Authorization: Bearer <token> → lookup ParticipantSession
```

### Signed URLs (File Download)

- Local: HMAC-SHA256(`key:expires`, secret) → verify trước khi serve file
- S3: AWS Presigned URL — expires sau 5 phút
- Mỗi lần download đều tạo audit log

### Rate Limiting

| Loại | Giới hạn | Cơ chế |
|---|---|---|
| Socket messages | 30 msg/phút/user | Redis sorted set (sliding window) |
| File upload | Qua API rate limit chung | — |

### Input Sanitization

- `sanitizeContent()`: strip HTML tags, null bytes, max 4000 chars
- `sanitizeDisplayName()`: strip HTML, max 50 chars
- `validateUpload()`: whitelist MIME types, max 25MB

### Watermark

- `WatermarkOverlay` component render display name lặp lại trên toàn bộ chat area
- Semi-transparent, không chặn tương tác
- Mục đích: discourage screenshot sharing không có accountability

---

## 11. Environment variables

| Biến | Mặc định | Mô tả |
|---|---|---|
| `DATABASE_URL` | — (bắt buộc) | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL (dùng cho invite link, Socket.IO) |
| `NODE_ENV` | `development` | Environment |
| `STORAGE_PROVIDER` | `local` | `local` hoặc `s3` |
| `STORAGE_SECRET` | `dev-secret-change-me` | HMAC secret cho local signed URL |
| `SOCKET_PORT` | `3001` | Port cho Socket.IO server |
| `S3_ENDPOINT` | — | S3-compatible endpoint (MinIO, R2...) |
| `S3_REGION` | `us-east-1` | AWS region |
| `S3_BUCKET` | `warroom-uploads` | Bucket name |
| `S3_ACCESS_KEY_ID` | — | S3 credentials |
| `S3_SECRET_ACCESS_KEY` | — | S3 credentials |

---

## 12. Cách chạy project

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (running, với database `warroom`)
- **Redis** (running, port 6379)

### Step-by-step

```bash
# 1. Clone & install
cd war-room
npm install

# 2. Tạo file .env từ template
cp .env.example .env
# Sửa DATABASE_URL nếu cần

# 3. Tạo database & chạy migration
npx prisma migrate dev

# 4. (Tùy chọn) Seed data
npm run db:seed

# 5. Start development (3 processes)
npm run dev
```

### Các process chạy khi `npm run dev`

```
[dev:web]     Next.js dev server         → http://localhost:3000
[dev:socket]  Socket.IO server           → ws://localhost:3001
[dev:worker]  BullMQ background worker   → (no port, chạy nền)
```

### Scripts hữu ích

| Script | Mô tả |
|---|---|
| `npm run dev` | Start 3 processes (web, socket, worker) |
| `npm run db:migrate` | Chạy Prisma migration |
| `npm run db:push` | Sync schema không tạo migration |
| `npm run db:studio` | Mở Prisma Studio (GUI database) |
| `npm run db:seed` | Chạy seed script |
| `npm run build` | Build production |
| `npm run start` | Start production |

---

## 13. Flow xử lý incident

### Ví dụ thực tế: Server production gặp sự cố

```
1. DevOps Engineer (host) mở http://localhost:3000
   → Click "Create Room"
   → Nhập: Title "API Gateway Down — Prod"
           Duration: 2 giờ
           Password: "incident2026" (tùy chọn)
           Display Name: "Minh — DevOps"
   → Hệ thống tạo room code: "A1B2C3D4"
   → Copy invite link: http://localhost:3000/join/A1B2C3D4

2. Host gửi link cho vendor qua Slack/Email
   → Vendor mở link
   → Nhập display name: "Vendor — CloudFare"
   → Nhập password nếu có
   → Join room thành công

3. Trong room:
   → Host gửi message: "API Gateway trả 503 từ 14:30"
   → Vendor gửi message: "Đang check load balancer"
   → Host upload file: access-log-20260313.log (25MB)
   → Vendor upload ảnh: dashboard-screenshot.png
   → Hệ thống tự tạo system message khi user join/leave

4. Watermark hiện tên user trên toàn bộ màn hình chat
   → Nếu ai screenshot, sẽ thấy tên người screenshot

5. Sau khi fix xong:
   → Host click "End Room"
   → Room chuyển sang status "locked"
   → Tất cả user thấy banner "Room has been ended"
   → Không thể gửi thêm message

6. Sau 30 phút:
   → BullMQ worker chạy delete-room job
   → Xóa toàn bộ: files, messages, attachments, sessions, room
   → Dữ liệu không còn tồn tại
```

---

## 14. Hướng dẫn cho AI agents

### AI Agent Guide

Đây là hướng dẫn để AI agent hiểu và tiếp tục phát triển codebase.

#### Thêm feature mới

| Cần làm gì | Sửa ở đâu |
|---|---|
| Thêm field vào database | `prisma/schema.prisma` → chạy `npx prisma migrate dev` |
| Thêm business logic mới | `services/*.service.ts` |
| Thêm API endpoint mới | `app/api/` — tạo folder/route.ts theo Next.js App Router convention |
| Thêm UI component mới | `components/` (chia theo folder: `room/`, `ui/`, `layout/`) |
| Thêm trang mới | `app/[tên-trang]/page.tsx` |
| Thêm background job mới | `jobs/index.ts` (thêm case), `lib/queue.ts` (thêm schedule) |
| Thêm realtime event mới | `realtime/socket-server.ts` (thêm listener) |

#### Sửa API

- **Route file**: `app/api/rooms/[code]/route.ts` (hoặc subfolder tương ứng)
- **Auth helper**: `lib/api-utils.ts` → `authenticateRequest()`
- **Error handling**: `lib/errors.ts` → throw custom error, `api-utils.ts` → `errorResponse()`
- **Validation**: Dùng Zod hoặc manual validate trong route handler

#### Sửa Realtime logic

- **Socket events**: `realtime/socket-server.ts` → trong `io.on("connection", ...)`
- **Broadcast từ API**: `realtime/broadcast.ts` → thêm function broadcast mới
- **Client-side**: `hooks/useSocket.ts` → thêm listener/emitter mới

#### Sửa UI

- **Room page chính**: `app/room/[code]/page.tsx` — orchestrator, state management
- **Chat components**: `components/room/` — ChatArea, MessageBubble, MessageInput
- **Shared UI**: `components/ui/` — Button, Card, Input, Textarea
- **Styling**: TailwindCSS classes trực tiếp trong components

#### Data flow tổng quát

```
User action (UI)
  → hooks/useSocket.ts (emit event)  HOẶC  lib/api-client.ts (HTTP fetch)
    → realtime/socket-server.ts       HOẶC  app/api/.../route.ts
      → services/*.service.ts (business logic)
        → lib/prisma.ts (database)
        → storage/ (file storage)
        → realtime/broadcast.ts (notify other clients)
```

---

## 15. Nguyên tắc code

### Coding Conventions

- **Ngôn ngữ**: TypeScript strict
- **Style**: ESLint + Next.js conventions
- **Naming**:
  - Files: `kebab-case.ts` (lib, services), `PascalCase.tsx` (components)
  - Functions: `camelCase`
  - Types/Interfaces: `PascalCase`
  - DB enums: `lowercase`
- **Imports**: Path alias `@/` trỏ về root project

### Module Responsibilities

| Module | Trách nhiệm | KHÔNG nên |
|---|---|---|
| `app/api/` | Parse request, gọi service, trả response | Chứa business logic phức tạp |
| `services/` | Business logic, validation, orchestration | Import React hoặc Next.js client code |
| `lib/` | Utilities, config, shared helpers | Chứa business logic |
| `realtime/` | Socket.IO events, broadcast | Truy cập DB trực tiếp (nên qua services) |
| `components/` | UI rendering | Gọi API trực tiếp (nên qua hooks/api-client) |
| `hooks/` | Client-side state, side effects | Chứa business logic |
| `storage/` | File I/O abstraction | Biết về business domain |
| `jobs/` | Job handling, scheduling | Chứa logic phức tạp (delegate cho services) |

### Nơi KHÔNG nên sửa (trừ khi biết rõ)

| File | Lý do |
|---|---|
| `lib/prisma.ts` | Singleton pattern, sửa sai sẽ leak connections |
| `lib/redis.ts` | Singleton pattern, tương tự Prisma |
| `storage/provider.ts` | Interface contract, sửa sẽ break cả local lẫn S3 |
| `prisma/migrations/` | Không bao giờ sửa migration đã chạy — tạo migration mới |
| `lib/queue.ts` | BullMQ config ảnh hưởng tất cả jobs |

### Patterns đang dùng

- **Repository pattern**: Prisma đóng vai trò repository, services gọi Prisma trực tiếp
- **Singleton**: Prisma client, Redis client, Storage provider
- **Factory**: `getStorage()` trả về Local hoặc S3 dựa vào env
- **Pub/Sub**: Redis pub/sub cho cross-process communication
- **Adapter**: Socket.IO Redis Adapter cho horizontal scaling
- **Delayed Job**: BullMQ delayed jobs cho scheduled deletion

---

> **Lưu ý cuối**: Đây là MVP. Một số thứ chưa implement cho production:
> - JWT-based auth (hiện dùng raw session token)
> - Proper bcrypt (hiện dùng SHA-256)
> - CDN cho static assets
> - Monitoring / observability
> - E2E tests
> - CI/CD pipeline
