# Webstudio サイト設計ガイド - Ryota Kaneda パーソナルサイト

## サイト構成（WIX版の推定構成 + 改良案）

### ページ構成

| ページ | 内容 |
|--------|------|
| **Home** | ヒーローセクション + 簡単な自己紹介 + ハイライト |
| **About** | 詳細プロフィール + 経歴タイムライン |
| **Career / Stats** | テニスの成績・実績 |
| **Gallery** | 試合写真・アクション写真 |
| **Contact** | 問い合わせフォーム + SNS リンク |

---

## セクション別デザインガイド

### 1. Home（トップページ）

#### Hero セクション
- **背景**: テニスのアクションショット（フルスクリーン or 70vh）
- **オーバーレイ**: 暗めのグラデーション（テキスト読みやすさ確保）
- **テキスト**:
  - 名前: "RYOTA KANEDA" （大きく、太字）
  - サブタイトル: "Collegiate Tennis Player | St. John's University"
  - CTA ボタン: "About Me" / "Contact"
- **デザイン参考**: 大きな写真背景 + シンプルなタイポグラフィ

#### ハイライトセクション
- 3カラムのカード形式
  - カード1: "All-BIG EAST Second Team (2024-25)"
  - カード2: "18-2 Singles Record"
  - カード3: "BIG EAST Doubles Team of the Week"

#### 簡単な自己紹介
- 2カラムレイアウト（写真 + テキスト）
- 短い自己紹介文
- "Read More" ボタン → About ページへ

---

### 2. About ページ

#### プロフィールセクション
- 写真（ポートレート）
- 基本情報:
  - 名前: 金田 諒大 / Ryota Kaneda
  - 出身: 日本
  - 大学: St. John's University (New York)
  - 専攻: [入力してください]
  - ポジション: Men's Tennis

#### 経歴タイムライン（縦型）
```
2020  日本ジュニアサーキット（三木市大会 準決勝）
2021  ITF ジュニアランキング 437位
2021  St. John's University 入学
2022  シングルス 7-1、BIG EAST トーナメント 3-0
2024  BIG EAST ダブルス チーム・オブ・ザ・ウィーク
2025  All-BIG EAST Second Team 選出
      シングルス 18-2、ダブルス全勝
```

---

### 3. Career / Stats ページ

#### シーズン別成績テーブル
| シーズン | シングルス | ダブルス | ハイライト |
|---------|-----------|---------|-----------|
| 2021-22 | 7-1 | - | BIG EAST 3-0, シーズン6連勝 |
| 2023-24 | - | 10-6 | シーズン通算25勝 |
| 2024-25 | 18-2 | 全勝 | All-BIG EAST Second Team |

#### 主な実績（アイコン付きリスト）
- 🏆 All-BIG EAST Second Team (2024-25)
- 🏆 BIG EAST Doubles Team of the Week (2024)
- 🎾 BIG EAST Championship タイトルマッチ勝利

---

### 4. Gallery ページ

- マソンリーグリッド or 3カラムグリッド
- ライトボックス（クリックで拡大表示）
- カテゴリフィルター: 試合 / トレーニング / オフコート

---

### 5. Contact ページ

- お問い合わせフォーム（名前、メール、件名、メッセージ）
- SNS リンク（アイコン）
- メールアドレス

---

## デザインシステム

### カラーパレット（提案）
```
Primary:    #C41E3A  (St. John's Red / 赤)
Secondary:  #1A1A2E  (ダークネイビー)
Accent:     #E8E8E8  (ライトグレー)
Background: #FFFFFF  (白)
Text:       #333333  (ダークグレー)
```

### タイポグラフィ
```
見出し: Montserrat or Oswald (太字、大文字)
本文:   Inter or Noto Sans JP (日英対応)
```

### レスポンシブ ブレークポイント
```
Desktop:  1200px+
Tablet:   768px - 1199px
Mobile:   ~767px
```

---

## Webstudio での作り方

### Step 1: アカウント作成
1. https://webstudio.is にアクセス
2. 無料アカウント作成（GitHub ログイン可）
3. 新規プロジェクト作成

### Step 2: ページ構築の基本操作
1. 左パネル: コンポーネント（Box, Text, Image, Link, Form...）
2. 右パネル: スタイル設定（CSS プロパティすべて）
3. 上部: ブレークポイント切替（レスポンシブ確認）

### Step 3: 推奨ワークフロー
1. まず Desktop でレイアウトを組む
2. 各ブレークポイントでスタイル調整
3. ページ間のナビゲーション設定
4. プレビューで確認
5. Publish してCLIでエクスポート

### Step 4: エクスポート & デプロイ
```bash
# このプロジェクトのルートで
make export    # Webstudio CLIでエクスポート
make dev       # ローカル確認
make deploy    # Oracle Cloud にデプロイ
```

---

## 参考になるWebstudioテンプレート/チュートリアル
- Webstudio 公式ドキュメント: https://docs.webstudio.is
- Webstudio YouTube チャンネル: チュートリアル動画多数
- コミュニティ: Discord で質問可能
