#!/usr/bin/env sh
set -eu

DOMAIN="${CERTBOT_DOMAIN:-whatsappdesk.techfindconsulting.africa}"
EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL}"

docker compose --profile certbot run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo ""
echo "Certificate issued. Next:"
echo "  cp deploy/nginx/conf.d/whatsappdesk.ssl.conf.example deploy/nginx/conf.d/whatsappdesk.ssl.conf"
echo "  Edit deploy/nginx/conf.d/whatsappdesk.conf — HTTP location / should redirect to HTTPS"
echo "  docker compose restart nginx"
