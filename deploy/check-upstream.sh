#!/bin/sh
set -eu

PORT="${UI_PORT:-3002}"
URL="http://127.0.0.1:${PORT}/"

echo "=== Docker UI ==="
docker compose ps 2>/dev/null || echo "(run from whatsapp-ui repo root)"

echo ""
echo "=== Listening on ${PORT} ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ":${PORT} " || echo "Nothing listening on port ${PORT}"
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "Nothing listening on port ${PORT}"
else
  echo "Install ss or netstat to inspect ports"
fi

echo ""
echo "=== curl ${URL} ==="
if curl -fsS -o /dev/null -w "HTTP %{http_code}\n" "$URL"; then
  echo "OK — host nginx should proxy to 127.0.0.1:${PORT}"
else
  echo "FAILED — fix Docker UI before nginx; 502 usually means this step fails."
  echo "Try: docker compose up --build -d && docker compose logs ui --tail 50"
fi

echo ""
echo "=== nginx errors (whatsappdesk) ==="
if [ -r /var/log/nginx/error.log ]; then
  grep -i whatsappdesk /var/log/nginx/error.log 2>/dev/null | tail -5 \
    || tail -5 /var/log/nginx/error.log
else
  echo "Cannot read /var/log/nginx/error.log (run with sudo or as root)"
fi
