#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  সগুনা আদর্শ যুব সমাজ — one-click deploy for an Ubuntu/Debian VPS
#
#  Run as your normal user (needs sudo), from the project folder:
#      bash deploy/deploy.sh
#  Run it again any time to deploy an update — it is safe to re-run.
#
#  It never touches other projects on this server:
#    • picks FREE local ports (and remembers them for later runs)
#    • its own PostgreSQL role + database only (soguna_app)
#    • its own systemd services   (soguna-backend, soguna-frontend)
#    • its own nginx site file     (only server_name = $DOMAIN)
#    • a private Node.js under .runtime/ (system Node is left alone)
#    • nginx is only RELOADED after `nginx -t` passes — never restarted
#
#  Optional settings (environment variables):
#    DOMAIN=soguna.teamerror.net   LETSENCRYPT_EMAIL=you@example.com
#    ADMIN_PHONE=017XXXXXXXX  ADMIN_NAME="নাম"   DEMO=1 (load sample content)
#    SKIP_SSL=1
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

DOMAIN="${DOMAIN:-soguna.teamerror.net}"
APP="soguna"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="$ROOT/data"
RUNTIME="$ROOT/.runtime"
STATE="$DATA/soguna.env"
RUN_USER="$(id -un)"
RUN_GROUP="$(id -gn)"
DB_NAME="soguna_app"
DB_USER="soguna_app"
NODE_MAJOR=22
SVC_BACKEND="$APP-backend"
SVC_FRONTEND="$APP-frontend"
NGINX_NAME="$APP-$DOMAIN"

# ── output helpers ──────────────────────────────────────────────────────────
c_g=$'\e[32m'; c_y=$'\e[33m'; c_r=$'\e[31m'; c_b=$'\e[1m'; c_0=$'\e[0m'
step() { printf '\n%s▶ %s%s\n' "$c_b" "$*" "$c_0"; }
ok()   { printf '  %s✓%s %s\n' "$c_g" "$c_0" "$*"; }
warn() { printf '  %s!%s %s\n' "$c_y" "$c_0" "$*"; }
die()  { printf '\n%s✗ %s%s\n' "$c_r" "$*" "$c_0" >&2; exit 1; }
trap 'die "Failed at line $LINENO: $BASH_COMMAND"' ERR

ask() { # ask VAR "question" "default"
  local __v="$1" q="$2" d="${3:-}" a=""
  if [[ -n "${!__v:-}" ]]; then return; fi
  if [[ -t 0 ]]; then read -rp "  $q${d:+ [$d]}: " a || true; fi
  printf -v "$__v" '%s' "${a:-$d}"
}

state_get() { [[ -f "$STATE" ]] && grep -E "^$1=" "$STATE" | tail -n1 | cut -d= -f2- || true; }
state_set() { # replaces or appends KEY=VALUE in the state file
  local k="$1" v="$2"
  if grep -qE "^$k=" "$STATE" 2>/dev/null; then
    local tmp; tmp="$(mktemp)"; awk -v k="$k" -v v="$v" -F= 'BEGIN{OFS="="} $1==k{print k"="v; next} {print}' "$STATE" >"$tmp" && cat "$tmp" >"$STATE" && rm -f "$tmp"
  else
    printf '%s=%s\n' "$k" "$v" >>"$STATE"
  fi
}

port_busy() { ss -Hltn "( sport = :$1 )" 2>/dev/null | grep -q .; }
free_port() { # free_port START [EXCLUDE]
  local p="$1"
  while port_busy "$p" || [[ "$p" == "${2:-}" ]]; do p=$((p + 1)); done
  echo "$p"
}
svc_exists() { systemctl list-unit-files "$1.service" --no-legend 2>/dev/null | grep -q "$1"; }

