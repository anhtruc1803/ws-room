# Ubuntu 22.04 Production Deployment Guide

This guide describes how to deploy the War Room application on a fresh Ubuntu 22.04 production server. We will use **PM2** to manage the Node.js microservices, **Nginx** as a reverse proxy, **PostgreSQL** for the database, and **Redis** for Socket.IO synchronization and BullMQ.

## Prerequisites
- A server running Ubuntu 22.04 LTS.
- A user with `sudo` privileges.
- A domain name pointing to your server's public IP address (e.g., `warroom.example.com`).

---

## Step 1: Install System Dependencies

Update the system and install curl, git, PostgreSQL, Redis, and Nginx:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git postgresql postgresql-contrib redis-server nginx
```

Verify Redis is running:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

## Step 2: Configure PostgreSQL

Create a database and a dedicated user for the application.

```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt, run:
```sql
CREATE DATABASE warroom;
CREATE USER warroom_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE warroom TO warroom_user;
ALTER DATABASE warroom OWNER TO warroom_user;
\q
```

## Step 3: Install Node.js v20 and PM2

Install Node.js (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Install PM2 globally to manage our decoupled microservices:
```bash
sudo npm install -g pm2
```

## Step 4: Clone the Repository and Install Dependencies

```bash
cd /var/www
sudo mkdir warroom
sudo chown -R $USER:$USER /var/www/warroom
git clone https://github.com/anhtruc1803/ws-room.git /var/www/warroom
cd /var/www/warroom

# Install dependencies
npm install
```

## Step 5: Configure Environment Variables

Create the `.env` file:
```bash
cp .env.example .env
nano .env
```

Update your `.env` variables to match your production setup:
```env
# Change password to match Step 2
DATABASE_URL="postgresql://warroom_user:your_strong_password_here@localhost:5432/warroom?schema=public"

REDIS_URL="redis://localhost:6379"

# Your public domain
NEXT_PUBLIC_APP_URL="https://warroom.example.com"
SOCKET_PORT="3001"
JWT_SECRET="generate-a-very-long-random-string-here"

STORAGE_PROVIDER="local"
STORAGE_DIR="./storage-files"
```

## Step 6: Database Migration and Build

Run Prisma migrations to create the tables, then build the Next.js frontend:
```bash
npm run db:migrate
npm run build
```

## Step 7: Start Services with PM2

We will start the 3 decoupled services independently so they can scale and operate without blocking each other.

```bash
# Start the Next.js Web Server
pm2 start npm --name "warroom-web" -- run start:web

# Start the Socket.IO Realtime Server
pm2 start npm --name "warroom-socket" -- run start:socket

# Start the BullMQ Background Worker
pm2 start npm --name "warroom-worker" -- run start:worker

# Save the PM2 list so they restart on server crash/reboot
pm2 save
pm2 startup
```

*(Follow the command output by `pm2 startup` and run it with sudo).*

## Step 8: Configure Nginx as a Reverse Proxy

We need Nginx to route normal HTTP traffic to port `3000` (Web) and WebSocket traffic (`/socket.io/`) to port `3001` (Socket server).

Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/warroom
```

Paste the following config:
```nginx
server {
    listen 80;
    server_name warroom.example.com; # Replace with your domain

    # Route normal web traffic to the Next.js server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Route WebSocket traffic to the Socket.ts server
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

Enable the configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/warroom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: Secure with SSL (Certbot/Let's Encrypt)

Install Certbot to get a free HTTPS certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d warroom.example.com
```
Follow the prompts, and let Certbot automatically redirect HTTP to HTTPS.

---

### You're all set! 🚀
Your ephemeral War Room application is now successfully running in production on Ubuntu 22.04. Monitor logs anytime with: `pm2 logs`.
