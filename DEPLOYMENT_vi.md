# Hướng dẫn Triển khai Production trên Ubuntu 22.04

Tài liệu này hướng dẫn cách triển khai ứng dụng War Room trên một máy chủ dòng lệnh Ubuntu 22.04 mới tinh. Chúng ta sẽ sử dụng **PM2** để quản lý các microservices của Node.js, **Nginx** làm reverse proxy, **PostgreSQL** làm cơ sở dữ liệu chính và **Redis** để đồng bộ Socket.IO và hàng đợi BullMQ.

## Tiền Điều kiện Cần có
- Một Server đang cài hệ điều hành Ubuntu 22.04 LTS.
- Một tài khoản User có quyền `sudo`.
- Một Tên miền (Domain) đã trỏ bản ghi IP (A record) về địa chỉ Public IP của Server (vd: `warroom.example.com`).

---

## Bước 1: Cài đặt các gói Phụ trợ Hệ thống

Cập nhật hệ điều hành và cài đặt curl, git, PostgreSQL, Redis và Nginx:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git postgresql postgresql-contrib redis-server nginx
```

Kiểm tra Redis đã khởi chạy chưa:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

## Bước 2: Cấu hình PostgreSQL

Tạo một database ảo và một user chuyên dụng cho ứng dụng.

```bash
sudo -u postgres psql
```

Trong giao diện dòng lệnh của PostgreSQL, chạy các lệnh SQL sau:
```sql
CREATE DATABASE warroom;
CREATE USER warroom_user WITH ENCRYPTED PASSWORD 'mat_khau_kho_doan_cua_ban';
GRANT ALL PRIVILEGES ON DATABASE warroom TO warroom_user;
ALTER DATABASE warroom OWNER TO warroom_user;
\q
```

## Bước 3: Cài đặt Node.js v20 và PM2

Cài đặt Node.js (thông qua kho NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Cài đặt PM2 toàn cầu để quản lý các luồng máy chủ chia tách của chúng ta:
```bash
sudo npm install -g pm2
```

## Bước 4: Clone Mã Nguồn (Repository) Của Bạn

```bash
cd /var/www
sudo mkdir warroom
sudo chown -R $USER:$USER /var/www/warroom
git clone https://github.com/anhtruc1803/ws-room.git /var/www/warroom
cd /var/www/warroom

# Cài đặt thư viện NPM
npm install
```

## Bước 5: Cấu hình Biến Môi trường (.env)

Tạo file biến cấu hình:
```bash
cp .env.example .env
nano .env
```

Cập nhật nội dung lệnh `.env` giống với tài khoản DB bạn đã cấp ở Bước 2:
```env
# Đổi thay cấu hình khớp Bước 2
DATABASE_URL="postgresql://warroom_user:mat_khau_kho_doan_cua_ban@localhost:5432/warroom?schema=public"

REDIS_URL="redis://localhost:6379"

# Tên miền Public Server của bạn
NEXT_PUBLIC_APP_URL="https://warroom.example.com"
SOCKET_PORT="3001"
JWT_SECRET="bam_bua_mot_chuoi_ky_tu_cuc_dai_o_day"

STORAGE_PROVIDER="local"
STORAGE_DIR="./storage-files"
```

## Bước 6: Dựng Migration Database và Build Code

Khởi chạy Prisma đẩy cấu trúc Bảng Biểu xuống PostgreSQL, và biên dịch thuật toán frontend Next.js:
```bash
npm run db:migrate
npm run build
```

## Bước 7: Bật Server bằng PM2

Chúng ta sẽ cấp quyền cho 3 node services chạy rẽ nhánh độc lập, giúp chúng tận dụng tối đa CPU mà không bị chèn ép nhau.

```bash
# Bật Web Server của Next.js
pm2 start npm --name "warroom-web" -- run start:web

# Bật Server gánh Realtime Chat của Socket.IO
pm2 start npm --name "warroom-socket" -- run start:socket

# Bật công nhân dọn rác Background BullMQ
pm2 start npm --name "warroom-worker" -- run start:worker

# Lưu trạng thái PM2 lại để Server có khởi động lại thì PM2 cũng tự bật Web
pm2 save
pm2 startup
```

*(Làm theo hướng dẫn dòng lệnh được in ra sau khi gõ `pm2 startup` để dán lệnh chạy sudo).*

## Bước 8: Cấu hình Nginx làm Bộ Chia Tải (Reverse Proxy)

Chúng ta cần Nginx làm "Chú bảo vệ", hướng luồng traffic tải Web bình thường vào cổng `3000` (Web) và luồng traffic nhắn tin (`/socket.io/`) chui lọt qua cổng `3001` (Socket server).

Tạo một file config Nginx mới:
```bash
sudo nano /etc/nginx/sites-available/warroom
```

Dán đoạn code cấu hình sau:
```nginx
server {
    listen 80;
    server_name warroom.example.com; # Đổi bằng domain của bạn

    # Ép traffic Web thường vào Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Ép traffic Websocket vào Máy chủ Socket.ts
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Kính hoạt file cấu hình và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/warroom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Bước 9: Cấp phát chứng chỉ Bảo mật màng Lưới HTTPS (SSL)

Cài đặt Certbot để nhận chứng chỉ số Miễn phí bảo mật đường truyền (Chống nghe lén):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d warroom.example.com
```
Làm theo các câu hỏi xác nhận trên màn hình và chọn chế độ "Redirect" để tự động ép các HTTP link sang HTTPS bảo mật nhé.

---

### Xong rồi đó! 🚀
Web Chat tự hủy của bạn đã chính thức lăn bánh và Live chạy trực tuyến trên môi trường Ubuntu 22.04 Production. Lúc nào muốn soi console bug lỗi thì bạn chỉ việc gõ: `pm2 logs`.
