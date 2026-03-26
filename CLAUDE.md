# oracle_cloud_dify - サーコミュニケーション ウェブサイト

## プロジェクト概要
一般社団法人サーコミュニケーションのコーポレートサイト。
Oracle Cloud上のDockerで稼働し、Dify（AIチャットボット）と同じサーバーで共存。

## インフラ構成

### サーバー
- **Oracle Cloud**: IP `64.110.100.87`、SSH ユーザー `ubuntu`
- **SSH鍵**: ローカルPC `C:\trading\Oracle_Cloud_2026-3-7\秘密Key_Oracle_Cloud\ssh-key-2026-03-07.key`
- **サーバー上のパス**: `~/webstudio-site`（サイト）、`~/dify/docker`（Dify）

### ネットワーク・ポート構成
- **ポート 80/443**: Dify側Nginx（`docker-nginx-1`）が管理
- **ポート 8080**: Dify側Nginxからwebstudioへプロキシ → `webstudio-app:3000`
  - 設定ファイル: `/home/ubuntu/dify/docker/nginx/conf.d/webstudio.conf`
- **Dify本体**: 80番ポートでアクセス
- **webstudio-app**: Difyの`docker_default`ネットワークに接続（external network）

### Docker構成
- `webstudio-app`: Node.js Remixアプリ（ポート3000、exposeのみ）
- Dify側Nginx経由で8080ポートに公開
- docker-compose.ymlのnetworksで`docker_default`（Difyネットワーク）に接続

## デプロイ方法

### 手動デプロイ（確実な方法）
Git Bashから：
```bash
ssh -i "/c/trading/Oracle_Cloud_2026-3-7/秘密Key_Oracle_Cloud/ssh-key-2026-03-07.key" ubuntu@64.110.100.87
```
サーバー上で：
```bash
cd ~/webstudio-site
git pull origin claude/recreate-personal-website-OuXDy
docker stop webstudio-app && docker rm webstudio-app
docker compose build --no-cache && docker compose up -d
```
**注意**: `docker compose down` + `up`だけでは古いコンテナが残る場合がある。`docker stop` + `docker rm`で確実に削除してから再ビルドすること。

### 自動デプロイ（GitHub Actions）
- `.github/workflows/deploy.yml` でデフォルトブランチへのpush時に自動デプロイ
- GitHub Secretsに `SERVER_IP`、`SSH_USER`、`SSH_PRIVATE_KEY` を設定済み
- トリガーブランチ: `claude/recreate-personal-website-OuXDy`
- 対象パス: `webstudio-project/**`、`Dockerfile`、`docker-compose.yml`、`nginx/**`

### デプロイ後の確認
- ブラウザで `http://64.110.100.87:8080` を確認（Ctrl+Shift+Rで強制リロード）
- コンテナ内のファイル確認: `docker exec webstudio-app cat /app/public/index.html | grep "確認したいテキスト"`

## Git情報
- **GitHub**: `https://github.com/zunovia/oracle_cloud_homepagebilder.git`
- **デフォルトブランチ**: `claude/recreate-personal-website-OuXDy`
- サーバー上のリモートURL: `https://github.com/zunovia/oracle_cloud_homepagebilder.git`

## サイト構成
- **HTML**: `webstudio-project/build/public/index.html`
- **CSS**: `webstudio-project/build/public/css/style.css`
- **JS**: `webstudio-project/build/public/js/main.js`
- **サーバー**: `webstudio-project/build/server.js`（Node.js/Express、メール送信機能付き）

## SMTP設定（メール送信）
- `.env`ファイルで設定（SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM）
- サーバー上の`.env`にも同じ設定が必要

## Vercel
- チームID: `team_J2jOd1i0TvYQ9SYZPmvk9LCN`
- このプロジェクトはVercelにはデプロイしていない（Oracle Cloud専用）
- Vercelには別プロジェクト（dashboard, cv001, consultation-sales-materials-001）が存在

## トラブルシューティング

### コンテナ更新が反映されない
1. `docker exec webstudio-app cat /app/public/index.html | grep "テキスト"` でコンテナ内を確認
2. 古い場合: `docker stop webstudio-app && docker rm webstudio-app`で完全削除
3. `docker compose build --no-cache && docker compose up -d` で再ビルド
4. Dify側Nginxの再起動も必要な場合: `cd ~/dify/docker && docker compose restart nginx`

### SSH接続できない（Permission denied）
- 秘密鍵のパスを `-i` オプションで指定すること
- 鍵ファイル: `/c/trading/Oracle_Cloud_2026-3-7/秘密Key_Oracle_Cloud/ssh-key-2026-03-07.key`

### ドメイン
- `surc.net` は現在未取得（空いていなかった）
- IPアドレス直接アクセス: `http://64.110.100.87:8080`
