---
name: deploy
description: Deploy the website to Oracle Cloud or run locally with Docker. Use when the user wants to deploy, publish, or launch the site.
disable-model-invocation: true
allowed-tools: Bash(make *), Bash(docker *), Bash(ssh *)
---

# サイトデプロイ

サイトを Oracle Cloud またはローカル環境にデプロイします。

## ローカルデプロイ（開発確認用）

```bash
cd /home/user/oracle_cloud_dify && make dev
```
ポート 3000 でアクセス可能になります。

## ローカル本番環境（Docker Compose）

```bash
cd /home/user/oracle_cloud_dify && make deploy-local
```
Nginx + Webstudio の本番構成で起動します。

## Oracle Cloud へデプロイ

```bash
cd /home/user/oracle_cloud_dify && make deploy
```

### 前提条件
- `.env` ファイルに SERVER_IP, SSH_USER, SSH_KEY_PATH が設定済み
- Oracle Cloud インスタンスが `make setup-server` で初期化済み
- SSL が必要な場合は `make ssl` を先に実行

### デプロイ後の確認
- `make status` でコンテナの状態を確認
- `make logs` でログを確認
