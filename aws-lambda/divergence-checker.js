// AWS Lambda関数 - リアルタイムダイバージェンス検知 & LINE通知
// ダッシュボードのリアルタイムチャート機能を参考に実装

const https = require('https');

// 環境変数
const API_ENDPOINT = process.env.API_ENDPOINT; // WebアプリのLINE通知APIエンドポイント
const SUPABASE_URL = process.env.SUPABASE_URL; // SupabaseのURL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // Supabase匿名キー

/**
 * Supabase REST APIでユーザーのLINE通知設定を取得
 */
async function getUserLineSettings() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(SUPABASE_URL).hostname,
            path: '/rest/v1/line_notification_settings?is_enabled=eq.true&select=*',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * GMO APIでデータ取得（複数日対応、ダッシュボードのfetchRecentKlineDataと同等）
 */
async function fetchMarketData(symbol, interval = '1hour') {
    try {
        const allData = [];
        const today = new Date();
        
        // RSI計算精度向上のため、過去5日分のデータを取得
        for (let daysBack = 4; daysBack >= 0; daysBack--) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - daysBack);
            
            const dateStr = targetDate.getFullYear() + 
                           String(targetDate.getMonth() + 1).padStart(2, '0') + 
                           String(targetDate.getDate()).padStart(2, '0');
            
            const dayData = await fetchSingleDayData(symbol, interval, dateStr);
            if (dayData && dayData.data && Array.isArray(dayData.data)) {
                allData.push(...dayData.data);
            }
        }
        
        // 重複データを削除し、時系列順にソート
        const uniqueData = [];
        const seenTimes = new Set();
        
        for (const item of allData) {
            if (!seenTimes.has(item.openTime)) {
                seenTimes.add(item.openTime);
                uniqueData.push(item);
            }
        }
        
        uniqueData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
        
        return {
            status: 0,
            data: uniqueData
        };
        
    } catch (error) {
        console.error('複数日データ取得エラー:', error);
        throw error;
    }
}

/**
 * 単日のGMO APIデータ取得
 */
