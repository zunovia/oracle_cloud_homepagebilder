---
name: deploy
description: Deploy the website to Oracle Cloud and/or Vercel. Use when the user wants to deploy, publish, or update the live site.
user-invocable: true
allowed-tools: Bash(make *), Bash(docker *), Bash(ssh *), Bash(git *), mcp__Vercel__*
---

# サイトデプロイ

サイトを Oracle Cloud および Vercel にデプロイします。

## 自動デプロイ（推奨）

デフォルトブランチ `claude/recreate-personal-website-OuXDy` にpushすると：
- **Oracle Cloud**: GitHub Actions が自動デプロイ
- **Vercel**: Vercel Git連携が自動デプロイ

## Oracle Cloud 手動デプロイ

### 1. SSH接続（Git Bashから）
```bash
ssh -i "/c/trading/Oracle_Cloud_2026-3-7/秘密Key_Oracle_Cloud/ssh-key-2026-03-07.key" ubuntu@64.110.100.87
```

### 2. サーバー上でデプロイ実行
```bash
cd ~/webstudio-site
git pull origin claude/recreate-personal-website-OuXDy
docker stop webstudio-app && docker rm webstudio-app
docker compose build --no-cache && docker compose up -d
```

### 3. 確認
```bash
docker exec webstudio-app cat /app/public/index.html | grep "確認したいテキスト"
```
ブラウザで `http://64.110.100.87:8080` を確認（Ctrl+Shift+Rで強制リロード）

## Vercel デプロイ

### 初回セットアップ
1. https://vercel.com/new でGitHubリポジトリ `zunovia/oracle_cloud_homepagebilder` をインポート
2. Framework Preset: `Other`
3. Environment Variables にSMTP設定を追加（SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM）
4. Deploy

### 構成
- 設定ファイル: `vercel.json`
- 静的ファイル: `webstudio-project/build/public/`
- APIルート: `api/contact.js`（メール送信）

### 以降の更新
デフォルトブランチへのpushで自動デプロイ。

## 注意事項
- Oracle Cloud: `docker compose down` + `up` だけでは古いコンテナが残る場合あり。`docker stop` + `docker rm` で確実に削除すること
- Dify側Nginxの再起動が必要な場合: `cd ~/dify/docker && docker compose restart nginx`
- サーバー上のリモートURL: `https://github.com/zunovia/oracle_cloud_homepagebilder.git`
