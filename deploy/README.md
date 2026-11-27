# Deploying to the VPS (soguna.teamerror.net)

## One click from Windows
```powershell
cd d:\soguna_website
.\deploy\pack.ps1 -Server digihealth@YOUR_VPS_IP
```
Packs the code, uploads it to `/home/digihealth/soguna`, and runs `deploy/deploy.sh` there (asks for your sudo password).
Run the same command again for every update.

## Or on the server directly
If the code is already in `/home/digihealth/soguna`:
```bash
cd /home/digihealth/soguna
bash deploy/deploy.sh
```

## Before the first run
- DNS: an **A record** `soguna.teamerror.net → <VPS IP>` (needed for the free SSL certificate; without it the site runs on http and you can re-run later).
- The first run asks: admin mobile number, admin name, whether to load demo content, and an email for SSL notices.
  Non-interactive: `ADMIN_PHONE=017XXXXXXXX ADMIN_NAME="নাম" DEMO=n LETSENCRYPT_EMAIL=you@mail.com bash deploy/deploy.sh`

## What it sets up (and what it leaves alone)
| | Ours | Never touched |
|---|---|---|
| Ports | first free ports from 8110 (API) and 3110 (site), on 127.0.0.1 only, saved in `data/soguna.env` | ports used by anything else |
| Services | `soguna-backend`, `soguna-frontend` (systemd) | other services |
| nginx | one site file with `server_name soguna.teamerror.net`; `nginx -t` must pass, then **reload** (no restart). A failed test reverts our file. | other site files, nginx.conf |
| Database | PostgreSQL role + DB `soguna_app` | other databases/roles, pg_hba.conf |
| Node.js | private copy in `.runtime/node` | system Node / nvm |
| SSL | Let's Encrypt via webroot for this domain only; auto-renew reloads nginx | other certificates |
| Cron | one line tagged `# SOGUNA_BACKUP` (03:30 daily DB dump, 7 days) | your other cron jobs |

The script stops without changing anything web-facing if port 80 belongs to a non-nginx server, or if another nginx site already uses this domain.
It makes the folders on the path to the project traversable (`chmod o+x`, no listing) so nginx can serve `/static` and `/media`.

## Files on the server
- `data/soguna.env` — all settings + secrets (DB password, Django key, SMS). **Keep it; back it up.** Edit SMS settings here, then re-run.
- `data/media/` — uploaded photos, vouchers, documents.
- `data/backups/` — nightly database dumps.
- `data/last-build.log` — last frontend build log.

## Everyday commands
```bash
sudo systemctl status soguna-backend soguna-frontend
sudo journalctl -u soguna-backend -f          # API log (OTP codes appear here until SMS is set up)
sudo journalctl -u soguna-frontend -f
sudo systemctl restart soguna-backend soguna-frontend
cd ~/soguna/backend && .venv/bin/python manage.py create_admin --phone 017XXXXXXXX --name "নাম"
```

## SMS (real OTP messages)
Until SMS is configured, login codes are only written to the backend log:
`sudo journalctl -u soguna-backend -n 50 | grep SMS`.
To send real SMS, edit `data/soguna.env`:
```
SMS_BACKEND=bulksmsbd
SMS_API_KEY=your-key
SMS_SENDER_ID=SOGUNA
```
then `sudo systemctl restart soguna-backend`.

## During an update
The site shows a short "হালনাগাদ হচ্ছে" page while the frontend rebuilds (a few minutes). If the build fails, the previous version is restored automatically.
