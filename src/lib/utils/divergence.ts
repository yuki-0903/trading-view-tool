import type { KLineData } from '../types/gmo';
import { calculateRSI, type RSIData } from './rsi';

export interface Peak {
  index: number;
  time: number;
  price: number;
  rsi: number;
  type: 'high' | 'low';
}

export interface Divergence {
  id: string;
  type: 'bullish' | 'bearish';
  priceStart: Peak;
  priceEnd: Peak;
  rsiStart: Peak;
  rsiEnd: Peak;
  strength: 'weak' | 'medium' | 'strong';
  description: string;
}

/**
 * ピボット（pivot）ベースで高値・安値を検出する関数
 * TradingView Pine Script の ta.pivothigh/ta.pivotlow と同等
 * @param data KLineData配列
 * @param rsiData RSIData配列
 * @param lookbackLeft 左側確認期間
 * @param lookbackRight 右側確認期間
 * @returns Peak配列
 */
export function findPivots(
  data: KLineData[], 
  rsiData: RSIData[], 
  lookbackLeft: number = 2, 
  lookbackRight: number = 2
): Peak[] {
  const peaks: Peak[] = [];
  
  if (data.length < lookbackLeft + lookbackRight + 1 || rsiData.length < lookbackLeft + lookbackRight + 1) {
    return peaks;
  }

  // 高値ピボットを検出 (ta.pivothigh equivalent)
  for (let i = lookbackLeft; i < data.length - lookbackRight; i++) {
    const currentHigh = parseFloat(data[i].high);
    let isPivotHigh = true;
    
    // 左側期間チェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(data[j].high) >= currentHigh) {
        isPivotHigh = false;
        break;
      }
    }
    
    // 右側期間チェック
    if (isPivotHigh) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(data[j].high) >= currentHigh) {
          isPivotHigh = false;
          break;
        }
      }
    }
    
    if (isPivotHigh) {
      // 対応するRSI値を見つける
      const utcTimestamp = parseInt(data[i].openTime);
      const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
      const timeInSeconds = Math.floor(jstTimestamp / 1000);
      
      const rsiValue = rsiData.find(rsi => rsi.time === timeInSeconds);
      if (rsiValue) {
        peaks.push({
          index: i,
          time: timeInSeconds,
          price: currentHigh,
          rsi: rsiValue.value,
          type: 'high'
        });
      }
    }
  }

  // 安値ピボットを検出 (ta.pivotlow equivalent)
  for (let i = lookbackLeft; i < data.length - lookbackRight; i++) {
    const currentLow = parseFloat(data[i].low);
    let isPivotLow = true;
    
    // 左側期間チェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(data[j].low) <= currentLow) {
        isPivotLow = false;
        break;
      }
    }
    
    // 右側期間チェック
    if (isPivotLow) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(data[j].low) <= currentLow) {
          isPivotLow = false;
          break;
        }
      }
    }
    
    if (isPivotLow) {
      // 対応するRSI値を見つける
      const utcTimestamp = parseInt(data[i].openTime);
      const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
      const timeInSeconds = Math.floor(jstTimestamp / 1000);
      
      const rsiValue = rsiData.find(rsi => rsi.time === timeInSeconds);
      if (rsiValue) {
        peaks.push({
          index: i,
          time: timeInSeconds,
          price: currentLow,
          rsi: rsiValue.value,
          type: 'low'
        });
      }
    }
  }

  return peaks.sort((a, b) => a.index - b.index);
}

/**
 * TradingView Pine Scriptと同等のダイバージェンス検出
 * @param data KLineData配列
 * @param rsiData RSIData配列
 * @param lookbackLeft 左側確認期間
 * @param lookbackRight 右側確認期間
 * @param rangeLower 最小バー距離
 * @param rangeUpper 最大バー距離
 * @returns Divergence配列
 */
