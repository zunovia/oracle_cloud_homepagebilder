#!/bin/bash
# =============================================================================
# Oracle Cloud インスタンス初期セットアップスクリプト
# ARM (Ampere A1) インスタンス用
# =============================================================================

set -euo pipefail

echo "=== Oracle Cloud サーバー初期セットアップ ==="

# --- システム更新 ---
echo "[1/6] システムを更新中..."
sudo apt-get update && sudo apt-get upgrade -y

# --- Docker インストール ---
echo "[2/6] Docker をインストール中..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "Docker インストール完了。再ログインが必要な場合があります。"
else
    echo "Docker は既にインストールされています: $(docker --version)"
fi

# --- Docker Compose インストール ---
echo "[3/6] Docker Compose を確認中..."
if ! docker compose version &>/dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# --- ファイアウォール設定 ---
echo "[4/6] ファイアウォールを設定中..."

# iptables: HTTP/HTTPS を許可
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null

echo "ポート 80, 443 を開放しました。"
echo ""
echo "重要: Oracle Cloud コンソールでも以下を設定してください:"
echo "  1. VCN → Security Lists → Ingress Rules"
echo "  2. ポート 80 (HTTP) と 443 (HTTPS) を許可"

# --- プロジェクトディレクトリ ---
echo "[5/6] プロジェクトディレクトリを作成中..."
PROJECT_DIR="$HOME/webstudio-site"
mkdir -p "$PROJECT_DIR"

# --- Swap 設定（メモリ不足対策）---
echo "[6/6] Swap を設定中..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "2GB Swap を作成しました。"
else
    echo "Swap は既に設定されています。"
fi

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "  1. ローカルで Webstudio プロジェクトをエクスポート"
echo "  2. git push でリポジトリを更新"
echo "  3. サーバーで git clone/pull してデプロイ"
echo ""
echo "デプロイコマンド:"
echo "  cd $PROJECT_DIR && make deploy"
