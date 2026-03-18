---
name: export
description: Export the Webstudio project and build it as a Remix app. Use when the user wants to export, sync, or build the site from Webstudio Cloud.
disable-model-invocation: true
allowed-tools: Bash(make *), Bash(webstudio *), Bash(npm *), Bash(node *)
---

# Webstudio エクスポート

Webstudio Cloud からプロジェクトをエクスポートし、Remix アプリとしてビルドします。

## 手順

1. まず webstudio-project ディレクトリに移動
2. `webstudio link` でクラウドプロジェクトと接続（未接続の場合）
3. `webstudio sync` でデザインを同期
4. `webstudio build` で Remix アプリとしてビルド
5. `npm install` で依存関係をインストール

または、プロジェクトルートで `make export` を実行すると上記すべてが自動で実行されます。

```bash
cd /home/user/oracle_cloud_dify && make export
```

## 確認事項

- Node.js v22+ が必要
- Webstudio CLI がインストール済みであること
- ビルド後、`webstudio-project/build/` にファイルが生成されていることを確認
