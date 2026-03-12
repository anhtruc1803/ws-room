# War Room - Nền tảng Cộng tác Xử lý Sự cố Tạm thời

[English version](README.md)

War Room là một không gian cộng tác thời gian thực, bảo mật và tạm thời, được thiết kế chuyên biệt cho việc quản lý sự cố (Incident Management). Ứng dụng cung cấp một phòng chat tạm thời để đội ngũ của bạn giao tiếp, chia sẻ tài liệu và giải quyết vấn đề một cách nhanh chóng.

## Tính năng Nổi bật

- **Phòng Tự Hủy (Ephemeral):** Các phòng ảo sẽ tự động khóa và xóa vĩnh viễn (hard-delete) mọi dữ liệu sau một khoảng thời gian được thiết lập trước.
- **Chat Thời Gian Thực:** Nhắn tin tức thì qua nền tảng Socket.IO, được trợ lực bởi Redis backplane cho phép mở rộng quy mô máy chủ linh hoạt.
- **Chia sẻ File Bảo mật:** Tải lên tập tin dùng một lần với các đường dẫn (Signed URL) tự động hết hạn, hỗ trợ sao lưu qua Local Storage hoặc lên Đám mây AWS S3.
- **Mật khẩu Bảo vệ:** Khóa kín phòng chat của bạn bằng mã Passcode.
- **Nhật ký Sự kiện (Audit Logs):** Theo dõi ai đã tham gia, thông tin thành viên rời phòng và mọi file báo cáo được tải lên.
- **Kiến trúc Microservice:** Tách riêng Web Server, Socket Server và Background Workers chạy độc lập để dễ dàng thiết lập Tự động mở rộng (Auto-scaling).

## Công nghệ Sử dụng

- **Frontend:** Next.js (React), TailwindCSS
- **Backend APIs:** Next.js API Routes (Bảo mật Dữ liệu bằng Zod Validation)
- **Realtime:** Socket.IO, `@socket.io/redis-adapter`
- **Cơ sở Dữ liệu:** PostgreSQL thông qua Prisma ORM
- **Cache & Pub/Sub:** Redis
- **Background Jobs:** BullMQ
- **Lưu trữ File:** Local hoặc Dịch vụ tương thích AWS S3

## Yêu cầu Hệ thống

- Node.js v18 trở lên
- PostgreSQL server
- Redis server
- AWS S3 (Tùy chọn, khuyến nghị cho môi trường Thực tế - Production)

## Hướng dẫn Bắt đầu Môi trường Lập trình (Dev)

### 1. Clone & Cài đặt

```bash
git clone https://github.com/anhtruc1803/ws-room.git
cd war-room
npm install
```

### 2. Biến Môi trường

Tạo một tệp `.env` ở thư mục gốc (bạn có thể copy từ `.env.example` nếu có) và cấu hình kết nối của bạn:

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

# S3 Configuration (Chỉ áp dụng khi STORAGE_PROVIDER="s3")
S3_ENDPOINT=""
S3_REGION="us-east-1"
S3_BUCKET="warroom-uploads"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

### 3. Thiết lập Database

Chạy lệnh Prisma migration để dựng khung bảng biểu (Schema) PostgreSQL:

```bash
npm run db:migrate
```

### 4. Khởi chạy Ứng dụng

Ứng dụng được chia thành 3 dịch vụ rẽ nhánh. Trong khi dev, bạn có thể chạy đồng thời tất cả bằng một câu lệnh:

```bash
npm run dev
```

Lệnh này chạy:
1. **Next.js Web Server** tại cổng `http://localhost:3000`
2. **Socket.IO Realtime Server** tại cổng `http://localhost:3001`
3. **BullMQ Background Workers** (chạy ngầm trong console)

## Hướng dẫn Deploy lên Production

Đối với môi trường thực tế, bạn nên Build cho ứng dụng Next.js của mình và chạy các cấu thành hệ thống như các Service riêng rẽ lẻ tẻ để dễ dàng Scale ngang.

**Build Mã nguồn:**
```bash
npm run build
```

**Khởi chạy (Tất cả trong 1 server thông qua concurrently):**
```bash
npm start
```

**Scale Microservices riêng biệt ra nhiều máy chủ:**
Thay vì dùng lệnh `npm start`, hãy chạy từng container (vd qua Docker/K8s/ECS) cho đúng tác vụ của server đó:
- Chạy Web HTTP Dashboard: `npm run start:web`
- Chạy Socket.IO chat sever: `npm run start:socket`
- Chạy Worker xoá rác dữ liệu: `npm run start:worker`

### Lưu Ý Việc Scale Máy chủ Socket.IO Chạy Nặng
Máy chủ Socket.IO hiện dùng phần mềm quét Spam Sliding-window với thư viện `@socket.io/redis-adapter` qua Redis. Nghĩa là bạn có thể yên tâm ném hàng trăm bộ CPU chạy lệnh `start:socket` cùng lúc thông qua các Cổng chia tải cân bằng (Load Balancer). Hãy nhớ bật chế độ kết dính người dùng theo IP (Sticky Sessions / Session Affinity) trên Load Balancer để có chỗ dựa vững chắc cho mạng HTTP WebSocket Long-polling nhé.

## Bảo trì và Xóa Dữ liệu Định kỳ

Quy trình tự động BullMQ Workers làm 2 nhiệm vụ:
1. Tự Động Khoá (Lock) phòng hết hạn ngăn chặn tin nhắn mới đổ vào.
2. Tự Động Xoá (Hard-delete) xoá vĩnh viễn không khôi phục khỏi kho Database và khoá file nhạy cảm trên S3.

Luôn luôn duy trì tiến trình `worker.ts` chạy 24/7 để đảm bảo tính năng Bí mật - Phá hủy (Ephemeral Design) trong việc quản lý dự án War Room.
