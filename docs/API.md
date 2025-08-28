# GMO Proxy Server API ドキュメント

## 概要

GMO為替データAPIのプロキシサーバーです。GMOのFX APIを中継し、為替レート情報を提供します。

**Base URL**: `https://gmo-proxy.vercel.app`

## エンドポイント一覧

### 1. サーバー情報

#### `GET /`
サーバーの基本情報とエンドポイント一覧を取得

**レスポンス例:**
```json
{
  "message": "GMO Proxy Server is running!",
  "version": "1.0.0",
  "endpoints": [
    "/health",
    "/api/v1/status",
    "/api/v1/ticker",
    "/api/v1/klines",
    "/api/v1/symbols"
  ]
}
```

---

### 2. ヘルスチェック

#### `GET /health`
サーバーの稼働状態を確認

**レスポンス例:**
```json
{
  "status": "OK",
  "timestamp": "2024-10-28T12:00:00.000Z",
  "uptime": 3600.123
}
```

---

### 3. GMO FX稼働状態

#### `GET /api/v1/status`
GMO FXシステムの稼働状態を取得

**レスポンス例:**
```json
{
  "status": 0,
  "data": {
    "status": "OPEN"
  },
  "responsetime": "2024-10-28T12:00:00.000Z"
}
```

**status値:**
- `OPEN`: 取引可能
- `CLOSE`: 取引停止中
- `MAINTENANCE`: メンテナンス中

---

### 4. 最新レート

#### `GET /api/v1/ticker`
全銘柄の最新為替レートを取得

**レスポンス例:**
```json
{
  "status": 0,
  "data": [
    {
      "symbol": "USD_JPY",
      "ask": "150.123",
      "bid": "150.120",
      "timestamp": "2024-10-28T12:00:00.000Z",
      "status": "OPEN"
    },
    {
      "symbol": "EUR_JPY",
      "ask": "165.456",
      "bid": "165.453",
      "timestamp": "2024-10-28T12:00:00.000Z",
      "status": "OPEN"
    }
  ],
  "responsetime": "2024-10-28T12:00:00.000Z"
}
```

**データ項目:**
- `symbol`: 通貨ペア
- `ask`: 売値（買う時の価格）
- `bid`: 買値（売る時の価格）
- `timestamp`: レートの時刻
- `status`: 取引状態

---

### 5. K線データ（四本値）

#### `GET /api/v1/klines`
指定した銘柄の四本値データを取得

**必須パラメータ:**

| パラメータ | 型 | 説明 | 例 |
|-----------|---|------|---|
| `symbol` | string | 通貨ペア | `USD_JPY` |
| `priceType` | string | 価格タイプ | `ASK` または `BID` |
| `interval` | string | 時間間隔 | `1min`, `1hour`, `1day` など |
| `date` | string | 取得日付 | `20241028` または `2024` |

**使用例:**
```
GET /api/v1/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20241028
```

**interval値:**
- 分足: `1min`, `5min`, `10min`, `15min`, `30min`
- 時間足: `1hour`, `4hour`, `8hour`, `12hour`
- 日足以上: `1day`, `1week`, `1month`

**レスポンス例:**
```json
{
  "status": 0,
  "data": [
    {
      "openTime": "1698134400000",
      "open": "150.123",
      "high": "150.200",
      "low": "150.100",
      "close": "150.180"
    },
    {
      "openTime": "1698134460000",
      "open": "150.180",
      "high": "150.250",
      "low": "150.150",
      "close": "150.220"
    }
  ],
  "responsetime": "2024-10-28T12:00:00.000Z"
}
```

**データ項目:**
- `openTime`: 開始時刻（Unix時間・ミリ秒）
- `open`: 始値
- `high`: 高値
- `low`: 安値
- `close`: 終値

---

### 6. 取引ルール

#### `GET /api/v1/symbols`
取引可能な銘柄と取引ルールを取得

**レスポンス例:**
```json
{
  "status": 0,
  "data": [
    {
      "symbol": "USD_JPY",
      "minOpenOrderSize": "10000",
      "maxOrderSize": "500000",
      "sizeStep": "1",
      "tickSize": "0.001"
    }
  ],
  "responsetime": "2024-10-28T12:00:00.000Z"
}
```

**データ項目:**
- `symbol`: 通貨ペア
- `minOpenOrderSize`: 最小注文数量
- `maxOrderSize`: 最大注文数量
- `sizeStep`: 注文単位
- `tickSize`: 価格の最小変動幅

---

## エラーレスポンス

エラー発生時は以下の形式でレスポンスを返します：

```json
{
  "status": 400,
  "message": "Missing required parameters: symbol, priceType, interval, date",
  "timestamp": "2024-10-28T12:00:00.000Z"
}
```

### エラーコード
- `400` Bad Request: 必須パラメータ不足
- `500` Internal Server Error: サーバーエラー
- `503` Service Unavailable: GMO API接続エラー

---

## 使用例

### JavaScript (fetch)
```javascript
// 最新レート取得
const response = await fetch('https://gmo-proxy.vercel.app/api/v1/ticker');
const data = await response.json();
console.log(data.data[0]); // USD_JPYの最新レート

// K線データ取得
const klineResponse = await fetch(
  'https://gmo-proxy.vercel.app/api/v1/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20241028'
);
const klineData = await klineResponse.json();
console.log(klineData.data); // K線データ配列
```

### curl
```bash
# 稼働状態確認
curl https://gmo-proxy.vercel.app/api/v1/status

# 最新レート取得
curl https://gmo-proxy.vercel.app/api/v1/ticker

# K線データ取得
curl "https://gmo-proxy.vercel.app/api/v1/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20241028"
```

---

## 注意事項

1. **レート制限**: GMO APIの制限に準拠
2. **データ更新頻度**: GMO側のデータ更新に依存
3. **タイムゾーン**: 全ての時刻はUTCで提供
4. **メンテナンス**: GMO側のメンテナンス時はデータ取得不可

---

## サポート

- **GitHub**: https://github.com/yuki-0903/gmo-proxy
- **GMO公式API**: https://forex-api.coin.z.com/