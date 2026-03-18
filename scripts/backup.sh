#!/bin/bash
# =============================================================================
# バックアップスクリプト
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

echo "=== バックアップ作成 ==="

# Webstudio プロジェクトファイル
BACKUP_FILE="$BACKUP_DIR/webstudio-backup-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_FILE" \
    -C "$PROJECT_ROOT" \
    --exclude='node_modules' \
    --exclude='.git' \
    webstudio-project/ \
    nginx/ \
    .env 2>/dev/null || true

echo "バックアップ作成: $BACKUP_FILE"
echo "サイズ: $(du -h "$BACKUP_FILE" | cut -f1)"

# 古いバックアップを削除（30日以上）
find "$BACKUP_DIR" -name "webstudio-backup-*.tar.gz" -mtime +30 -delete 2>/dev/null || true

echo ""
echo "=== バックアップ完了 ==="