async function fetchSingleDayData(symbol, interval, dateStr) {
    return new Promise((resolve, reject) => {
        
        const options = {
            hostname: 'gmo-proxy.vercel.app',
            path: `/?path=v1/klines&symbol=${symbol}&priceType=ASK&interval=${interval}&date=${dateStr}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * RSI計算（ダッシュボードのcalculateRSIと同等）
 */
function calculateRSI(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const rsiValues = [];
    const changes = [];
    
    // 価格変動を計算
    for (let i = 1; i < data.length; i++) {
        const current = parseFloat(data[i].close);
        const previous = parseFloat(data[i - 1].close);
        changes.push(current - previous);
    }
    
    // 初期のRS計算（Simple Moving Average）
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            avgGain += changes[i];
        } else {
            avgLoss += Math.abs(changes[i]);
        }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // 最初のRSI値
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // 対応する時間を計算
    const utcTimestamp = parseInt(data[period].openTime);
    const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
    const timeInSeconds = Math.floor(jstTimestamp / 1000);
    
    rsiValues.push({
        time: timeInSeconds,
        value: rsi
    });
    
    // Wilder's Smoothing Method for subsequent values
    for (let i = period + 1; i < data.length; i++) {
        const change = changes[i - 1];
        
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        const utcTimestamp = parseInt(data[i].openTime);
        const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
        const timeInSeconds = Math.floor(jstTimestamp / 1000);
        
        rsiValues.push({
            time: timeInSeconds,
            value: rsi
        });
    }
    
    return rsiValues;
}

/**
 * ピボット検出（ダッシュボードのfindPivotsと同等）
 */
function findPivots(data, rsiData, lookbackLeft = 2, lookbackRight = 2) {
    const peaks = [];
    
    if (data.length < lookbackLeft + lookbackRight + 1 || rsiData.length < lookbackLeft + lookbackRight + 1) {
        return peaks;
    }

    // 高値ピボットを検出
    for (let i = lookbackLeft; i < data.length - lookbackRight; i++) {
        const currentHigh = parseFloat(data[i].high);
        let isPivotHigh = true;
        
        for (let j = i - lookbackLeft; j < i; j++) {
            if (parseFloat(data[j].high) >= currentHigh) {
                isPivotHigh = false;
                break;
            }
        }
        
        if (isPivotHigh) {
            for (let j = i + 1; j <= i + lookbackRight; j++) {
                if (parseFloat(data[j].high) >= currentHigh) {
                    isPivotHigh = false;
                    break;
                }
            }
        }
        
        if (isPivotHigh) {
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

    // 安値ピボットを検出
    for (let i = lookbackLeft; i < data.length - lookbackRight; i++) {
        const currentLow = parseFloat(data[i].low);
        let isPivotLow = true;
        
        for (let j = i - lookbackLeft; j < i; j++) {
            if (parseFloat(data[j].low) <= currentLow) {
                isPivotLow = false;
                break;
            }
        }
        
        if (isPivotLow) {
            for (let j = i + 1; j <= i + lookbackRight; j++) {
                if (parseFloat(data[j].low) <= currentLow) {
                    isPivotLow = false;
                    break;
                }
            }
        }
        
        if (isPivotLow) {
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
 * ダイバージェンス検出（ダッシュボードのdetectTradingViewDivergenceと同等）
 */
function detectTradingViewDivergence(data, rsiData, lookbackLeft = 2, lookbackRight = 2, rangeLower = 5, rangeUpper = 50) {
    const divergences = [];
    
    if (data.length < rangeUpper + lookbackLeft + lookbackRight) {
        return divergences;
    }

    const pivots = findPivots(data, rsiData, lookbackLeft, lookbackRight);
    
    const inRange = (barsSince) => {
        return rangeLower <= barsSince && barsSince <= rangeUpper;
    };

    // ブリッシュダイバージェンス検出（Regular Bullish）
    const lowPivots = pivots.filter(p => p.type === 'low');
    for (let i = 1; i < lowPivots.length; i++) {
        const currentPivot = lowPivots[i];
        const previousPivot = lowPivots[i - 1];
        
        const barsSince = currentPivot.index - previousPivot.index;
        
        if (inRange(barsSince)) {
            const rsiHL = currentPivot.rsi > previousPivot.rsi;
            const priceLL = currentPivot.price < previousPivot.price;
            
            if (rsiHL && priceLL) {
                const priceDecrease = ((previousPivot.price - currentPivot.price) / previousPivot.price) * 100;
                const rsiIncrease = currentPivot.rsi - previousPivot.rsi;
                
                let strength = 'weak';
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
            const rsiLH = currentPivot.rsi < previousPivot.rsi;
            const priceHH = currentPivot.price > previousPivot.price;
            
            if (rsiLH && priceHH) {
                const priceIncrease = ((currentPivot.price - previousPivot.price) / previousPivot.price) * 100;
                const rsiDecrease = previousPivot.rsi - currentPivot.rsi;
                
                let strength = 'weak';
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
 * ダイバージェンス検出の条件チェック（ユーザー設定に基づく）
 */
function shouldNotifyDivergence(userSettings, divergence) {
    // ダイバージェンスタイプによる通知制御
    if (divergence.type === 'bullish' && !userSettings.notify_bullish_divergence) {
        return false;
    }
    if (divergence.type === 'bearish' && !userSettings.notify_bearish_divergence) {
        return false;
    }
    
    // 時間制限チェック（サイレント時間）
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (userSettings.quiet_hours_start && userSettings.quiet_hours_end) {
        const quietStart = userSettings.quiet_hours_start;
        const quietEnd = userSettings.quiet_hours_end;
        
        // サイレント時間帯の判定（終了時間が開始時間より小さい場合は日跨ぎ）
        if (quietStart <= quietEnd) {
            if (currentTime >= quietStart && currentTime <= quietEnd) {
                return false;
            }
        } else {
            if (currentTime >= quietStart || currentTime <= quietEnd) {
                return false;
            }
        }
    }
    
    return true;
}

/**
 * LINE通知送信（ダッシュボードのLINE通知と同じエンドポイントを使用）
 */
async function sendLineNotification(userSettings, divergence, symbol, timeInterval) {
    return new Promise((resolve, reject) => {
        // ダッシュボードと同じ形式でメッセージを作成
        const notificationMessage = `🎯 リアルタイムダイバージェンス検出!\n\n📊 通貨ペア: ${symbol}\n⏰ 時間足: ${timeInterval}\n🔍 種類: ${divergence.type === 'bullish' ? '📈 強気' : '📉 弱気'}ダイバージェンス\n⚡ 強度: ${divergence.strength}\n\n${divergence.description}\n\n📅 検出時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;
        
        const postData = JSON.stringify({
            userId: userSettings.user_id,
            divergence,
            symbol,
            timeInterval,
            message: notificationMessage
        });

        const url = new URL(API_ENDPOINT);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ status: res.statusCode, result });
                } catch (error) {
                    resolve({ status: res.statusCode, result: data });
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}


/**
 * メイン関数（ダッシュボードのloadRealtimeDataとhandleDivergenceDetectedを参考）
 */
exports.handler = async (event) => {
    console.log('🚀 Lambda リアルタイムダイバージェンス検出開始', { 
        timestamp: new Date().toISOString(),
        event 
    });
    
    const results = [];
    
    try {
        // 1. 有効な LINE 通知設定を取得
        console.log('📋 ユーザーのLINE通知設定を取得中...');
        const userSettingsList = await getUserLineSettings();
        
        if (!Array.isArray(userSettingsList) || userSettingsList.length === 0) {
            console.log('⚠️ 有効なLINE通知設定が見つかりません');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: '有効なLINE通知設定なし',
                    results: [],
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        console.log(`📊 ${userSettingsList.length}人のユーザー設定を取得しました`);
        
        // 2. 各ユーザーの設定に基づいて監視
        for (const userSettings of userSettingsList) {
            console.log(`👤 ユーザー ${userSettings.user_id} の監視開始`);
            console.log(`監視対象: 通貨ペア=${userSettings.monitored_pairs}, 時間足=${userSettings.monitored_intervals}`);
            
            // 3. ユーザーの監視設定に基づいてループ
            for (const symbol of userSettings.monitored_pairs) {
                for (const interval of userSettings.monitored_intervals) {
                    console.log(`📊 ${symbol} ${interval} の分析開始...`);
                    
                    try {
                        // 4. 市場データ取得（過去5日分、RSI計算精度向上のため）
                        const extendedData = await fetchMarketData(symbol, interval);
                        
                        if (!extendedData.data || !Array.isArray(extendedData.data) || extendedData.data.length < 100) {
                            console.log(`⚠️ ${symbol} ${interval} の拡張データが不十分: ${extendedData.data?.length || 0}件`);
                            continue;
                        }
                        
                        // 表示・分析用データは最新200本
                        const displayData = extendedData.data.slice(-200);
                        console.log(`✅ ${symbol} ${interval} データ取得完了: 拡張=${extendedData.data.length}件, 表示=${displayData.length}件`);
                        
                        // 5. RSI計算（拡張データで計算し、表示期間分のみ使用）
                        const fullRsiData = calculateRSI(extendedData.data, 14);
                        const rsiData = fullRsiData.slice(-200); // 表示期間に合わせて最新200個
                        
                        if (rsiData.length < 20) {
                            console.log(`⚠️ ${symbol} ${interval} のRSI計算データが不十分: ${rsiData.length}件`);
                            continue;
                        }
                        
                        console.log(`✅ RSI計算完了: 全体=${fullRsiData.length}件, 使用=${rsiData.length}件`);
                        
                        // 6. ダイバージェンス検出（表示データとRSIデータを使用）
                        const divergences = detectTradingViewDivergence(
                            displayData,  // 表示用KLineData（最新200本）
                            rsiData,      // 対応するRSIデータ（最新200個）
                            2, // lookbackLeft
                            2, // lookbackRight
                            5, // rangeLower
                            50 // rangeUpper
                        );
                        
                        console.log(`🔍 ${symbol} ${interval}: ${divergences.length}個のダイバージェンスを検出`);
                        
                        if (divergences.length > 0) {
                            for (const divergence of divergences) {
                                console.log(`📈 検出: ${divergence.type} (${divergence.strength}) - ${divergence.description}`);
                                
                                // 7. 通知条件チェック
                                if (shouldNotifyDivergence(userSettings, divergence)) {
                                    try {
                                        console.log(`📱 ユーザー ${userSettings.user_id} に通知送信中...`);
                                        
                                        // 8. LINE通知送信
                                        const notificationResult = await sendLineNotification(userSettings, divergence, symbol, interval);
                                        
                                        results.push({
                                            userId: userSettings.user_id,
                                            symbol,
                                            interval,
                                            divergence: divergence.type,
                                            strength: divergence.strength,
                                            notification: notificationResult,
                                            success: notificationResult.status === 200,
                                            timestamp: new Date().toISOString()
                                        });
                                        
                                        console.log(`✅ 通知送信完了: ステータス=${notificationResult.status}`);
                                    } catch (error) {
                                        console.error(`❌ ユーザー ${userSettings.user_id} への通知失敗:`, error.message);
                                        
                                        results.push({
                                            userId: userSettings.user_id,
                                            symbol,
                                            interval,
                                            divergence: divergence.type,
                                            error: error.message,
                                            success: false,
                                            timestamp: new Date().toISOString()
                                        });
                                    }
                                } else {
                                    console.log(`🔇 ユーザー設定により通知をスキップ: ${divergence.type}ダイバージェンス`);
                                }
                            }
                        } else {
                            console.log(`✅ ${symbol} ${interval}: ダイバージェンスなし`);
                        }
                    } catch (error) {
                        console.error(`❌ ${symbol} ${interval} の処理でエラー:`, error.message);
                        results.push({
                            userId: userSettings.user_id,
                            symbol,
                            interval,
                            error: error.message,
                            success: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        }
        
        const summary = {
            totalUsers: userSettingsList.length,
            totalChecks: results.length,
            successfulNotifications: results.filter(r => r.success).length,
            failedNotifications: results.filter(r => !r.success).length,
            uniqueDivergences: [...new Set(results.filter(r => r.success).map(r => `${r.symbol}_${r.interval}_${r.divergence}`))].length
        };
        
        console.log('📊 実行完了サマリー:', summary);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'リアルタイムダイバージェンス検出完了',
                summary,
                results,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('🚨 Lambda実行エラー:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                results,
                timestamp: new Date().toISOString()
            })
        };
    }
};