import type { KLineData } from '../types/gmo';

export interface RSIData {
  time: number;
  value: number;
}

/**
 * RSI（Relative Strength Index）を計算する関数
 * @param data KLineDataの配列
 * @param period RSI計算期間（デフォルト：14）
 * @returns RSIData配列
 */
export function calculateRSI(data: KLineData[], period: number = 14): RSIData[] {
  if (data.length < period + 1) {
    return [];
  }

  const rsiData: RSIData[] = [];
  const closes = data.map(item => parseFloat(item.close));
  
  // 価格変化を計算
  const priceChanges: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    priceChanges.push(closes[i] - closes[i - 1]);
  }

  // RSI計算前の期間は50（中立値）で埋める
  for (let i = 0; i < period; i++) {
    const utcTimestamp = parseInt(data[i].openTime);
    const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
    
    rsiData.push({
      time: Math.floor(jstTimestamp / 1000),
      value: 50 // 中立値で初期化
    });
  }

  // 初回のRSI計算（単純平均）
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    const change = priceChanges[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // 最初の有効なRSI値を計算してperiod-1番目を更新
  const rs1 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi1 = 100 - (100 / (1 + rs1));
  
  // period-1番目（最後の初期値）のRSI値を有効な値に更新
  rsiData[period - 1].value = rsi1;

  // 残りのRSI値を計算（指数移動平均を使用）
  for (let i = period; i < priceChanges.length; i++) {
    const change = priceChanges[i];
    let gain = 0;
    let loss = 0;
    
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    // Wilder's smoothing (指数移動平均の一種)
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // 対応するデータのインデックス（i+1）でRSI配列に追加
    const utcTimestamp = parseInt(data[i + 1].openTime);
    const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
    
    rsiData.push({
      time: Math.floor(jstTimestamp / 1000),
      value: Math.round(rsi * 100) / 100 // 小数点以下2桁で丸める
    });
  }

  return rsiData;
}

/**
 * RSIの状態を判定する関数
 * @param rsi RSI値
 * @returns 'oversold' | 'overbought' | 'neutral'
 */
export function getRSIStatus(rsi: number): 'oversold' | 'overbought' | 'neutral' {
  if (rsi <= 30) return 'oversold';  // 売られすぎ
  if (rsi >= 70) return 'overbought'; // 買われすぎ
  return 'neutral'; // 中立
}

/**
 * RSIの色を取得する関数
 * @param rsi RSI値
 * @returns 色の文字列
 */
export function getRSIColor(rsi: number): string {
  const status = getRSIStatus(rsi);
  switch (status) {
    case 'oversold': return '#4caf50';  // 緑（買いシグナル）
    case 'overbought': return '#f44336'; // 赤（売りシグナル）
    default: return '#2196f3'; // 青（中立）
  }
}