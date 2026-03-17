# Supabase Self-Hosted on VPS — Migration Guide

## ✅ Jawaban Singkat

**Ya, Supabase bisa di-run di VPS!** Supabase adalah open-source dan menyediakan Docker setup untuk self-hosting. Aplikasi "Optimazing/Dimsum Dash" ini **bisa dimigrasikan** dari Supabase Cloud ke VPS self-hosted.

---

## 📋 Fitur Supabase yang Digunakan Aplikasi Ini

| Fitur | Digunakan | File |
|-------|-----------|------|
| **Auth** (signup, login, OAuth Google) | ✅ | `src/lib/auth.ts` |
| **Database** (PostgreSQL + RLS) | ✅ | `src/lib/gameService.ts`, `src/lib/adminService.ts` |
| **Row Level Security (RLS)** | ✅ | `supabase/migrations/001_initial_schema.sql` |
| **Database Functions/Triggers** | ✅ | Multiple migration files |
| **Extensions** (pgcrypto, uuid-ossp) | ✅ | `supabase/migrations/001_initial_schema.sql` |
| **Storage** (file uploads) | ❌ | Tidak digunakan |
| **Edge Functions** | ❌ | Tidak digunakan |
| **Realtime** | ❌ | Tidak digunakan |

---

## 🖥️ Minimum VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 2 GB | 4 GB+ |
| **CPU** | 2 vCPU | 4 vCPU |
| **Storage** | 25 GB SSD | 50 GB+ SSD |
| **OS** | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| **Docker** | v20.10+ | Latest stable |
| **Docker Compose** | v2.0+ | Latest stable |

---

## 🚀 Step-by-Step Migration

### Step 1: Prepare VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 2: Clone Supabase Self-Hosted

```bash
# Clone the official Supabase docker setup
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy the example env file
cp .env.example .env
```

### Step 3: Configure Environment Variables

Edit `.env` di folder `supabase/docker/`:

```bash
nano .env
```

**PENTING - Generate secrets baru:**

```bash
# Generate JWT Secret (minimal 32 karakter)
openssl rand -base64 32

# Generate Anon Key dan Service Role Key menggunakan jwt.io atau script
# Gunakan JWT_SECRET yang sama untuk generate kedua key
```

**Update `.env` file:**

```env
############
# Secrets  #
############
POSTGRES_PASSWORD=your_strong_password_here
JWT_SECRET=your-super-long-jwt-secret-at-least-32-chars
ANON_KEY=eyJhbGciOiJIUzI1NiIs...  # Generate with jwt.io
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # Generate with jwt.io

############
# Database #
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API      #
############
SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://api.your-domain.com
SUPABASE_PUBLIC_URL=https://api.your-domain.com

############
# Auth     #
############
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.your-domain.com/auth/v1/callback
```

**Cara Generate JWT Keys:**

```bash
# Install node jwtgen or use this script:
node -e "
const crypto = require('crypto');
const secret = 'your-super-long-jwt-secret-at-least-32-chars';

function generateKey(role, expiresIn) {
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const payload = Buffer.from(JSON.stringify({
    role: role,
    iss: 'supabase',
    iat: now,
    exp: now + expiresIn
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret)
    .update(header+'.'+payload).digest('base64url');
  return header+'.'+payload+'.'+signature;
}

console.log('ANON_KEY:', generateKey('anon', 315360000));
console.log('SERVICE_ROLE_KEY:', generateKey('service_role', 315360000));
"
```

### Step 4: Start Supabase

```bash
cd supabase/docker
docker compose up -d
```

Ini akan menjalankan semua service:
- **PostgreSQL** (database)
- **GoTrue** (auth server)
- **PostgREST** (REST API)
- **Realtime** (websocket, optional)
- **Storage** (file storage, optional)
- **Kong** (API gateway)
- **Studio** (dashboard UI)

### Step 5: Apply Database Migrations

Setelah Supabase running, apply semua migration files:

```bash
# Connect ke PostgreSQL container
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/001_initial_schema.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/002_fix_created_by_nullable.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/003_auto_create_profile_trigger.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/004_harden_auth_and_admin_bootstrap.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260316_add_spin_wheel_prizes.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260317_add_mystery_box_wish_flow.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260317_add_voucher_redemptions.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260317_allow_admin_update_profiles.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260317_enforce_user_data_integrity.sql
docker exec -i supabase-db psql -U postgres -d postgres < /path/to/migrations/20260317_fix_mystery_boxes_admin_delete_policy.sql
```

