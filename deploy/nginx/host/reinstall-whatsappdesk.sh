#!/bin/sh
# Run on the VPS as root (or with sudo). Resets host nginx vhost for whatsappdesk only.
# Does NOT touch bot, divinebudgets, or Docker.
set -eu

SITE=whatsappdesk.techfindconsulting.africa
AVAILABLE="/etc/nginx/sites-available/$SITE"
ENABLED="/etc/nginx/sites-enabled/$SITE"
REPO_CONF="$(CDPATH= cd -- "$(dirname "$0")" && pwd)/whatsappdesk.conf.example"

if [ ! -f "$REPO_CONF" ]; then
  echo "Missing $REPO_CONF — run from whatsapp-ui clone on the server." >&2
  exit 1
fi

echo "Removing old vhost links/files for $SITE..."
rm -f "$ENABLED"
rm -f "$AVAILABLE"

echo "Installing fresh config from repo example..."
cp "$REPO_CONF" "$AVAILABLE"
ln -sf "$AVAILABLE" "$ENABLED"

echo "Checking for duplicate server_name / upstream..."
grep -R "server_name.*$SITE\|upstream whatsappdesk_ui" /etc/nginx/sites-enabled/ || true

echo "Testing nginx config..."
nginx -t

echo "Reloading nginx..."
systemctl reload nginx

echo ""
echo "Verify UI container:"
echo "  curl -fsS http://127.0.0.1:3002/ | head -c 120"
echo ""
echo "Verify vhost:"
echo "  curl -fsS http://$SITE/ | head -c 120"
echo "  curl -fsSk https://$SITE/ | head -c 120"
echo ""
echo "If HTTPS fails with cert errors, re-issue (optional):"
echo "  certbot certonly --webroot -w /var/www/html -d $SITE"
echo "  nginx -t && systemctl reload nginx"
