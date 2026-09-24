#!/usr/bin/env sh
set -eu

DOMAIN="${CERTBOT_DOMAIN:-whatsappdesk.techfindconsulting.africa}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Host nginx mode: Docker does not bind 80/443."
echo "Starting UI on 127.0.0.1:${UI_PORT:-3002}..."
docker compose up -d ui

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${UI_PORT:-3002}/" >/dev/null; then
    break
  fi
  sleep 2
done

if ! curl -fsS "http://127.0.0.1:${UI_PORT:-3002}/" >/dev/null; then
  echo "UI is not responding on 127.0.0.1:${UI_PORT:-3002} — check docker compose logs ui." >&2
  exit 1
fi

echo ""
echo "Next on the SERVER (host nginx, alongside your other apps):"
echo ""
echo "  1. Install bootstrap vhost (HTTP only, proxies to Docker UI):"
echo "     sudo cp deploy/nginx/host/whatsappdesk.http-bootstrap.conf.example \\"
echo "       /etc/nginx/sites-available/$DOMAIN"
echo "     sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/"
echo "     sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  2. Issue certificate with the same certbot flow you use for other sites, e.g.:"
echo "     sudo certbot --nginx -d $DOMAIN"
echo "     # or webroot (adjust -w if your vhosts use a different path):"
echo "     sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN"
echo ""
echo "  3. After HTTPS works, use the production snippet (redirect on :80 + :443 proxy):"
echo "     deploy/nginx/host/whatsappdesk.conf.example"
echo ""
echo "Ensure location ^~ /.well-known/acme-challenge/ uses the SAME webroot path"
echo "as your other certbot-managed sites on this host."