# ── 0. preflight ────────────────────────────────────────────────────────────
step "Checking the server"
[[ $EUID -ne 0 ]] || die "Run this as your normal user (e.g. digihealth), not root. It uses sudo when needed."
[[ -f "$ROOT/backend/manage.py" && -f "$ROOT/frontend/package.json" ]] || die "Run from the project folder: $ROOT must contain backend/ and frontend/."
command -v apt-get >/dev/null || die "This script supports Ubuntu/Debian (apt) only."
sudo -v || die "sudo is required."
ok "Project: $ROOT · user: $RUN_USER · domain: $DOMAIN"
mkdir -p "$DATA/media" "$DATA/backups" "$DATA/acme" "$DATA/www" "$RUNTIME"
cat >"$DATA/www/soguna-maintenance.html" <<'HTML'
<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="20"><title>হালনাগাদ চলছে</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14532d;color:#fff;font-family:system-ui,sans-serif;text-align:center}div{padding:24px}h1{font-size:26px;margin:0 0 8px}p{opacity:.85;margin:0}</style></head>
<body><div><h1>সগুনা আদর্শ যুব সমাজ</h1><p>সাইট হালনাগাদ হচ্ছে — কয়েক মিনিটের মধ্যে ফিরে আসছি।</p></div></body></html>
HTML
chmod 700 "$DATA/backups"

FIRST_RUN=0
if [[ ! -f "$STATE" ]]; then FIRST_RUN=1; touch "$STATE"; chmod 600 "$STATE"; fi

if [[ $FIRST_RUN == 1 ]]; then
  step "First deploy — a few questions (press Enter to accept the default)"
  ask ADMIN_PHONE "Admin mobile number (logs in to /admin with OTP)" ""
  ask ADMIN_NAME "Admin name" "অ্যাডমিন"
  ask DEMO "Load the sample/demo content? (y/N)" "n"
  ask LETSENCRYPT_EMAIL "Email for SSL certificate expiry notices (optional)" ""
fi

# Something other than nginx on port 80? Then don't install/reload anything web-facing.
if port_busy 80 && ! pgrep -x nginx >/dev/null; then
  die "Port 80 is used by another web server (not nginx). This script won't touch it. Put a reverse proxy rule for $DOMAIN in that server instead."
fi

