/**
 * ダイバージェンス分析を実行
 */
export function analyzeDivergence(
  priceData,
  rsiPeriod,
  lookbackLeft,
  lookbackRight,
  rangeLower,
  rangeUpper,
  rsiData
) {
  const peaks = findPeaks(priceData, rsiData, lookbackLeft, lookbackRight);
  const divergences = findDivergences(peaks, rangeLower, rangeUpper);
  
  return {
    peaks,
    divergences
  };
}

/**
 * ピークを検出
 */
function findPeaks(priceData, rsiData, lookbackLeft, lookbackRight) {
  const peaks = [];
  
  // 高値ピークを検出
  for (let i = lookbackLeft; i < priceData.length - lookbackRight; i++) {
    let isHighPeak = true;
    const currentHigh = parseFloat(priceData[i].high);
    
    // 左側をチェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(priceData[j].high) >= currentHigh) {
        isHighPeak = false;
        break;
      }
    }
    
    // 右側をチェック
    if (isHighPeak) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(priceData[j].high) >= currentHigh) {
          isHighPeak = false;
          break;
        }
      }
    }
    
    if (isHighPeak && rsiData[i]) {
      const utcTimestamp = parseInt(priceData[i].openTime);
      const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
      
      peaks.push({
        type: 'high',
        index: i,
        time: Math.floor(jstTimestamp / 1000),
        price: currentHigh,
        rsi: rsiData[i].rsi,
        priceData: priceData[i]
      });
    }
  }
  
  // 安値ピークを検出
  for (let i = lookbackLeft; i < priceData.length - lookbackRight; i++) {
    let isLowPeak = true;
    const currentLow = parseFloat(priceData[i].low);
    
    // 左側をチェック
    for (let j = i - lookbackLeft; j < i; j++) {
      if (parseFloat(priceData[j].low) <= currentLow) {
        isLowPeak = false;
        break;
      }
    }
    
    // 右側をチェック
    if (isLowPeak) {
      for (let j = i + 1; j <= i + lookbackRight; j++) {
        if (parseFloat(priceData[j].low) <= currentLow) {
          isLowPeak = false;
          break;
        }
      }
    }
    
    if (isLowPeak && rsiData[i]) {
      const utcTimestamp = parseInt(priceData[i].openTime);
      const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
      
      peaks.push({
        type: 'low',
        index: i,
        time: Math.floor(jstTimestamp / 1000),
        price: currentLow,
        rsi: rsiData[i].rsi,
        priceData: priceData[i]
      });
    }
  }
  
  return peaks.sort((a, b) => a.time - b.time);
}

/**
 * ダイバージェンスを検出
 */
function findDivergences(peaks, rangeLower, rangeUpper) {
  const divergences = [];
  
  // 高値ピーク間のダイバージェンス
  const highPeaks = peaks.filter(p => p.type === 'high');
  for (let i = 0; i < highPeaks.length - 1; i++) {
    for (let j = i + 1; j < highPeaks.length; j++) {
      const distance = j - i;
      if (distance >= rangeLower && distance <= rangeUpper) {
        const peak1 = highPeaks[i];
        const peak2 = highPeaks[j];
        
        // 弱気ダイバージェンス: 価格上昇 & RSI下降
        if (peak2.price > peak1.price && peak2.rsi < peak1.rsi) {
          const strength = calculateStrength(peak1, peak2, 'bearish');
          
          divergences.push({
            type: 'bearish',
            strength,
            priceStart: peak1.priceData,
            priceEnd: peak2.priceData,
            rsiStart: { time: peak1.time, rsi: peak1.rsi },
            rsiEnd: { time: peak2.time, rsi: peak2.rsi },
            distance,
            confidence: calculateConfidence(peak1, peak2, 'bearish')
          });
        }
      }
    }
  }
  
  // 安値ピーク間のダイバージェンス
  const lowPeaks = peaks.filter(p => p.type === 'low');
  for (let i = 0; i < lowPeaks.length - 1; i++) {
    for (let j = i + 1; j < lowPeaks.length; j++) {
      const distance = j - i;
      if (distance >= rangeLower && distance <= rangeUpper) {
        const peak1 = lowPeaks[i];
        const peak2 = lowPeaks[j];
        
        // 強気ダイバージェンス: 価格下降 & RSI上昇
        if (peak2.price < peak1.price && peak2.rsi > peak1.rsi) {
          const strength = calculateStrength(peak1, peak2, 'bullish');
          
          divergences.push({
            type: 'bullish',
            strength,
            priceStart: peak1.priceData,
            priceEnd: peak2.priceData,
            rsiStart: { time: peak1.time, rsi: peak1.rsi },
            rsiEnd: { time: peak2.time, rsi: peak2.rsi },
            distance,
            confidence: calculateConfidence(peak1, peak2, 'bullish')
          });
        }
      }
    }
  }
  
  return divergences.sort((a, b) => a.rsiEnd.time - b.rsiEnd.time);
}

/**
 * ダイバージェンスの強度を計算
 */
function calculateStrength(peak1, peak2, type) {
  const priceDiff = Math.abs(peak2.price - peak1.price) / peak1.price * 100;
  const rsiDiff = Math.abs(peak2.rsi - peak1.rsi);
  
  // 価格変化率とRSI変化の組み合わせで強度を判定
  if (priceDiff > 1.0 && rsiDiff > 10) {
    return 'strong';
  } else if (priceDiff > 0.5 && rsiDiff > 5) {
    return 'medium';
  } else {
    return 'weak';
  }
}

/**
 * ダイバージェンスの信頼度を計算
 */
function calculateConfidence(peak1, peak2, type) {
  const rsiDiff = Math.abs(peak2.rsi - peak1.rsi);
  const priceDiff = Math.abs(peak2.price - peak1.price) / peak1.price * 100;
  
  // RSI変化が大きく、価格変化も明確なほど信頼度が高い
  let confidence = (rsiDiff * 2 + priceDiff * 10) / 3;
  
  // 極端なRSI値での信頼度向上
  if (type === 'bearish' && (peak1.rsi > 70 || peak2.rsi > 70)) {
    confidence += 10;
  }
  if (type === 'bullish' && (peak1.rsi < 30 || peak2.rsi < 30)) {
    confidence += 10;
  }
  
  return Math.min(100, Math.max(0, confidence));
}