**Atau gunakan Supabase CLI:**

```bash
# Install Supabase CLI
npm install -g supabase

# Link ke self-hosted instance
supabase link --project-ref your-project-id --db-url postgresql://postgres:your_password@your-vps-ip:5432/postgres

# Push migrations
supabase db push
```

### Step 6: Export Data dari Supabase Cloud (Optional)

Jika ingin memindahkan data existing:

```bash
# Export dari Supabase Cloud
pg_dump "postgresql://postgres:[YOUR-DB-PASSWORD]@db.aezbtbqqmeuynjkqdxjz.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  -t public.profiles \
  -t public.level_progress \
  -t public.prizes \
  -t public.greeting_cards \
  -t public.mystery_boxes \
  -t public.inventory \
  -t public.leaderboard \
  > data_export.sql

# Import ke VPS
docker exec -i supabase-db psql -U postgres -d postgres < data_export.sql
```

**Untuk Auth users:**

```bash
# Export auth users
pg_dump "postgresql://postgres:[YOUR-DB-PASSWORD]@db.aezbtbqqmeuynjkqdxjz.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  -t auth.users \
  -t auth.identities \
  > auth_export.sql

# Import
docker exec -i supabase-db psql -U postgres -d postgres < auth_export.sql
```

### Step 7: Setup Reverse Proxy (Nginx)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create Nginx config:

```nginx
# /etc/nginx/sites-available/supabase
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:8000;  # Kong API Gateway
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (for Realtime)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name studio.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;  # Supabase Studio
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d api.your-domain.com -d studio.your-domain.com
```

### Step 8: Update Aplikasi

Update [`.env`](.env) di project aplikasi:

```env
VITE_SUPABASE_URL="https://api.your-domain.com"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
```

**Tidak perlu ubah kode apapun di [`src/lib/supabase.ts`](src/lib/supabase.ts:1)!** 
Karena `@supabase/supabase-js` client hanya membutuhkan URL dan Anon Key — yang keduanya compatible dengan self-hosted Supabase.

### Step 9: Update Google OAuth Redirect

Di Google Cloud Console:
1. Buka **APIs & Services → Credentials**
2. Edit OAuth 2.0 Client
3. Tambahkan redirect URI baru: `https://api.your-domain.com/auth/v1/callback`
4. Update authorized origins: `https://your-domain.com`

---

## ⚙️ Docker Compose Services (Yang Dibutuhkan)

Karena aplikasi ini **tidak menggunakan** Storage, Edge Functions, dan Realtime, kamu bisa disable services yang tidak perlu untuk menghemat resource:

Edit `docker-compose.yml`:

```yaml
# Services yang WAJIB:
# - db (PostgreSQL)
# - auth (GoTrue)
# - rest (PostgREST)
# - kong (API Gateway)
# - meta (Database metadata)

# Services yang OPTIONAL (bisa di-disable):
# - realtime (tidak digunakan)
# - storage (tidak digunakan)
# - imgproxy (tidak digunakan)
# - edge-functions (tidak digunakan)
# - vector (logging, optional)

# Untuk disable, comment out service di docker-compose.yml
# atau set profile:
# profiles: ["disabled"]
```

---

## 🔒 Security Checklist

- [ ] Ganti semua default passwords
- [ ] Generate JWT secret baru (jangan pakai yang dari cloud)
- [ ] Setup firewall (UFW): hanya buka port 80, 443, 22
- [ ] Jangan expose port PostgreSQL (5432) ke public
- [ ] Setup SSL dengan Let's Encrypt
- [ ] Backup database secara berkala
- [ ] Update Docker images secara berkala

```bash
# Firewall setup
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 💰 Perbandingan Biaya

| | Supabase Cloud (Free) | Supabase Cloud (Pro) | Self-Hosted VPS |
|--|----------------------|---------------------|-----------------|
| **Harga** | $0/bulan | $25/bulan | ~$5-20/bulan (VPS) |
| **Database** | 500 MB | 8 GB | Sesuai disk VPS |
| **Auth Users** | 50,000 | Unlimited | Unlimited |
| **Bandwidth** | 5 GB | 250 GB | Sesuai VPS |
| **Maintenance** | Managed | Managed | Self-managed |
| **Backup** | Otomatis | Otomatis | Manual/script |
| **Uptime** | 99.9% SLA (Pro) | 99.9% SLA | Tergantung VPS |

---

## 🔄 Backup Script (Cron Job)

```bash
#!/bin/bash
# /opt/supabase-backup.sh

