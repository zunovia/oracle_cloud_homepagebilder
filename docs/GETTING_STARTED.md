# Webstudio クイックスタートガイド

## Step 1: Webstudio Cloud にサインアップ

1. **https://webstudio.is** にアクセス
2. 「Get Started」→ GitHub アカウントでログイン
3. 新規プロジェクト作成 → 名前を入力（例: "Ryota Kaneda Portfolio"）

## Step 2: ページを作成

### Navigator（左パネル）
- **Pages**: ページの追加・管理
  - Home (`/`)
  - About (`/about`)
  - Career (`/career`)
  - Contact (`/contact`)

### Components（左パネル下部）
ドラッグ&ドロップで使えるコンポーネント:
- **Box**: レイアウトコンテナ（div）
- **Text**: テキスト要素
- **Heading**: 見出し（h1〜h6）
- **Image**: 画像
- **Link**: リンク
- **Button**: ボタン
- **Form**: フォーム
- **Input / Textarea**: 入力フィールド

### Style Panel（右パネル）
CSSのすべてのプロパティをGUIで設定:
- **Layout**: display, flex, grid
- **Spacing**: margin, padding
- **Size**: width, height
- **Typography**: font, color, weight
- **Background**: color, image, gradient
- **Border**: radius, width, color
- **Effects**: box-shadow, opacity

## Step 3: リファレンステンプレートを参考にデザイン

`docs/reference-template.html` をブラウザで開くと、完成イメージを確認できます。

### Webstudio での再現手順

#### Hero セクション
1. Box を追加 → height: 100vh, display: flex, flex-direction: column, justify-content: center, align-items: center
2. Background: image URL を設定 + gradient overlay
3. Heading (h1) を追加 → "RYOTA KANEDA", font-size: 4rem, color: white, letter-spacing: 8px
4. Text を追加 → サブタイトル
5. Link を追加 → CTA ボタンスタイル

#### Navigation
1. Box を追加 → position: fixed, top: 0, width: 100%, z-index: 1000
2. display: flex, justify-content: space-between
3. Text でロゴ、Link でナビメニュー

#### ハイライトカード
1. Box (親) → display: grid, grid-template-columns: 1fr 1fr 1fr
2. Box (子) x3 → それぞれ背景色を設定
3. 各カードに Text (数字) + Text (ラベル)

#### レスポンシブ対応
1. 上部のブレークポイントバーで「Tablet」「Mobile」を選択
2. 各ブレークポイントでスタイルを調整
   - Grid → 1カラムに変更
   - フォントサイズ縮小
   - パディング調整

## Step 4: エクスポート

### Share リンクの生成
1. Webstudio のプロジェクト画面で「Share」ボタン
2. 「Build access」を有効化
3. 生成されたリンクをコピー

### CLI でエクスポート
```bash
# プロジェクトルートで実行
make export

# 手動で行う場合:
cd webstudio-project
webstudio           # 初回: セットアップウィザード
webstudio link      # Share リンクを貼り付け
webstudio sync      # クラウドから同期
webstudio build     # Remix アプリとしてビルド
cd build && npm install
```

## Step 5: ローカルプレビュー

```bash
# Docker で起動
make dev
# → http://localhost:3000 で確認

# または直接
cd webstudio-project/build
npm run dev
```

## Step 6: デプロイ

```bash
# Oracle Cloud へ
make deploy
```

詳細は [README.md](../README.md) を参照してください。

---

## Tips

### 写真について
- Hero 背景: 1920x1080px 以上のアクションショットが最適
- プロフィール写真: 800x1000px 程度のポートレート
- Webstudio に直接アップロード可能（Assets パネル）

### 日本語フォント
- Webstudio で Google Fonts から「Noto Sans JP」を追加
- 見出し用に「Montserrat」なども効果的

### パフォーマンス
- 画像は WebP 形式推奨
- Webstudio が自動で画像最適化してくれる（Remix版の場合）
