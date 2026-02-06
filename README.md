# Env Booker (MVP)

開発チーム内での「テスト環境の占有・競合」問題を解決するために設計された、MVP（実用最小限の製品）フルスタックアプリケーションです。開発者はリアルタイムで環境のステータス確認、予約、および解放を行うことができます。

## 🚀 技術スタック (Tech Stack)

### フロントエンド (Frontend)
* **フレームワーク**: [Next.js 16](https://nextjs.org/) (App Router)
* **UI コンポーネント**: [Ant Design (v6)](https://ant.design/)
* **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
* **E2E テスト**: [Playwright](https://playwright.dev/)

### バックエンド (Backend)
* **言語**: Golang (1.25+)
* **Web フレームワーク**: [Gin Web Framework](https://github.com/gin-gonic/gin)
* **データベース**: SQLite
* **ORM**: [GORM](https://gorm.io/)

### ツール (Tools)
* **API テスト**: [Bruno](https://www.usebruno.com/)

---

## 📂 プロジェクト構成 (Project Structure)

```text
.
├── client/                 # Next.js フロントエンドアプリケーション
│   ├── e2e/                # Playwright E2E テスト
│   ├── src/                # ソースコード (App Router, Types)
│   └── next.config.ts      # 設定ファイル (API リライト設定済み)
├── server/                 # Golang バックエンドアプリケーション
│   ├── main.go             # エントリーポイント & ロジック
│   ├── main_test.go        # 単体テスト
│   └── test_env_booker.db  # SQLite データベース (起動時に自動生成)
├── brunoRequestCollection/ # 手動テスト用の Bruno API コレクション
└── run.sh                  # 実行用ヘルパースクリプト

```

## 🛠️ 始め方 (Getting Started)

### 事前準備 (Prerequisites)

* **Go**: v1.25+
* **Node.js**: v18+ (v20+ 推奨)
* **npm** または **yarn**

### 1. バックエンドサーバーの起動

バックエンドはポート `:8080` で動作します。初回起動時に SQLite データベースを自動的に初期化し、ダミーデータ（`QA-Cluster-1` など）を投入します。

```bash
cd server
go mod tidy
go run main.go

```

### 2. フロントエンドクライアントの起動

フロントエンドはポート `:3000` で動作します。開発中の CORS 問題を回避するため、`next.config.ts` のリライト設定を通じてバックエンドへのリクエストをプロキシ（転送）します。

```bash
cd client
npm install
npm run dev

```

ブラウザで **http://localhost:3000** にアクセスして動作を確認してください。

---

## 🔌 API エンドポイント (API Endpoints)

バックエンドは RESTful API を提供しています。`brunoRequestCollection/` ディレクトリに含まれる **Bruno コレクション** を使用して、これらのエンドポイントをテストできます。

| メソッド | パス                | 説明                           | 認証           |
| -------- | ------------------- | ------------------------------ | -------------- |
| `GET`    | `/health`           | サーバーのヘルスチェック       | 不要           |
| `GET`    | `/envs`             | 全環境とステータスのリスト取得 | 不要           |
| `GET`    | `/bookings`         | 予約履歴のリスト取得           | 不要           |
| `POST`   | `/envs/:id/book`    | 環境の予約                     | 不要           |
| `POST`   | `/envs/:id/release` | 環境の解放                     | 不要           |
| `POST`   | `/envs`             | **管理者**: 新規環境の追加     | **Basic Auth** |
| `DELETE` | `/envs/:id`         | **管理者**: 環境の削除         | **Basic Auth** |

> **🔐 管理者認証情報 (Admin Credentials):**
> * ユーザー名: `admin`
> * パスワード: `123456`
> 
> 
> ※ `server/main.go` で設定されています。

---

## 🧪 テスト (Testing)

### End-to-End (E2E) テスト

**Playwright** を使用して、ユーザーフロー全体（表示 -> 予約 -> 解放）をテストします。

1. サーバー (`:8080`) とクライアント (`:3000`) の両方が起動していることを確認してください。
2. 以下のコマンドでテストを実行します:

```bash
cd client
npx playwright test --ui

```

### バックエンド単体テスト

基本的なヘルスチェックのテストが含まれています。

```bash
cd server
go test -v

```

## 🛣️ ロードマップ (Roadmap)

* [ ] コンテナ化 (Server と Client 用の Dockerfile 作成)
* [ ] Kubernetes デプロイメントマニフェストの作成
* [ ] CI/CD パイプラインの統合 (GitHub Actions)