# ── 1. system packages (only the missing ones; no upgrades) ─────────────────
step "Installing missing system packages"
PKGS=(python3 python3-venv python3-dev build-essential libpq-dev postgresql postgresql-contrib nginx certbot curl ca-certificates xz-utils iproute2 gzip)
MISSING=()
for p in "${PKGS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || MISSING+=("$p"); done
if ((${#MISSING[@]})); then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${MISSING[@]}" >/dev/null
  ok "Installed: ${MISSING[*]}"
else
  ok "All present"
fi
sudo systemctl is-active --quiet postgresql || sudo systemctl enable --now postgresql >/dev/null
sudo systemctl is-active --quiet nginx || sudo systemctl enable --now nginx >/dev/null

# ── 2. Python ≥ 3.10 (system, or a private one via uv) ──────────────────────
step "Python"
PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null; then PY="$(command -v "$c")"; break; fi
done
VENV="$ROOT/backend/.venv"
if [[ -n "$PY" ]]; then
  [[ -x "$VENV/bin/python" ]] || "$PY" -m venv "$VENV"
  ok "Using $("$PY" --version)"
else
  warn "System Python is older than 3.10 — installing a private Python 3.12 (uv) under .runtime/"
  if [[ ! -x "$RUNTIME/uv/uv" ]]; then curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$RUNTIME/uv" UV_NO_MODIFY_PATH=1 sh >/dev/null; fi
  [[ -x "$VENV/bin/python" ]] || "$RUNTIME/uv/uv" venv --python 3.12 --seed "$VENV" >/dev/null
  ok "Using $("$VENV/bin/python" --version)"
fi

# ── 3. private Node.js (never replaces the system one) ──────────────────────
step "Node.js $NODE_MAJOR (private, in .runtime/node)"
NODE="$RUNTIME/node/bin/node"
if [[ ! -x "$NODE" ]] || [[ "$("$NODE" -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  case "$(uname -m)" in x86_64) ARCH=x64 ;; aarch64|arm64) ARCH=arm64 ;; *) die "Unsupported CPU: $(uname -m)" ;; esac
  BASE="https://nodejs.org/dist/latest-v$NODE_MAJOR.x"
  FILE="$(curl -fsSL "$BASE/SHASUMS256.txt" | awk '{print $2}' | grep -E "^node-v[0-9.]+-linux-$ARCH\.tar\.xz$" | head -n1)"
  [[ -n "$FILE" ]] || die "Could not find a Node.js $NODE_MAJOR download for $ARCH"
  TMP="$(mktemp -d)"
  curl -fsSL "$BASE/$FILE" -o "$TMP/$FILE"
  (cd "$TMP" && curl -fsSL "$BASE/SHASUMS256.txt" | grep " $FILE\$" | sha256sum -c - >/dev/null) || die "Node.js download checksum failed"
  rm -rf "$RUNTIME/node" && mkdir -p "$RUNTIME/node"
  tar -xJf "$TMP/$FILE" -C "$RUNTIME/node" --strip-components=1
  rm -rf "$TMP"
fi
export PATH="$RUNTIME/node/bin:$PATH"
ok "node $(node -v) · npm $(npm -v)"

# ── 4. ports (free ones, remembered in data/soguna.env) ─────────────────────
step "Choosing local ports"
BACKEND_PORT="$(state_get BACKEND_PORT)"
FRONTEND_PORT="$(state_get FRONTEND_PORT)"
ours_on() { systemctl is-active --quiet "$1" && port_busy "$2"; }
if [[ -z "$BACKEND_PORT" ]] || { port_busy "$BACKEND_PORT" && ! ours_on "$SVC_BACKEND" "$BACKEND_PORT"; }; then
  BACKEND_PORT="$(free_port 8110)"; fi
if [[ -z "$FRONTEND_PORT" ]] || { port_busy "$FRONTEND_PORT" && ! ours_on "$SVC_FRONTEND" "$FRONTEND_PORT"; }; then
  FRONTEND_PORT="$(free_port 3110 "$BACKEND_PORT")"; fi
state_set BACKEND_PORT "$BACKEND_PORT"
state_set FRONTEND_PORT "$FRONTEND_PORT"
ok "backend 127.0.0.1:$BACKEND_PORT · frontend 127.0.0.1:$FRONTEND_PORT (not exposed publicly)"

# ── 5. PostgreSQL: our own role + database ──────────────────────────────────
step "PostgreSQL database ($DB_NAME)"
DB_PASS="$(state_get DB_PASSWORD)"
[[ -n "$DB_PASS" ]] || { DB_PASS="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"; state_set DB_PASSWORD "$DB_PASS"; }
PG_PORT="$(cd /tmp && sudo -u postgres psql -tAc 'SHOW port' 2>/dev/null | tr -d '[:space:]' || true)"
PG_PORT="${PG_PORT:-5432}"
psql_su() { (cd /tmp && sudo -u postgres psql -v ON_ERROR_STOP=1 -q "$@"); }
if [[ "$(psql_su -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" == "1" ]]; then
  psql_su -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'"
else
  psql_su -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'"
fi
if [[ "$(psql_su -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]]; then
  psql_su -c "CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8' TEMPLATE template0"
fi
DATABASE_URL="postgres://$DB_USER:$DB_PASS@127.0.0.1:$PG_PORT/$DB_NAME"
PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'select 1' >/dev/null \
  || die "Can't connect to PostgreSQL as $DB_USER over 127.0.0.1:$PG_PORT. Check pg_hba.conf allows password (scram/md5) logins for 127.0.0.1."
ok "Connected (port $PG_PORT)"

# ── 6. nginx site (HTTP first, so the SSL challenge can be answered) ─────────
step "nginx site for $DOMAIN"
if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]] && grep -rqs "sites-enabled" /etc/nginx/nginx.conf; then
  NGINX_FILE="/etc/nginx/sites-available/$NGINX_NAME.conf"; NGINX_LINK="/etc/nginx/sites-enabled/$NGINX_NAME.conf"
else
  NGINX_FILE="/etc/nginx/conf.d/$NGINX_NAME.conf"; NGINX_LINK=""
fi
# Another site already claims this domain? Then stop — don't fight over it.
if sudo grep -RlsE "server_name[^;]*[[:space:]]$DOMAIN([[:space:];]|\$)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | grep -v "$NGINX_NAME.conf" | grep -q .; then
  die "Another nginx config already uses server_name $DOMAIN. Remove it first (this script won't edit other sites)."
fi

# nginx (www-data) must be able to reach static/media/acme inside the home folder: traverse-only (o+x), no listing.
d="$ROOT"; while [[ "$d" != "/" ]]; do sudo chmod o+x "$d" 2>/dev/null || true; d="$(dirname "$d")"; done
chmod o+x "$DATA" "$ROOT/backend"

CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
V6=""; [[ -f /proc/net/if_inet6 ]] && V6=1

write_nginx() { # write_nginx http|https
  local mode="$1" tmp; tmp="$(mktemp)"
  {
    echo "# Managed by $ROOT/deploy/deploy.sh — re-running the script overwrites this file."
    echo "upstream ${APP}_backend  { server 127.0.0.1:$BACKEND_PORT; keepalive 16; }"
    echo "upstream ${APP}_frontend { server 127.0.0.1:$FRONTEND_PORT; keepalive 16; }"
    echo
    echo "server {"
    echo "    listen 80;"; if [[ -n "$V6" ]]; then echo "    listen [::]:80;"; fi
    echo "    server_name $DOMAIN;"
    echo "    location /.well-known/acme-challenge/ { root $DATA/acme; }"
    if [[ "$mode" == "https" ]]; then
      echo "    location / { return 301 https://\$host\$request_uri; }"
      echo "}"
      echo
      echo "server {"
      echo "    listen 443 ssl;"; if [[ -n "$V6" ]]; then echo "    listen [::]:443 ssl;"; fi
      echo "    http2 on;"
      echo "    server_name $DOMAIN;"
      echo "    ssl_certificate     $CERT;"
      echo "    ssl_certificate_key $KEY;"
      if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"; else echo "    ssl_protocols TLSv1.2 TLSv1.3;"; echo "    ssl_session_cache shared:${APP}_ssl:10m;"; fi
      echo "    add_header Strict-Transport-Security \"max-age=31536000\" always;"
    fi
    cat <<NGINX
    client_max_body_size 12m;
    error_page 502 503 504 /soguna-maintenance.html;
    location = /soguna-maintenance.html { root $DATA/www; internal; }
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    location /static/ { alias $ROOT/backend/staticfiles/; expires 30d; access_log off; }
    location /media/  { alias $DATA/media/; expires 7d; access_log off; }

    location ~ ^/(api|django-admin)/ {
        proxy_pass http://${APP}_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://${APP}_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$http_connection;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  } >"$tmp"
  # `http2 on;` needs nginx ≥ 1.25.1; older versions take it on the listen line.
  if ! sudo nginx -v 2>&1 | awk -F/ '{split($2,v,"."); exit !((v[1]>1)||(v[1]==1&&v[2]>25)||(v[1]==1&&v[2]==25&&v[3]>=1))}'; then
    sed -i -e '/http2 on;/d' -e 's/listen 443 ssl;/listen 443 ssl http2;/' -e 's/listen \[::\]:443 ssl;/listen [::]:443 ssl http2;/' "$tmp"
  fi
  local backup=""
  if [[ -f "$NGINX_FILE" ]]; then backup="$(mktemp)"; sudo cp "$NGINX_FILE" "$backup"; fi
  sudo install -m 644 "$tmp" "$NGINX_FILE"; rm -f "$tmp"
  if [[ -n "$NGINX_LINK" ]]; then sudo ln -sf "$NGINX_FILE" "$NGINX_LINK"; fi
  if sudo nginx -t >/dev/null 2>&1; then
    sudo systemctl reload nginx
    rm -f "${backup:-/nonexistent}"
  else
    sudo nginx -t || true
    if [[ -n "$backup" ]]; then sudo install -m 644 "$backup" "$NGINX_FILE"; rm -f "$backup"; else sudo rm -f "$NGINX_FILE" ${NGINX_LINK:+"$NGINX_LINK"}; fi
    die "nginx config test failed — reverted our file; other sites were not affected."
  fi
}

if sudo test -f "$CERT"; then write_nginx https; else write_nginx http; fi
ok "Wrote $NGINX_FILE (nginx reloaded)"

# ── 7. SSL (Let's Encrypt via webroot — certbot never edits nginx files) ────
SCHEME="http"
if sudo test -f "$CERT"; then
  SCHEME="https"; ok "SSL certificate already present"
elif [[ "${SKIP_SSL:-0}" == "1" ]]; then
  warn "SKIP_SSL=1 — staying on http"
else
  step "SSL certificate for $DOMAIN"
  MYIP="$(curl -fsS4 --max-time 6 https://api.ipify.org || true)"
  DNSIP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
  if sudo ufw status 2>/dev/null | grep -q "Status: active"; then sudo ufw allow 80/tcp >/dev/null; sudo ufw allow 443/tcp >/dev/null; fi
  # Can Let's Encrypt reach us? Put a token in the challenge folder and fetch it through the domain.
  # (Works with a direct A record AND behind a Cloudflare proxy, where the DNS IP is Cloudflare's.)
  PROBE="probe-$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  mkdir -p "$DATA/acme/.well-known/acme-challenge"; chmod -R o+rX "$DATA/acme"
  echo "$PROBE" >"$DATA/acme/.well-known/acme-challenge/$PROBE"
  GOT="$(curl -fsS --max-time 15 "http://$DOMAIN/.well-known/acme-challenge/$PROBE" 2>/dev/null || true)"
  rm -f "$DATA/acme/.well-known/acme-challenge/$PROBE"
  BEHIND_CF=""
  curl -sI --max-time 10 "http://$DOMAIN/" 2>/dev/null | grep -qi '^server: *cloudflare' && BEHIND_CF=1
  if [[ -z "$DNSIP" ]]; then
    warn "$DOMAIN doesn't resolve yet. Add an A record → ${MYIP:-this server IP}, then re-run. Staying on http."
  elif [[ "$GOT" != "$PROBE" ]]; then
    warn "http://$DOMAIN/.well-known/acme-challenge/ doesn't reach this server (DNS: $DNSIP, server: ${MYIP:-?})."
    if [[ -n "$BEHIND_CF" ]]; then
      warn "Behind Cloudflare: turn OFF 'Always Use HTTPS' (or add a Page Rule/Configuration Rule excluding /.well-known/*), then re-run."
    else
      warn "Point the A record to ${MYIP:-this server}, then re-run. Staying on http."
    fi
  else
    if [[ -n "$BEHIND_CF" ]]; then ok "Reachable through Cloudflare proxy (DNS $DNSIP)"; else ok "Reachable (DNS $DNSIP)"; fi
    EMAIL_ARGS=(--register-unsafely-without-email); [[ -n "${LETSENCRYPT_EMAIL:-}" ]] && EMAIL_ARGS=(-m "$LETSENCRYPT_EMAIL")
    if sudo certbot certonly --webroot -w "$DATA/acme" -d "$DOMAIN" --non-interactive --agree-tos "${EMAIL_ARGS[@]}" \
         --deploy-hook "systemctl reload nginx" >/dev/null 2>&1; then
      write_nginx https; SCHEME="https"; ok "Certificate issued · auto-renews via certbot timer"
    else
      warn "certbot failed (see: sudo tail -n 40 /var/log/letsencrypt/letsencrypt.log). Staying on http — re-run later."
    fi
  fi
fi
ORIGIN="$SCHEME://$DOMAIN"

# ── 8. app settings (data/soguna.env — kept across deploys; edit SMS keys here) ──
step "App settings ($STATE)"
SECRET="$(state_get DJANGO_SECRET_KEY)"
[[ -n "$SECRET" ]] || SECRET="$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 60)"
state_set DJANGO_SECRET_KEY "$SECRET"
state_set DJANGO_DEBUG false
state_set DJANGO_ALLOWED_HOSTS "$DOMAIN,127.0.0.1,localhost"
state_set CSRF_TRUSTED_ORIGINS "https://$DOMAIN,http://$DOMAIN"
state_set CORS_ALLOWED_ORIGINS "https://$DOMAIN,http://$DOMAIN"
state_set PUBLIC_API_ORIGIN "$ORIGIN"
state_set DATABASE_URL "$DATABASE_URL"
state_set MEDIA_ROOT "$DATA/media"
[[ -n "$(state_get SMS_BACKEND)" ]] || { state_set SMS_BACKEND console; state_set SMS_API_KEY ""; state_set SMS_SENDER_ID SOGUNA; }
chmod 600 "$STATE"
rm -f "$ROOT/backend/.env"; ln -s "$STATE" "$ROOT/backend/.env"
ok "Saved (backend/.env → data/soguna.env)"

# ── 9. backend: dependencies, migrations, static files ──────────────────────
step "Backend (Django)"
"$VENV/bin/python" -m pip install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$ROOT/backend/requirements.txt"
cd "$ROOT/backend"
"$VENV/bin/python" manage.py migrate --noinput -v0
"$VENV/bin/python" manage.py collectstatic --noinput -v0
chmod -R o+rX "$ROOT/backend/staticfiles" "$DATA/media" "$DATA/acme" "$DATA/www"
if [[ "${DEMO:-n}" =~ ^[YyHh1হ] ]]; then "$VENV/bin/python" manage.py seed; else "$VENV/bin/python" manage.py seed --basics; fi
if [[ -n "${ADMIN_PHONE:-}" ]]; then "$VENV/bin/python" manage.py create_admin --phone "$ADMIN_PHONE" --name "${ADMIN_NAME:-অ্যাডমিন}"; fi
ok "Migrated · static collected"

# ── 10. systemd services ────────────────────────────────────────────────────
step "Services"
unit() { # unit NAME CONTENT
  local f="/etc/systemd/system/$1.service" tmp; tmp="$(mktemp)"; printf '%s\n' "$2" >"$tmp"
  sudo install -m 644 "$tmp" "$f"; rm -f "$tmp"
}
unit "$SVC_BACKEND" "[Unit]
Description=Soguna backend (Django + Gunicorn) — $DOMAIN
After=network.target postgresql.service

[Service]
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$ROOT/backend
EnvironmentFile=$STATE
ExecStart=$VENV/bin/gunicorn config.wsgi:application --bind 127.0.0.1:$BACKEND_PORT --workers 3 --timeout 60 --access-logfile - --error-logfile -
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target"

unit "$SVC_FRONTEND" "[Unit]
Description=Soguna frontend (Next.js) — $DOMAIN
After=network.target $SVC_BACKEND.service

[Service]
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$ROOT/frontend
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=API_URL=http://127.0.0.1:$BACKEND_PORT/api
ExecStart=$NODE $ROOT/frontend/node_modules/next/dist/bin/next start -p $FRONTEND_PORT -H 127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target"
sudo systemctl daemon-reload
sudo systemctl enable "$SVC_BACKEND" "$SVC_FRONTEND" >/dev/null 2>&1
sudo systemctl restart "$SVC_BACKEND"
for _ in $(seq 1 30); do curl -fsS -o /dev/null "http://127.0.0.1:$BACKEND_PORT/api/site/" && break; sleep 1; done
curl -fsS -o /dev/null "http://127.0.0.1:$BACKEND_PORT/api/site/" || { sudo journalctl -u "$SVC_BACKEND" -n 40 --no-pager; die "Backend did not start"; }
ok "Backend running"

# ── 11. frontend: install + build (public pages are prerendered from the API) ──
step "Frontend (Next.js) — install & build (takes a few minutes)"
cd "$ROOT/frontend"
MEM_MB="$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)"
if (( MEM_MB < 1200 )); then warn "Only ${MEM_MB} MB RAM free — the build may be slow or fail. Adding swap helps."; fi
# The running site reads node_modules/.next, so stop it first (visitors see the maintenance page meanwhile).
if svc_exists "$SVC_FRONTEND"; then sudo systemctl stop "$SVC_FRONTEND" || true; fi
LOCK_HASH="$(sha256sum package-lock.json | cut -c1-16)"
if [[ ! -d node_modules || "$(state_get NPM_LOCK_HASH)" != "$LOCK_HASH" ]]; then
  npm ci --no-audit --no-fund --loglevel=error
  state_set NPM_LOCK_HASH "$LOCK_HASH"
else
  ok "Dependencies unchanged — skipping npm ci"
fi
rm -rf .next.prev
if [[ -d .next ]]; then mv .next .next.prev; fi
cat >"$ROOT/frontend/.env.production.local" <<ENV
NEXT_PUBLIC_API_URL=$ORIGIN/api
NEXT_PUBLIC_SITE_URL=$ORIGIN
API_URL=http://127.0.0.1:$BACKEND_PORT/api
ENV
NEXT_TELEMETRY_DISABLED=1 API_URL="http://127.0.0.1:$BACKEND_PORT/api" npx next build >"$DATA/last-build.log" 2>&1 \
  || { tail -n 40 "$DATA/last-build.log"; rm -rf .next; if [[ -d .next.prev ]]; then mv .next.prev .next; sudo systemctl start "$SVC_FRONTEND" || true; fi
       die "Frontend build failed (full log: $DATA/last-build.log). The previous version was restored."; }
rm -rf .next.prev
sudo systemctl restart "$SVC_FRONTEND"
for _ in $(seq 1 30); do curl -fsS -o /dev/null "http://127.0.0.1:$FRONTEND_PORT/" && break; sleep 1; done
curl -fsS -o /dev/null "http://127.0.0.1:$FRONTEND_PORT/" || { sudo journalctl -u "$SVC_FRONTEND" -n 40 --no-pager; die "Frontend did not start"; }
ok "Frontend running"

# ── 12. daily database backup (keeps 7 days) — only our own crontab line ────
step "Daily backup"
BACKUP="$ROOT/deploy/backup.sh"
cat >"$BACKUP" <<SH
#!/usr/bin/env bash
# Daily PostgreSQL dump for $DOMAIN (written by deploy.sh). Keeps 7 days.
set -euo pipefail
URL="\$(grep -E '^DATABASE_URL=' "$STATE" | cut -d= -f2-)"
pg_dump "\$URL" | gzip >"$DATA/backups/db-\$(date +%F).sql.gz"
find "$DATA/backups" -name 'db-*.sql.gz' -mtime +7 -delete
SH
chmod 700 "$BACKUP"
( crontab -l 2>/dev/null | grep -v "# SOGUNA_BACKUP" || true; echo "30 3 * * * $BACKUP >/dev/null 2>&1 # SOGUNA_BACKUP" ) | crontab -
ok "03:30 every night → data/backups/"

# ── 13. final check ─────────────────────────────────────────────────────────
step "Checking $ORIGIN"
if [[ "$SCHEME" == "https" ]]; then
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 --resolve "$DOMAIN:443:127.0.0.1" "$ORIGIN/" || true)"
else
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H "Host: $DOMAIN" http://127.0.0.1/ || true)"
fi
[[ "$CODE" == "200" ]] && ok "Site answers 200" || warn "Site answered HTTP $CODE — check: sudo journalctl -u $SVC_FRONTEND -n 50"

cat <<DONE

${c_g}${c_b}✓ Deployed: $ORIGIN${c_0}
  Admin panel : $ORIGIN/admin   (log in with the admin phone + OTP)
  Settings    : $STATE   (SMS keys etc. — re-run the script after editing)
  Logs        : sudo journalctl -u $SVC_BACKEND -f     ·  sudo journalctl -u $SVC_FRONTEND -f
  OTP codes   : until SMS is configured they are printed in the backend log:
                sudo journalctl -u $SVC_BACKEND -n 50 | grep SMS
  Update      : upload the new code, then run  bash deploy/deploy.sh  again
DONE
