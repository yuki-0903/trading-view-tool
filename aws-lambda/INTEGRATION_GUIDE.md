# 🔗 リアルタイムチャートとAWS Lambda統合ガイド

## 🎯 統合の目的

リアルタイムチャート（Webアプリ）とAWS Lambda（cron job）で**同一のダイバージェンス検出ロジック**を使用し、一貫性のある監視システムを構築します。

## 📊 統合前の状況

### **リアルタイムチャート** (Web App)
```javascript
// src/routes/+page.svelte
const divergences = detectTradingViewDivergence(
  displayData,  // KLineData
  rsiData,      // RSIData
  2,            // lookbackLeft
  2,            // lookbackRight  
  5,            // rangeLower
  50            // rangeUpper
);
```

### **AWS Lambda** (独立したロジック)
```javascript
// 旧: divergence-monitor/divergence.js
const analysis = analyzeDivergence(
  priceData, rsiPeriod, lookbackLeft, lookbackRight,
  rangeLower, rangeUpper, rsiData
);
```

## ✅ 統合後の状況

### **共通ロジックライブラリ**
```javascript
// sharedLogic.js - 両方で使用
export function detectTradingViewDivergence(
  klineData, rsiData, lookbackLeft, lookbackRight, 
  rangeLower, rangeUpper
) {
  // Webアプリと完全に同一のロジック
}
```

### **統合パラメータ**
```javascript
// 両方で同一設定
const COMMON_CONFIG = {
  lookbackLeft: 2,     // ピーク検出: 左側期間
  lookbackRight: 2,    // ピーク検出: 右側期間
  rangeLower: 5,       // ダイバージェンス: 最小距離
  rangeUpper: 50,      // ダイバージェンス: 最大距離
  rsiPeriod: 14        // RSI計算期間
};
```

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    共通ロジックライブラリ                      │
│                     (sharedLogic.js)                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ detectTradingViewDivergence()                           │
│ ✅ calculateRSI()                                          │
│ ✅ findPeaks()                                             │
│ ✅ findDivergencesBetweenPeaks()                           │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
      ┌─────────────────┐         ┌─────────────────┐
      │ Webアプリ        │         │ AWS Lambda      │
      │ (リアルタイム)    │         │ (定期監視)       │
      ├─────────────────┤         ├─────────────────┤
      │ 📱 5分毎更新      │         │ ⏰ 1時間毎実行    │
      │ 🖥️ ブラウザ通知    │         │ 📱 LINE通知      │
      │ 📊 即座の視覚化   │         │ 🌙 24時間監視    │
      └─────────────────┘         └─────────────────┘
```

## 🎯 統合の利点

### 1. **一貫性の保証**
- ✅ 同一アルゴリズムによる検出精度の統一
- ✅ パラメータ設定の同期
- ✅ バグ修正の自動反映

### 2. **メンテナンス性向上**
- ✅ ロジック変更時の修正箇所が一箇所
- ✅ テスト工数の削減
- ✅ コード重複の排除

### 3. **ハイブリッド監視**
- 🖥️ **リアルタイム**: ブラウザ開放時の即座の通知
- 📱 **バックグラウンド**: 24時間自動監視とLINE通知

## 🔧 実装詳細

### **共通ロジック** (`sharedLogic.js`)

```javascript
// 統合分析関数
export async function performDivergenceAnalysis(
  symbol, interval, lookbackLeft, lookbackRight, 
  rangeLower, rangeUpper
) {
  // 1. データ取得
  const klineData = await getRecentKlineData(symbol, interval);
  
  // 2. RSI計算
  const rsiData = calculateRSI(klineData, 14);
  
  // 3. ダイバージェンス検出
  const divergences = detectTradingViewDivergence(
    klineData, rsiData, lookbackLeft, lookbackRight,
    rangeLower, rangeUpper
  );
  
  return { success: true, divergences, ... };
}
```

### **Lambda統合** (`index.js`)

```javascript
export const handler = async () => {
  // 統合ロジック使用
  const result = await performDivergenceAnalysis(
    'USD_JPY', '1hour', 2, 2, 5, 50
  );
  
  // 新しいダイバージェンスのみ通知
  const recent = filterRecentDivergences(result.divergences);
  
  for (const divergence of recent) {
    await sendDivergenceNotification(divergence);
  }
};
```

## 📱 通知システムの補完

### **Webアプリ** (リアルタイム通知)
```javascript
// 即座のフィードバック
if (newDivergences.length > 0) {
  showNotification = true;  // UI通知
  
  // ブラウザ通知
  new Notification('ダイバージェンス検出!', {
    body: `${newDivergences.length}個検出`
  });
}
```

### **AWS Lambda** (バックグラウンド通知)
```javascript
// LINE通知（24時間監視）
const message = `🎯 ダイバージェンス検出！

📈 ${divergence.type}ダイバージェンス（${divergence.strength}）
通貨ペア: ${symbol}
時間足: ${interval}
検出時刻: ${time}

⚠️ 投資判断は自己責任でお願いします`;

await sendLineNotification(message);
```

## 🔄 同期スケジュール

### **頻度の最適化**
```
📊 Webアプリ: 5分毎 (1分足〜1時間足)
🚀 Lambda: 1時間毎 (1時間足〜1日足)

重複回避: Lambda は過去2時間以内の新規検出のみ通知
```

### **監視対象の使い分け**
```
🖥️ リアルタイム: USD_JPY 5分足 (短期トレード)
📱 バックグラウンド: USD_JPY 1時間足 (中長期トレンド)
```

## 🧪 テスト・検証

### **統合テスト**
```bash
cd divergence-monitor
node test-integration.js
```

### **比較テスト**
```bash
# Webアプリと同一結果の確認
npm run test:comparison
```

### **ライブテスト**
```bash
# 実際のLINE通知テスト
node test-line.js
```

## 📊 期待される結果

### **検出精度の統一**
- Webアプリとバックグラウンド監視で同一のダイバージェンス検出
- パラメータ変更時の即座の同期

### **通知の補完**
- 🖥️ **ブラウザ開放時**: 即座のビジュアル通知
- 📱 **ブラウザ非開放時**: LINE通知による見逃し防止

### **運用効率**
- 一つのロジック変更で両システム更新
- バグ修正の工数削減
- 一貫した監視品質

## 🚀 次のステップ

1. **統合テスト実行**
   ```bash
   node test-integration.js
   ```

2. **デプロイ**
   ```bash
   ./deploy.sh
   ```

3. **監視開始**
   - Webアプリ: リアルタイムチャートで5分毎監視
   - Lambda: 1時間毎のバックグラウンド監視

4. **効果測定**
   - 検出精度の一貫性確認
   - 通知の重複・漏れチェック
   - システム負荷測定

この統合により、**プロトレーダーレベルの24時間監視システム**が完成します！🎯