---
name: deploy
description: Deploy the website to Oracle Cloud. Use when the user wants to deploy, publish, or update the live site.
user-invocable: true
allowed-tools: Bash(make *), Bash(docker *), Bash(ssh *), Bash(git *)
---

# Oracle Cloud デプロイ

サイトを Oracle Cloud にデプロイします。

## 自動デプロイ（推奨）

デフォルトブランチ `claude/recreate-personal-website-OuXDy` にpushすると、GitHub Actionsが自動デプロイします。

対象パス: `webstudio-project/**`, `Dockerfile`, `docker-compose.yml`, `nginx/**`

## 手動デプロイ

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

## 注意事項
- `docker compose down` + `up` だけでは古いコンテナが残る場合あり。`docker stop` + `docker rm` で確実に削除すること
- Dify側Nginxの再起動が必要な場合: `cd ~/dify/docker && docker compose restart nginx`
- サーバー上のリモートURL: `https://github.com/zunovia/oracle_cloud_homepagebilder.git`
