#!/bin/bash
# Yapgitsin Live FTP Deployment
# Usage:
#   1. cp .env.deploy.example .env.deploy
#   2. .env.deploy'a credentials gir
#   3. source .env.deploy && bash scripts/live-deploy.sh
#
# ENV:
#   FTP_HOST    (orn: ftp.yapgitsin.tr veya 93.89.224.84)
#   FTP_USER    (Plesk FTP kullanicisi)
#   FTP_PASS    (parola)
#   FTP_PORT    (default 21)
#   FTP_REMOTE_DIR (orn: /httpdocs veya /public_html)
#   FTP_USE_TLS (1 = lftp set ssl:verify true)

set -euo pipefail

: "${FTP_HOST:?FTP_HOST env gerekli}"
: "${FTP_USER:?FTP_USER env gerekli}"
: "${FTP_PASS:?FTP_PASS env gerekli}"
FTP_PORT="${FTP_PORT:-21}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/httpdocs}"
FTP_USE_TLS="${FTP_USE_TLS:-0}"

# lftp varlik check
command -v lftp >/dev/null 2>&1 || {
  echo "lftp yok. Kur: pacman -S lftp / apt install lftp / brew install lftp"
  exit 1
}

# Local D:\ paths
LOCAL_BACKEND="/d/backend"
LOCAL_ADMIN="/d/admin"
LOCAL_APP="/d/app"
LOCAL_WEB="/d/web"

# Dogrulama
for p in "$LOCAL_BACKEND" "$LOCAL_ADMIN" "$LOCAL_APP" "$LOCAL_WEB"; do
  [ -d "$p" ] || { echo "Local path yok: $p - once 'bash scripts/deploy-to-d.sh' calistir"; exit 1; }
done

echo "Live deploy -> $FTP_HOST$FTP_REMOTE_DIR"
TS=$(date +%Y%m%d_%H%M%S)

LFTP_OPTS=""
if [ "$FTP_USE_TLS" = "1" ]; then
  LFTP_OPTS="set ftp:ssl-allow yes; set ssl:verify-certificate no;"
fi

upload_dir() {
  local local_path="$1"
  local remote_path="$2"
  echo "-> $local_path -> $remote_path"
  lftp -p "$FTP_PORT" -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
$LFTP_OPTS
set ftp:passive-mode true
set net:max-retries 3
set net:reconnect-interval-base 5
mkdir -p $remote_path
mirror -R --delete --parallel=4 --verbose=1 $local_path $remote_path
bye
EOF
}

upload_dir "$LOCAL_BACKEND" "$FTP_REMOTE_DIR/backend"
upload_dir "$LOCAL_ADMIN" "$FTP_REMOTE_DIR/admin"
upload_dir "$LOCAL_APP" "$FTP_REMOTE_DIR/app"
upload_dir "$LOCAL_WEB" "$FTP_REMOTE_DIR"  # web root

echo "Live deploy tamam: https://yapgitsin.tr"
