#!/bin/bash
# =============================================================================
# SSL 証明書セットアップスクリプト (Let's Encrypt)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# .env 読み込み
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

if [ -z "$DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
    echo "エラー: .env に DOMAIN と CERTBOT_EMAIL を設定してください。"
    echo ""
    echo "例:"
    echo "  DOMAIN=yourdomain.com"
    echo "  CERTBOT_EMAIL=your-email@example.com"
    exit 1
fi

echo "=== SSL 証明書セットアップ ==="
echo "ドメイン: $DOMAIN"
echo "メール: $CERTBOT_EMAIL"
echo ""

cd "$PROJECT_ROOT"

# Step 1: HTTP-only の Nginx 設定に切り替え
echo "[1/4] HTTP-only モードに切り替え中..."
cp nginx/conf.d/default-nossl.conf.template nginx/conf.d/default.conf

# Step 2: Nginx を起動（HTTP のみ）
echo "[2/4] Nginx を起動中..."
docker compose up -d nginx webstudio

echo "Nginx が起動するまで待機中..."
sleep 5

# Step 3: SSL 証明書を取得
echo "[3/4] SSL 証明書を取得中..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Step 4: HTTPS 対応の Nginx 設定に切り替え
echo "[4/4] HTTPS モードに切り替え中..."

# ドメインを反映した HTTPS 設定を生成
cat > nginx/conf.d/default.conf << NGINXEOF
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://webstudio:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://webstudio:3000;
        proxy_set_header Host \$host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Nginx 再起動
docker compose restart nginx

echo ""
echo "=== SSL セットアップ完了 ==="
echo "サイト: https://$DOMAIN"
echo ""
echo "証明書は certbot コンテナが 12 時間ごとに自動更新します。"
