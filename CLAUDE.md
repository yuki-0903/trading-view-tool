# GMO API プロジェクト

Node.js、TypeScript、Viteを使用したGMO API連携プロジェクト
**現在、Node.jsからSvelteへの移行作業中**

## プロジェクト概要
GMO証券のAPIからKLineデータ（為替レート情報）を取得し、ブラウザでチャート表示するWebアプリケーション

## 技術スタック
- **Frontend**: Svelte（移行中）
- **Runtime**: Node.js
- **Language**: TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Testing**: Jest with ts-jest
- **Mock**: axios-mock-adapter

## プロジェクト構成
```
first/
├── api/
│   └── gmoApiService.ts       # GMO API呼び出しロジック
├── src/
│   └── main.ts               # メインアプリケーションロジック
├── tests/
│   └── gmoApiService.test.ts # テストファイル
├── types/
│   └── gmo.ts               # TypeScript型定義
├── index.html               # メインHTMLファイル
├── package.json             # プロジェクト設定
├── tsconfig.json           # TypeScript設定
├── vite.config.ts          # Vite設定
└── jest.config.js          # Jest設定
```

## 利用可能なコマンド

### 開発
- `npm run dev` - 開発サーバー起動（通常 http://localhost:3000）
- `npm run build` - プロダクションビルド
- `npm run preview` - ビルド結果のプレビュー

### テスト
- `npm test` - 全テスト実行
- `npm run test:watch` - ウォッチモードでテスト実行
- `npm run test:coverage` - カバレッジ付きテスト実行

## API仕様

### fetchGmoApi関数
GMO証券のKLineデータを取得する関数

**パラメータ:**
- `symbol`: 通貨ペア（デフォルト: "USD_JPY"）
- `interval`: 時間間隔（デフォルト: "5min"）
- `date`: 取得対象日（デフォルト: 現在日時）

**戻り値:**
```typescript
KLineData[] {
  openTime: string,  // 開始時刻
  open: string,      // 始値
  high: string,      // 高値
  low: string,       // 安値
  close: string      // 終値
}
```

**使用例:**
```typescript
import { fetchGmoApi } from './api/gmoApiService'

// デフォルト値での呼び出し
const data = await fetchGmoApi()

// カスタムパラメータでの呼び出し
const data = await fetchGmoApi('USD_JPY', '1hour', new Date('2025-08-01'))
```

## 開発状況

### 完了済み機能（Node.js版）
- ✅ プロジェクト環境構築（Node.js + TypeScript + Vite）
- ✅ GMO API連携機能
- ✅ データ取得・表示機能
- ✅ 包括的なテストsuite
- ✅ エラーハンドリング

### 移行作業（Node.js → Svelte）
- 🔄 Svelteプロジェクト構築
- ⏳ チャート表示コンポーネント作成
- ⏳ リアルタイムデータ更新機能
- ⏳ レスポンシブ対応

### 現在の表示データ
- 通貨ペア: USD/JPY
- 時間足: 1時間
- 対象日: 2025年8月1日

## APIエンドポイント

### ベースURL
```
https://gmo-proxy.vercel.app
```

### 使用方法
GMO証券のKLineデータを取得するプロキシAPI

**リクエスト形式:**
```
GET /?path=v1/klines&symbol={通貨ペア}&priceType=ASK&interval={時間間隔}&date={YYYYMMDD}
```

**パラメータ例:**
- `symbol`: USD_JPY, EUR_JPY, GBP_JPY等
- `interval`: 5min, 1hour, 1day等
- `date`: 20250801 (2025年8月1日)

**使用例:**
```
https://gmo-proxy.vercel.app?path=v1/klines&symbol=USD_JPY&priceType=ASK&interval=1hour&date=20250801
```

**レスポンス例:**
```json
{
  "status": 0,
  "data": [
    {
      "openTime": "202508011000",
      "open": "150.123",
      "high": "150.456", 
      "low": "149.789",
      "close": "150.321"
    }
  ]
}
```

## テスト内容
- 正常なレスポンスでの動作確認
- カスタムパラメータでのURL生成
- デフォルトパラメータの適用
- APIエラー時のエラーハンドリング
- ネットワークエラー時のエラーハンドリング
- 日付フォーマットの正確性

## UI デザイン

### Neon Cyber Theme カラーパレット

現在のUIは「Neon Cyber Theme」を採用しています。

**主要カラー:**
- **背景色**: `#13151b` - ダークベース
- **セカンダリ背景**: `#0f0f23`, `#1a1a2e` - グラデーション用
- **プライマリ**: `#00ff88` - ネオングリーン（重要な要素、テキスト、ボーダー）
- **アクセント**: `#ff0080` - ホットピンク（アクセントボタン、エラー表示）
- **テキスト**: `#ffffff` - 白文字（メインテキスト）
- **セカンダリテキスト**: `#cccccc`, `#aaaaaa` - グレー系（説明文）

**デザイン特徴:**
- グロー効果: `box-shadow`, `text-shadow`でネオンのような光るエフェクト
- 半透明背景: `backdrop-filter: blur(10px)`でサイバー風の透明感
- グラデーション: 135度の角度で統一されたグラデーション背景
- スムーズアニメーション: 全要素に`transition: all 0.3s ease`

**使用例:**
```css
/* プライマリボタン */
background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
color: #00ff88;
border: 1px solid #00ff88;
box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);

/* アクセントボタン */
background: linear-gradient(135deg, #ff0080 0%, #cc0066 100%);
box-shadow: 0 0 10px rgba(255, 0, 128, 0.3);

/* カード背景 */
background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
border: 1px solid rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
```

## 開発時の注意事項
- APIのレスポンス形式に依存するため、API仕様変更に注意
- CORS設定が必要な場合は、プロキシサーバーを経由
- エラーハンドリングではユーザーフレンドリーなメッセージを表示
- 新しいUIコンポーネント追加時はNeon Cyber Themeのカラーパレットに準拠すること