export function detectTradingViewDivergence(
  data: KLineData[],
  rsiData: RSIData[],
  lookbackLeft: number = 2,
  lookbackRight: number = 2,
  rangeLower: number = 2,
  rangeUpper: number = 25
): Divergence[] {
  const divergences: Divergence[] = [];
  
  if (data.length < rangeUpper + lookbackLeft + lookbackRight) {
    return divergences;
  }

  // ピボットを検出
  const pivots = findPivots(data, rsiData, lookbackLeft, lookbackRight);
  
  // 範囲内チェック関数
  const inRange = (barsSince: number): boolean => {
    return rangeLower <= barsSince && barsSince <= rangeUpper;
  };

  // ブリッシュダイバージェンス検出（Regular Bullish）
  const lowPivots = pivots.filter(p => p.type === 'low');
  for (let i = 1; i < lowPivots.length; i++) {
    const currentPivot = lowPivots[i];
    const previousPivot = lowPivots[i - 1];
    
    const barsSince = currentPivot.index - previousPivot.index;
    
    if (inRange(barsSince)) {
      // RSI: Higher Low (RSI上昇)
      const rsiHL = currentPivot.rsi > previousPivot.rsi;
      
      // Price: Lower Low (価格下降)
      const priceLL = currentPivot.price < previousPivot.price;
      
      if (rsiHL && priceLL) {
        const priceDecrease = ((previousPivot.price - currentPivot.price) / previousPivot.price) * 100;
        const rsiIncrease = currentPivot.rsi - previousPivot.rsi;
        
        let strength: 'weak' | 'medium' | 'strong' = 'weak';
        if (rsiIncrease > 3 && priceDecrease > 0.2) strength = 'medium';
        if (rsiIncrease > 7 && priceDecrease > 0.5) strength = 'strong';
        
        divergences.push({
          id: `bullish_${previousPivot.time}_${currentPivot.time}`,
          type: 'bullish',
          priceStart: previousPivot,
          priceEnd: currentPivot,
          rsiStart: previousPivot,
          rsiEnd: currentPivot,
          strength,
          description: `ブリッシュダイバージェンス: 価格-${priceDecrease.toFixed(2)}%, RSI+${rsiIncrease.toFixed(2)}`
        });
      }
    }
  }

  // ベアリッシュダイバージェンス検出（Regular Bearish）
  const highPivots = pivots.filter(p => p.type === 'high');
  for (let i = 1; i < highPivots.length; i++) {
    const currentPivot = highPivots[i];
    const previousPivot = highPivots[i - 1];
    
    const barsSince = currentPivot.index - previousPivot.index;
    
    if (inRange(barsSince)) {
      // RSI: Lower High (RSI下降)
      const rsiLH = currentPivot.rsi < previousPivot.rsi;
      
      // Price: Higher High (価格上昇)
      const priceHH = currentPivot.price > previousPivot.price;
      
      if (rsiLH && priceHH) {
        const priceIncrease = ((currentPivot.price - previousPivot.price) / previousPivot.price) * 100;
        const rsiDecrease = previousPivot.rsi - currentPivot.rsi;
        
        let strength: 'weak' | 'medium' | 'strong' = 'weak';
        if (rsiDecrease > 3 && priceIncrease > 0.2) strength = 'medium';
        if (rsiDecrease > 7 && priceIncrease > 0.5) strength = 'strong';
        
        divergences.push({
          id: `bearish_${previousPivot.time}_${currentPivot.time}`,
          type: 'bearish',
          priceStart: previousPivot,
          priceEnd: currentPivot,
          rsiStart: previousPivot,
          rsiEnd: currentPivot,
          strength,
          description: `ベアリッシュダイバージェンス: 価格+${priceIncrease.toFixed(2)}%, RSI-${rsiDecrease.toFixed(2)}`
        });
      }
    }
  }

  return divergences;
}

/**
 * TradingView Pine Script準拠のダイバージェンス分析を実行する関数
 * @param data KLineData配列
 * @param rsiPeriod RSI計算期間
 * @param lookbackLeft 左側確認期間
 * @param lookbackRight 右側確認期間
 * @param rangeLower 最小バー距離
 * @param rangeUpper 最大バー距離
 * @returns ダイバージェンス分析結果
 */
export function analyzeDivergence(
  data: KLineData[], 
  rsiPeriod: number = 14, 
  lookbackLeft: number = 2, 
  lookbackRight: number = 2,
  rangeLower: number = 2,
  rangeUpper: number = 25,
  preCalculatedRsiData?: RSIData[]  // 事前計算されたRSIデータ（オプション）
) {
  // RSIを計算（事前計算されたデータがあればそれを使用）
  const rsiData = preCalculatedRsiData || calculateRSI(data, rsiPeriod);
  
  // ピボットを検出
  const peaks = findPivots(data, rsiData, lookbackLeft, lookbackRight);
  
  // TradingView準拠のダイバージェンスを検出
  const divergences = detectTradingViewDivergence(data, rsiData, lookbackLeft, lookbackRight, rangeLower, rangeUpper);
  
  return {
    rsiData,
    peaks,
    divergences,
    summary: {
      totalPeaks: peaks.length,
      highPeaks: peaks.filter(p => p.type === 'high').length,
      lowPeaks: peaks.filter(p => p.type === 'low').length,
      bullishDivergences: divergences.filter(d => d.type === 'bullish').length,
      bearishDivergences: divergences.filter(d => d.type === 'bearish').length,
      strongDivergences: divergences.filter(d => d.strength === 'strong').length
    }
  };
}