BACKUP_DIR="/opt/backups/supabase"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker exec supabase-db pg_dump -U postgres -d postgres \
  --no-owner --no-privileges \
  | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

```bash
# Setup cron (daily at 2 AM)
chmod +x /opt/supabase-backup.sh
crontab -e
# Add: 0 2 * * * /opt/supabase-backup.sh
```

---

## ⚠️ Hal yang Perlu Diperhatikan

1. **Google OAuth**: Redirect URI harus diubah ke domain VPS baru
2. **User data**: Harus di-export dari cloud dan import ke VPS
3. **JWT Secret**: Harus generate baru — token lama tidak akan valid
4. **Semua user harus login ulang** setelah migrasi (karena JWT secret berubah)
5. **Monitoring**: Perlu setup monitoring sendiri (Uptime Kuma, Grafana, dll)
6. **Updates**: Harus manually update Supabase Docker images

---

## 🔐 Setup Google OAuth — Panduan Lengkap

Aplikasi ini menggunakan Google OAuth untuk login (di `src/lib/auth.ts`). Berikut cara mendapatkan **Google Client ID** dan **Client Secret** dari nol:

### Step 1: Buka Google Cloud Console

1. Buka https://console.cloud.google.com/
2. Login dengan akun Google kamu
3. Buat project baru:
   - Klik dropdown project di atas → **New Project**
   - Nama: `Dimsum Dash` (atau nama apapun)
   - Klik **Create**
   - Tunggu sampai project selesai dibuat, lalu pilih project tersebut

### Step 2: Enable API yang Dibutuhkan

1. Di sidebar kiri: **APIs & Services** → **Library**
2. Cari dan enable API berikut:
   - **Google Identity Services** — klik → **Enable**
   - **People API** (opsional, untuk mendapatkan info profil) — klik → **Enable**

### Step 3: Setup OAuth Consent Screen

Ini adalah halaman persetujuan yang akan dilihat user saat login:

1. Di sidebar: **APIs & Services** → **OAuth consent screen**
2. Pilih **External** → klik **Create**
3. Isi **App information**:
   ```
   App name:              Dimsum Dash
   User support email:    email-kamu@gmail.com
   App logo:              (opsional, upload logo game)
   ```
4. Isi **App domain** (opsional tapi disarankan):
   ```
   Application home page:     https://your-domain.com
   Application privacy policy: https://your-domain.com/privacy
   Application terms of service: https://your-domain.com/terms
   ```
5. **Developer contact information**: email-kamu@gmail.com
6. Klik **Save and Continue**

7. Di halaman **Scopes**:
   - Klik **Add or Remove Scopes**
   - Centang:
     - `./auth/userinfo.email` (email user)
     - `./auth/userinfo.profile` (nama & foto user)
     - `openid` (identifikasi user)
   - Klik **Update** → **Save and Continue**

8. Di halaman **Test users**: langsung **Save and Continue**
9. **Summary**: review, lalu **Back to Dashboard**

> ⚠️ **PENTING**: Saat masih "Testing", hanya email yang didaftarkan sebagai Test Users yang bisa login. 
> Untuk membuka ke semua orang: klik **Publish App** di OAuth consent screen.

### Step 4: Buat OAuth 2.0 Client ID (Ini yang Menghasilkan Client ID & Secret)

1. Di sidebar: **APIs & Services** → **Credentials**
2. Klik **+ CREATE CREDENTIALS** → pilih **OAuth client ID**
3. **Application type**: pilih **Web application**
4. **Name**: `Dimsum Dash Web Client`

5. **Authorized JavaScript origins** — URL frontend app kamu:
   ```
   https://your-domain.com
   http://localhost:5173
   ```
   > Klik **+ ADD URI** untuk menambah baris

6. **Authorized redirect URIs** — URL callback Supabase Auth:
   ```
   https://api.your-domain.com/auth/v1/callback
   http://localhost:54321/auth/v1/callback
   ```
   
   > **PENJELASAN redirect URI:**
   > - Format: `<SUPABASE_URL>/auth/v1/callback`
   > - Jika Supabase API di `https://api.dimsundash.com` → `https://api.dimsundash.com/auth/v1/callback`
   > - Jika pakai IP tanpa domain → `http://103.xxx.xxx.xxx:8000/auth/v1/callback`
   > - URI ini HARUS SAMA PERSIS dengan `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` di `.env` Supabase

7. Klik **Create**

