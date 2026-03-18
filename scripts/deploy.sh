#!/bin/bash
# =============================================================================
# デプロイスクリプト
# ローカルまたはリモートサーバーでの Docker デプロイを実行
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

DOMAIN="${DOMAIN:-localhost}"
SERVER_IP="${SERVER_IP:-}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_rsa}"

usage() {
    echo "使い方: $0 [local|remote]"
    echo ""
    echo "  local   - ローカルマシンにデプロイ"
    echo "  remote  - Oracle Cloud サーバーにデプロイ"
    echo ""
    echo "環境変数 (.env):"
    echo "  DOMAIN       - ドメイン名"
    echo "  SERVER_IP    - サーバー IP"
    echo "  SSH_USER     - SSH ユーザー名"
    echo "  SSH_KEY_PATH - SSH 鍵パス"
}

deploy_local() {
    echo "=== ローカルデプロイ ==="
    cd "$PROJECT_ROOT"

    # ビルド出力チェック
    if [ ! -f "webstudio-project/build/package.json" ]; then
        echo "エラー: ビルド出力がありません。先に 'make export' を実行してください。"
        exit 1
    fi

    echo "Docker イメージをビルド中..."
    docker compose build

    echo "コンテナを起動中..."
    docker compose up -d

    echo ""
    echo "=== デプロイ完了 ==="
    echo "サイト: http://localhost (HTTP) / https://localhost (HTTPS)"
    echo "ログ確認: docker compose logs -f"
}

deploy_remote() {
    echo "=== リモートデプロイ (Oracle Cloud) ==="

    if [ -z "$SERVER_IP" ]; then
        echo "エラー: SERVER_IP が設定されていません。.env を確認してください。"
        exit 1
    fi

    SSH_CMD="ssh -i $SSH_KEY_PATH $SSH_USER@$SERVER_IP"
    REMOTE_DIR="/home/$SSH_USER/webstudio-site"

    echo "サーバー: $SSH_USER@$SERVER_IP"
    echo "ドメイン: $DOMAIN"
    echo ""

    # プロジェクトファイルを転送
    echo "ファイルを転送中..."
    rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.env' \
        -e "ssh -i $SSH_KEY_PATH" \
        "$PROJECT_ROOT/" "$SSH_USER@$SERVER_IP:$REMOTE_DIR/"

    # .env をリモートに転送（存在する場合）
    if [ -f "$PROJECT_ROOT/.env" ]; then
        scp -i "$SSH_KEY_PATH" "$PROJECT_ROOT/.env" "$SSH_USER@$SERVER_IP:$REMOTE_DIR/.env"
    fi

    # リモートでデプロイ実行
    echo "リモートでデプロイを実行中..."
    $SSH_CMD << EOF
        cd $REMOTE_DIR
        docker compose build
        docker compose up -d
        echo ""
        echo "コンテナ状態:"
        docker compose ps
EOF

    echo ""
    echo "=== リモートデプロイ完了 ==="
    echo "サイト: https://$DOMAIN"
}

# メイン
case "${1:-local}" in
    local)
        deploy_local
        ;;
    remote)
        deploy_remote
        ;;
    -h|--help)
        usage
        ;;
    *)
        echo "不明なオプション: $1"
        usage
        exit 1
        ;;
esac
