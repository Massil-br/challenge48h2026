#!/bin/bash
# Script to obtain the initial SSL certificate for parckshare-grp5.duckdns.org
set -e

DOMAIN="parckshare-grp5.duckdns.org"
EMAIL="${SSL_EMAIL:-admin@example.com}"

echo "==> Creating certbot volumes..."
docker volume create infra_certbot-webroot >/dev/null 2>&1 || true
docker volume create infra_certbot-certs >/dev/null 2>&1 || true

echo "==> Starting temporary nginx for ACME challenge..."
docker run -d --rm --name nginx-ssl-init \
  -p 80:80 \
  -v infra_certbot-webroot:/var/www/certbot \
  nginx:alpine \
  sh -c 'mkdir -p /var/www/certbot && echo "server { listen 80; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 ok; } }" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

echo "==> Waiting for nginx to start..."
sleep 3

echo "==> Requesting certificate for $DOMAIN..."
docker run --rm \
  -v infra_certbot-webroot:/var/www/certbot \
  -v infra_certbot-certs:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

echo "==> Stopping temporary nginx..."
docker stop nginx-ssl-init 2>/dev/null || true

echo "==> SSL certificate obtained! You can now run: docker compose up -d"
