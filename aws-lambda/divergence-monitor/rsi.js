/**
 * RSI（Relative Strength Index）を計算する関数
 * @param {Array} data KLineDataの配列
 * @param {number} period RSI計算期間（デフォルト：14）
 * @returns {Array} RSIData配列
 */
export function calculateRSI(data, period = 14) {
  if (data.length < period + 1) {
    return [];
  }

  const rsiData = [];
  const closes = data.map(item => parseFloat(item.close));
  
  // 価格変化を計算
  const priceChanges = [];
  for (let i = 1; i < closes.length; i++) {
    priceChanges.push(closes[i] - closes[i - 1]);
  }

  // RSI計算前の期間は50（中立値）で埋める
  for (let i = 0; i < period; i++) {
    const utcTimestamp = parseInt(data[i].openTime);
    const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
    
    rsiData.push({
      time: Math.floor(jstTimestamp / 1000),
      rsi: 50 // 中立値で初期化
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

  // 最初のRSI値を計算
  let rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss);
  let rsi = 100 - (100 / (1 + rs));
  
  const utcTimestamp = parseInt(data[period].openTime);
  const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
  
  rsiData.push({
    time: Math.floor(jstTimestamp / 1000),
    rsi: rsi
  });

  // 残りのRSI値を計算（指数移動平均）
  for (let i = period + 1; i < data.length; i++) {
    const change = priceChanges[i - 1];
    
    let gain = 0;
    let loss = 0;
    
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    // 指数移動平均でRS計算
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss);
    rsi = 100 - (100 / (1 + rs));
    
    const utcTimestamp = parseInt(data[i].openTime);
    const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
    
    rsiData.push({
      time: Math.floor(jstTimestamp / 1000),
      rsi: rsi
    });
  }

  return rsiData;
}