### Step 5: Simpan Credentials yang Muncul

Setelah klik Create, akan muncul popup dengan:

```
┌────────────────────────────────────────────────────────┐
│  OAuth client created                                  │
│                                                        │
│  Your Client ID:                                       │
│  123456789012-abcdefghij.apps.googleusercontent.com    │
│                                                        │
│  Your Client Secret:                                   │
│  GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx                     │
│                                                        │
│  [OK]  [DOWNLOAD JSON]                                 │
└────────────────────────────────────────────────────────┘
```

**Simpan kedua nilai ini!** Client Secret hanya ditampilkan sekali (tapi bisa dilihat lagi di halaman Credentials).

### Step 6: Masukkan ke `.env` Supabase Self-Hosted

Di file `.env` di folder `supabase/docker/` di VPS:

```env
############
# Google OAuth Configuration
############
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=123456789012-abcdefghij.apps.googleusercontent.com
GOTRUE_EXTERNAL_GOOGLE_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.your-domain.com/auth/v1/callback
```

**Penjelasan setiap variable:**

| Variable | Dari mana? | Contoh |
|----------|-----------|--------|
| `GOTRUE_EXTERNAL_GOOGLE_ENABLED` | Set `true` untuk aktifkan | `true` |
| `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` | Dari Google Cloud Console Step 5 | `123456789012-xxx.apps.googleusercontent.com` |
| `GOTRUE_EXTERNAL_GOOGLE_SECRET` | Dari Google Cloud Console Step 5 | `GOCSPX-xxxxx` |
| `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` | URL Supabase kamu + `/auth/v1/callback` | `https://api.your-domain.com/auth/v1/callback` |

### Jika Sudah Punya Google OAuth dari Supabase Cloud

Jika sebelumnya sudah setup Google OAuth di Supabase Cloud Dashboard:

1. Buka https://supabase.com/dashboard → Project kamu → **Authentication** → **Providers** → **Google**
2. Di sana ada **Client ID** dan **Client Secret** yang sudah dimasukkan sebelumnya
3. **Client ID dan Secret yang sama bisa dipakai di self-hosted!**
4. Yang perlu ditambahkan **hanya Redirect URI baru** di Google Cloud Console:
   - Buka Google Cloud Console → Credentials → edit OAuth client
   - Tambahkan: `https://api.your-domain.com/auth/v1/callback`
   - Jangan hapus `https://aezbtbqqmeuynjkqdxjz.supabase.co/auth/v1/callback` yang lama kalau masih mau pakai Cloud juga

### Diagram Alur Google OAuth

```
User klik "Login with Google"
        ↓
[App] → supabase.auth.signInWithOAuth({ provider: 'google' })
        ↓
[Supabase GoTrue] → Redirect user ke Google Login Page
        ↓
[Google] → User masukkan email/password → consent
        ↓
[Google] → Redirect ke GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI
           (https://api.your-domain.com/auth/v1/callback?code=xxx)
        ↓
[Supabase GoTrue] → Tukar authorization code dengan access token
                     menggunakan Client ID + Client Secret
        ↓
[Supabase GoTrue] → Buat user session, redirect ke SITE_URL
        ↓
[App] → User sudah login! ✅
```

### Troubleshooting Google OAuth

| Error | Penyebab | Solusi |
|-------|---------|--------|
| `redirect_uri_mismatch` | Redirect URI di Google Console **tidak sama persis** dengan yang di `.env` | Copy-paste URI persis dari `.env` ke Google Console. Perhatikan `http` vs `https`, trailing slash, dll |
| `access_denied` | OAuth consent screen masih "Testing" | Di OAuth consent screen, klik **Publish App** |
| `invalid_client` | Client ID atau Secret salah/typo | Periksa ulang credentials — copy langsung dari Google Console |
| Login berhasil tapi tidak redirect ke app | `SITE_URL` salah di `.env` Supabase | Pastikan `SITE_URL=https://your-domain.com` (URL frontend) |
| `Error 403: access_denied` | Email user tidak ada di Test Users | Publish app atau tambahkan email ke Test Users |

---

## 📖 Resources

- [Supabase Self-Hosting Documentation](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker Repository](https://github.com/supabase/supabase/tree/master/docker)
- [GoTrue (Auth) Configuration](https://github.com/supabase/gotrue)
- [PostgREST Documentation](https://postgrest.org/)
- [Google Cloud Console - OAuth Setup](https://console.cloud.google.com/apis/credentials)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
