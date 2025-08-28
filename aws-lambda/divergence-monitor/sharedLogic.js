/**
 * Webアプリと共通のダイバージェンス検出ロジック
 * src/lib/utils/divergence.ts から移植
 */

import { calculateRSI } from './rsi.js';

/**
 * TradingView方式のダイバージェンス検出（Webアプリと同一ロジック）
 */
export function detectTradingViewDivergence(
  klineData,
  rsiData,
  lookbackLeft = 2,
  lookbackRight = 2,
  rangeLower = 5,
  rangeUpper = 50
) {
  const divergences = [];
  
  // 高値・安値のピークを検出
  const peaks = findPeaks(klineData, rsiData, lookbackLeft, lookbackRight);
  
  // ピーク間のダイバージェンスを検出
  const detectedDivergences = findDivergencesBetweenPeaks(peaks, rangeLower, rangeUpper);
  
  // IDを付与して返す
  return detectedDivergences.map((d, index) => ({
    ...d,
    id: `divergence_${Date.now()}_${index}`,
    timestamp: Date.now()
  }));
}

/**
 * Webアプリと同一のピーク検出ロジック
 */
function findPeaks(klineData, rsiData, lookbackLeft, lookbackRight) {
  const peaks = [];
  
  for (let i = lookbackLeft; i < klineData.length - lookbackRight; i++) {
    // 高値ピーク検出
    const currentHigh = parseFloat(klineData[i].high);
    let isHighPeak = true;
    
    // 左側チェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(klineData[j].high) >= currentHigh) {
        isHighPeak = false;
        break;
      }
    }
    
    // 右側チェック
    if (isHighPeak) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(klineData[j].high) >= currentHigh) {
          isHighPeak = false;
          break;
        }
      }
    }
    
    if (isHighPeak && rsiData[i]) {
      peaks.push({
        type: 'high',
        index: i,
        time: parseInt(klineData[i].openTime),
        price: currentHigh,
        rsi: rsiData[i].rsi,
        barData: klineData[i]
      });
    }
    
    // 安値ピーク検出
    const currentLow = parseFloat(klineData[i].low);
    let isLowPeak = true;
    
    // 左側チェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(klineData[j].low) <= currentLow) {
        isLowPeak = false;
        break;
      }
    }
    
    // 右側チェック
    if (isLowPeak) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(klineData[j].low) <= currentLow) {
          isLowPeak = false;
          break;
        }
      }
    }
    
    if (isLowPeak && rsiData[i]) {
      peaks.push({
        type: 'low',
        index: i,
        time: parseInt(klineData[i].openTime),
        price: currentLow,
        rsi: rsiData[i].rsi,
        barData: klineData[i]
      });
    }
  }
  
  return peaks.sort((a, b) => a.time - b.time);
}

/**
 * ピーク間のダイバージェンス検出（Webアプリと完全同一ロジック）
 */
