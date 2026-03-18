# Webstudio on Oracle Cloud - セルフホスト パーソナルウェブサイト

Webstudio（オープンソース ビジュアルウェブビルダー）で作成したサイトを、Oracle Cloud Free Tier にセルフホストするプロジェクトです。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│           Oracle Cloud (Always Free Tier)            │
│           ARM / 4 OCPU / 24GB RAM                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              Docker Compose                    │  │
│  │                                               │  │
│  │  ┌─────────┐    ┌──────────────────────────┐  │  │
│  │  │  Nginx  │───▶│  Webstudio App (Remix)   │  │  │
│  │  │ :80/443 │    │        :3000             │  │  │
│  │  └─────────┘    └──────────────────────────┘  │  │
│  │       │                                       │  │
│  │       ▼                                       │  │
│  │  Let's Encrypt (SSL自動更新)                   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

ローカル開発環境:
┌──────────────────────┐     ┌───────────────────────┐
│ Webstudio Cloud      │────▶│  CLI Export (Docker)   │
│ (ビジュアルエディタ)   │     │  webstudio build      │
└──────────────────────┘     └───────────┬───────────┘
                                         │
                                         ▼
                              git push → Oracle Cloud
```

## クイックスタート

### 前提条件

- Node.js v22+
- Docker & Docker Compose
- Oracle Cloud アカウント（Free Tier で OK）

### 1. Webstudio でサイトをデザイン

1. [Webstudio Cloud](https://webstudio.is) で無料アカウント作成
2. ビジュアルエディタでサイトをデザイン
3. 「Share」から Build access のリンクを生成

### 2. CLI でプロジェクトをエクスポート

```bash
# Webstudio CLI インストール
npm install -g webstudio

# プロジェクト初期化 & リンク
cd webstudio-project
webstudio
webstudio link    # Share リンクを入力
webstudio sync    # クラウドから同期

# ビルド（Remix アプリとして）
webstudio build
cd build
npm install
```

### 3. ローカルで動作確認

```bash
make dev
# → http://localhost:3000
```

### 4. Oracle Cloud にデプロイ

```bash
# 初回セットアップ
make setup-server SERVER=<your-server-ip>

# デプロイ
make deploy SERVER=<your-server-ip>
```

## プロジェクト構造

```
.
├── README.md
├── Makefile                    # 共通操作コマンド
├── docker-compose.yml          # 本番環境構成
├── docker-compose.dev.yml      # 開発環境構成
├── Dockerfile                  # Webstudio アプリ用
├── nginx/
│   ├── nginx.conf              # Nginx 設定
│   └── ssl-renew.sh            # SSL 証明書自動更新
├── scripts/
│   ├── setup-oracle.sh         # Oracle Cloud 初期セットアップ
│   ├── deploy.sh               # デプロイスクリプト
│   ├── export-webstudio.sh     # Webstudio エクスポート
│   └── backup.sh               # バックアップスクリプト
├── webstudio-project/          # Webstudio エクスポート先
│   └── .gitkeep
└── .github/
    └── workflows/
        └── deploy.yml          # 自動デプロイ (GitHub Actions)
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make dev` | ローカル開発サーバー起動 |
| `make build` | Docker イメージビルド |
| `make deploy` | Oracle Cloud にデプロイ |
| `make export` | Webstudio からエクスポート |
| `make ssl` | SSL 証明書取得/更新 |
| `make backup` | サイトデータバックアップ |
| `make logs` | ログ確認 |

## Oracle Cloud Free Tier スペック

| リソース | 仕様 |
|---------|------|
| CPU | 4 OCPU (ARM Ampere A1) |
| メモリ | 24 GB |
| ストレージ | 200 GB |
| 帯域 | 10 TB/月 |
| 費用 | **無料** |

Webstudio アプリの要件（1 CPU / 1 GB RAM）を大幅に超えるスペックなので、余裕を持って運用できます。

## カスタムドメイン設定

1. Oracle Cloud でパブリック IP を取得（Free Tier に含まれる）
2. DNS で A レコードを設定: `yourdomain.com → <Oracle Cloud IP>`
3. `.env` に `DOMAIN=yourdomain.com` を設定
4. `make ssl` で Let's Encrypt 証明書を自動取得

## ライセンス

MIT
