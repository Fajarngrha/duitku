# FinBot Tracker

Catat pengeluaran dari Telegram, lalu lihat totalnya di dashboard.

Development di komputer ini:

```bash
npm install
npm run dev
```

Buka http://127.0.0.1:5173/

## Sambungkan chatbot Telegram

1. Buka Telegram, cari `@BotFather`, lalu kirim `/newbot`.
2. Isi nama bot dan username yang diakhiri `bot`.
3. Salin token yang diberikan BotFather ke file `.env`:

```
TELEGRAM_BOT_TOKEN=123456789:token-dari-botfather
```

4. Jalankan ulang aplikasinya.
5. Buka bot, kirim `/start`, lalu kirim `50000 makan siang`.

Bot memakai long polling, jadi Raspberry Pi tidak perlu alamat HTTPS publik. Orang pertama yang mengirim pesan menjadi pemilik. Untuk mengunci satu chat, isi `TELEGRAM_CHAT_ID` di `.env`.

Jalankan hanya satu proses bot. Dua proses dengan token yang sama akan bentrok.

## Deploy ke Raspberry Pi

Butuh Node.js 22 (minimal 20.19). Node dari paket bawaan Raspberry Pi OS biasanya terlalu lama. Pasang Node 22, lalu salin proyek ini ke Pi **tanpa** folder `node_modules`. Modul Windows tidak bisa dipakai di Pi.

Di Pi:

```bash
cd /home/pi/finbot
npm install
npm run build
NODE_ENV=production HOST=127.0.0.1 PORT=8080 npm start
```

Dashboard lokal ada di `http://127.0.0.1:8080`. Data tersimpan di `data/ledger.json`.

Agar hidup lagi setelah Pi dinyalakan ulang, sesuaikan user dan path di `deploy/finbot.service`, lalu:

```bash
sudo cp deploy/finbot.service /etc/systemd/system/finbot.service
sudo systemctl daemon-reload
sudo systemctl enable --now finbot
```

Jangan membuka port 8080 di router. API ini belum punya login.

## Domain Niagahoster lewat Cloudflare Tunnel

Ganti `finbot.domainanda.com` dengan subdomain yang ingin dipakai. Aplikasi tetap di `127.0.0.1:8080`. Tunnel yang menghubungkan domain ke Pi. Bot Telegram tidak memakai domain ini.

1. Buat akun di https://dash.cloudflare.com dan pilih **Add a site**. Masukkan domain Niagahoster, pilih plan Free.
2. Cloudflare menampilkan dua nameserver, misalnya `ada.ns.cloudflare.com` dan `bob.ns.cloudflare.com`.
3. Di Niagahoster, buka domain itu, pilih pengaturan nameserver, lalu ganti ke kedua nameserver Cloudflare. Jangan hanya menambah record A.
4. Kalau domain itu juga dipakai untuk email, salin record MX, SPF, dan DKIM ke DNS Cloudflare sebelum nameserver berpindah. Kalau tidak disalin, email berhenti.
5. Tunggu status domain di Cloudflare menjadi **Active**.
6. Di Pi, pasang `cloudflared`. Untuk Raspberry Pi 64-bit:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

Pi 32-bit memakai `cloudflared-linux-arm`.

7. Login dan buat tunnel. Perintah login menampilkan URL; buka URL itu di komputer dan pilih domain yang sama.

```bash
cloudflared tunnel login
cloudflared tunnel create finbot
cloudflared tunnel route dns finbot finbot.domainanda.com
```

8. Salin `deploy/cloudflared-config.yml` ke `/home/pi/.cloudflared/config.yml`. Isi Tunnel ID dari `cloudflared tunnel list`, dan ganti hostname.
9. Jalankan tunnel sebagai layanan:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

10. Di Cloudflare Zero Trust, buat aplikasi **Access** untuk hostname itu. Izinkan hanya email Anda, dengan login One-time PIN. Tanpa langkah ini, siapa saja yang tahu alamatnya bisa mengubah data keuangan.
11. Hentikan `npm run dev` di komputer ini sebelum bot di Pi dinyalakan. Token Telegram hanya boleh dipakai satu proses.
12. Buka `https://finbot.domainanda.com`. Cloudflare meminta PIN email, lalu dashboard muncul.