function findDivergencesBetweenPeaks(peaks, rangeLower, rangeUpper) {
  const divergences = [];
  
  // 範囲内チェック関数
  const inRange = (barsSince) => {
    return rangeLower <= barsSince && barsSince <= rangeUpper;
  };

  // ブリッシュダイバージェンス検出（Regular Bullish）
  const lowPivots = peaks.filter(p => p.type === 'low');
  for (let i = 1; i < lowPivots.length; i++) {
    const currentPivot = lowPivots[i];
    const previousPivot = lowPivots[i - 1];
    
    const barsSince = currentPivot.index - previousPivot.index;
    
    if (inRange(barsSince)) {
      // RSI: Higher Low (RSI上昇)
      // Price: Lower Low (価格下降)
      if (currentPivot.rsi > previousPivot.rsi && currentPivot.price < previousPivot.price) {
        divergences.push({
          type: 'bullish',
          strength: calculateDivergenceStrength(previousPivot, currentPivot),
          priceStart: previousPivot.barData,
          priceEnd: currentPivot.barData,
          rsiStart: { time: previousPivot.time, rsi: previousPivot.rsi },
          rsiEnd: { time: currentPivot.time, rsi: currentPivot.rsi },
          distance: barsSince
        });
      }
    }
  }

  // ベアリッシュダイバージェンス検出（Regular Bearish）
  const highPivots = peaks.filter(p => p.type === 'high');
  for (let i = 1; i < highPivots.length; i++) {
    const currentPivot = highPivots[i];
    const previousPivot = highPivots[i - 1];
    
    const barsSince = currentPivot.index - previousPivot.index;
    
    if (inRange(barsSince)) {
      // RSI: Lower High (RSI下降)
      // Price: Higher High (価格上昇)
      if (currentPivot.rsi < previousPivot.rsi && currentPivot.price > previousPivot.price) {
        divergences.push({
          type: 'bearish',
          strength: calculateDivergenceStrength(previousPivot, currentPivot),
          priceStart: previousPivot.barData,
          priceEnd: currentPivot.barData,
          rsiStart: { time: previousPivot.time, rsi: previousPivot.rsi },
          rsiEnd: { time: currentPivot.time, rsi: currentPivot.rsi },
          distance: barsSince
        });
      }
    }
  }
  
  return divergences.sort((a, b) => a.rsiEnd.time - b.rsiEnd.time);
}

/**
 * Webアプリと同一の強度計算
 */
function calculateDivergenceStrength(peak1, peak2) {
  const priceDiff = Math.abs(peak2.price - peak1.price) / peak1.price * 100;
  const rsiDiff = Math.abs(peak2.rsi - peak1.rsi);
  
  if (priceDiff > 1.0 && rsiDiff > 10) return 'strong';
  if (priceDiff > 0.5 && rsiDiff > 5) return 'medium';
  return 'weak';
}

/**
 * リアルタイム監視用の統合関数
 */
export async function performDivergenceAnalysis(
  symbol = 'USD_JPY',
  interval = '15min',
  lookbackLeft = 2,
  lookbackRight = 2,
  rangeLower = 5,
  rangeUpper = 50
) {
  console.log(`🔍 統合ダイバージェンス分析開始: ${symbol} ${interval}`);
  
  try {
    // 1. データ取得（Web版と同一のロジック）
    const klineData = await getRecentKlineData(symbol, interval);
    
    if (!klineData || klineData.length < 50) {
      throw new Error('データ不足');
    }
    
    // 2. RSI計算（Web版と同一のロジック）
    const rsiData = calculateRSI(klineData, 14);
    
    if (rsiData.length < 20) {
      throw new Error('RSIデータ不足');
    }
    
    // 3. ダイバージェンス検出（Web版と同一のロジック）
    const divergences = detectTradingViewDivergence(
      klineData,
      rsiData,
      lookbackLeft,
      lookbackRight,
      rangeLower,
      rangeUpper
    );
    
    console.log(`📊 分析結果: ${divergences.length}個のダイバージェンス検出`);
    
    return {
      success: true,
      symbol,
      interval,
      dataCount: klineData.length,
      rsiCount: rsiData.length,
      divergences,
      klineData, // 最新ローソク足判定のために追加
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ 統合分析エラー:', error);
    return {
      success: false,
      error: error.message,
      symbol,
      interval,
      timestamp: new Date().toISOString()
    };
  }
}

// Lambda用のデータ取得関数（既存のgetRecentKlineDataを使用）
async function getRecentKlineData(symbol, interval) {
  const allData = [];
  const today = new Date();
  let dayCount = 0;
  let currentDate = new Date(today);
  
  // 平日7日分のデータを取得（週末スキップ）
  while (dayCount < 7 && allData.length < 200) {
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      try {
        const { fetchGmoApi } = await import('./gmoApiService.js');
        const dayData = await fetchGmoApi(symbol, interval, currentDate);
        
        if (dayData && dayData.length > 0) {
          allData.unshift(...dayData);
        }
        dayCount++;
      } catch (error) {
        console.log(`⚠️ ${currentDate.toDateString()}のデータ取得失敗:`, error.message);
      }
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return allData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
}