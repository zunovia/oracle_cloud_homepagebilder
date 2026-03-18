.PHONY: help dev build deploy export ssl backup logs clean setup-server

# デフォルトの .env 読み込み
-include .env
export

SERVER ?= $(SERVER_IP)
SSH_USER ?= ubuntu
SSH_KEY ?= ~/.ssh/oracle_cloud_key

help: ## コマンド一覧を表示
	@echo "=== Webstudio on Oracle Cloud ==="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# --- 開発 ---

dev: ## ローカル開発サーバー起動 (Docker)
	docker compose -f docker-compose.dev.yml up --build

dev-down: ## 開発サーバー停止
	docker compose -f docker-compose.dev.yml down

# --- エクスポート ---

export: ## Webstudio Cloud からエクスポート
	./scripts/export-webstudio.sh

# --- ビルド ---

build: ## Docker イメージをビルド
	docker compose build

# --- デプロイ ---

deploy: ## Oracle Cloud にデプロイ
	./scripts/deploy.sh remote

deploy-local: ## ローカルにデプロイ（本番構成）
	./scripts/deploy.sh local

# --- SSL ---

ssl: ## SSL 証明書を取得/更新
	./scripts/ssl-setup.sh

# --- サーバー管理 ---

setup-server: ## Oracle Cloud サーバー初期セットアップ
	@if [ -z "$(SERVER)" ]; then \
		echo "使い方: make setup-server SERVER=<ip-address>"; \
		exit 1; \
	fi
	scp -i $(SSH_KEY) scripts/setup-oracle.sh $(SSH_USER)@$(SERVER):/tmp/
	ssh -i $(SSH_KEY) $(SSH_USER)@$(SERVER) "chmod +x /tmp/setup-oracle.sh && /tmp/setup-oracle.sh"

# --- 運用 ---

logs: ## コンテナログを表示
	docker compose logs -f

status: ## コンテナ状態を確認
	docker compose ps

restart: ## コンテナを再起動
	docker compose restart

backup: ## バックアップを作成
	./scripts/backup.sh

# --- クリーンアップ ---

clean: ## Docker リソースをクリーンアップ
	docker compose down --rmi local --volumes --remove-orphans
	@echo "クリーンアップ完了"

stop: ## 全コンテナを停止
	docker compose down
