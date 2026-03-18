#!/bin/bash
# =============================================================================
# Webstudio エクスポートスクリプト
# Webstudio Cloud からプロジェクトをエクスポートし、ビルドを準備する
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WS_DIR="$PROJECT_ROOT/webstudio-project"
BUILD_DIR="$WS_DIR/build"

echo "=== Webstudio エクスポート ==="

# Node.js バージョンチェック
NODE_VERSION=$(node --version 2>/dev/null | cut -d'.' -f1 | sed 's/v//')
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 22 ]; then
    echo "エラー: Node.js v22+ が必要です (現在: $(node --version 2>/dev/null || echo '未インストール'))"
    echo "インストール: nvm install 22"
    exit 1
fi

# Webstudio CLI チェック
if ! command -v webstudio &>/dev/null; then
    echo "Webstudio CLI をインストールしています..."
    npm install -g webstudio
fi

echo "Webstudio CLI バージョン: $(webstudio --version)"

# プロジェクトディレクトリに移動
cd "$WS_DIR"

# 初回セットアップ確認
if [ ! -f ".webstudio/conf.json" ]; then
    echo ""
    echo "初回セットアップが必要です。"
    echo "1. Webstudio Cloud (https://webstudio.is) でサイトを作成"
    echo "2. 「Share」→「Build access」リンクを生成"
    echo ""
    echo "Webstudio CLI を起動します..."
    webstudio
    echo ""
    echo "プロジェクトをリンクしてください..."
    webstudio link
fi

# クラウドから同期
echo ""
echo "クラウドから同期中..."
webstudio sync

# ビルド（Remix アプリとして）
echo ""
echo "ビルド中..."
webstudio build

# 依存関係インストール
if [ -d "$BUILD_DIR" ]; then
    echo ""
    echo "依存関係をインストール中..."
    cd "$BUILD_DIR"
    npm install

    echo ""
    echo "=== エクスポート完了 ==="
    echo "ビルド出力: $BUILD_DIR"
    echo ""
    echo "ローカルで確認:"
    echo "  cd $BUILD_DIR && npm run dev"
    echo ""
    echo "Docker ビルド:"
    echo "  cd $PROJECT_ROOT && make build"
else
    echo "エラー: ビルド出力が見つかりません: $BUILD_DIR"
    exit 1
fi
