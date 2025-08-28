import { performDivergenceAnalysis } from './sharedLogic.js';
import { sendLineNotification } from './lineNotificationService.js';

// 設定（テスト分析と同一パラメータ）
const MONITORING_CONFIG = {
    symbol: 'USD_JPY',
    interval: '1hour',
    rsiPeriod: 14,
    divergenceSettings: {
        lookbackLeft: 2,    // テスト分析と同一
        lookbackRight: 2,   // テスト分析と同一
        rangeLower: 2,      // テスト分析と同一（5 → 2）
        rangeUpper: 15      // テスト分析と同一（50 → 15）
    }
};

/**
 * 最新のダイバージェンスを検出してLINE通知
 */
export const handler = async () => {
    console.log('🚀 ダイバージェンス監視開始:', new Date().toISOString());
    
    try {
        // 統合ロジックでダイバージェンス分析を実行（Webアプリと同一）
        const analysisResult = await performDivergenceAnalysis(
            MONITORING_CONFIG.symbol,
            MONITORING_CONFIG.interval,
            MONITORING_CONFIG.divergenceSettings.lookbackLeft,
            MONITORING_CONFIG.divergenceSettings.lookbackRight,
            MONITORING_CONFIG.divergenceSettings.rangeLower,
            MONITORING_CONFIG.divergenceSettings.rangeUpper
        );
        
        if (!analysisResult.success) {
            console.log('⚠️ 分析失敗のため監視をスキップ:', analysisResult.error);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: analysisResult.error
                })
            };
        }
        
        const divergences = analysisResult.divergences || [];
        
        // 現在のローソク足で完成したダイバージェンスのみをフィルタ
        const currentDivergences = filterCurrentCandleDivergences(divergences, analysisResult.klineData);
        
        console.log(`📊 検出結果: 全${divergences.length}個, 現在足完成${currentDivergences.length}個`);
        
        if (currentDivergences.length > 0) {
            // LINE通知送信
            for (const divergence of currentDivergences) {
                await sendDivergenceNotification(divergence);
            }
            
            console.log(`✅ ${currentDivergences.length}個の現在足ダイバージェンス通知を送信完了`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                symbol: analysisResult.symbol,
                interval: analysisResult.interval,
                dataCount: analysisResult.dataCount,
                totalDivergences: divergences.length,
                currentCandleDivergences: currentDivergences.length,
                timestamp: new Date().toISOString(),
                usingSharedLogic: true  // 統合ロジック使用フラグ
            })
        };
        
    } catch (error) {
        console.error('❌ 監視エラー:', error);
        
        // エラー通知（オプション）
        await sendErrorNotification(error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * 過去7日間のデータを取得（週末除く）
 */
async function getRecentKlineData() {
    const allData = [];
    const today = new Date();
    let dayCount = 0;
    let currentDate = new Date(today);
    
    // 平日7日分のデータを取得
    while (dayCount < 7 && allData.length < 200) {
        const dayOfWeek = currentDate.getDay();
        
        // 週末はスキップ
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            try {
                const dayData = await fetchGmoApi(
                    MONITORING_CONFIG.symbol,
                    MONITORING_CONFIG.interval,
                    currentDate
                );
                
                if (dayData && dayData.length > 0) {
                    allData.unshift(...dayData);
                    console.log(`📅 ${currentDate.toDateString()}: ${dayData.length}件取得`);
                }
                dayCount++;
            } catch (error) {
                console.log(`⚠️ ${currentDate.toDateString()}のデータ取得失敗:`, error.message);
            }
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // 時系列順にソート
    return allData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
}

/**
 * 現在のローソク足で完成したダイバージェンスのみをフィルタ
 */
function filterCurrentCandleDivergences(divergences, klineData) {
    if (!klineData || klineData.length === 0) {
        return [];
    }
    
    // 最新のローソク足の時刻
    const latestCandle = klineData[klineData.length - 1];
    const latestCandleTime = parseInt(latestCandle.openTime);
    
    console.log(`🕐 最新ローソク足時刻: ${new Date(latestCandleTime * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    
    // ダイバージェンスの終点が最新のローソク足と一致するものを抽出
    const currentDivergences = divergences.filter(divergence => {
        const divergenceEndTime = divergence.rsiEnd.time;
        const matches = divergenceEndTime === latestCandleTime;
        
        if (matches) {
            console.log(`✅ 現在足ダイバージェンス発見: ${divergence.type} (${new Date(divergenceEndTime * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })})`);
        }
        
        return matches;
    });
    
    return currentDivergences;
}

/**
 * ダイバージェンス通知を送信
 */
async function sendDivergenceNotification(divergence) {
    const type = divergence.type === 'bullish' ? '📈 強気' : '📉 弱気';
    const strength = getStrengthText(divergence.strength);
    const time = new Date(divergence.rsiEnd.time * 1000).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const message = `🎯 ダイバージェンス検出！

${type}ダイバージェンス（${strength}）
通貨ペア: ${MONITORING_CONFIG.symbol}
時間足: ${MONITORING_CONFIG.interval}
検出時刻: ${time}

価格: ${divergence.priceStart.close} → ${divergence.priceEnd.close}
RSI: ${divergence.rsiStart.rsi.toFixed(1)} → ${divergence.rsiEnd.rsi.toFixed(1)}

⚠️ 投資判断は自己責任でお願いします`;

    try {
        await sendLineNotification(message);
        console.log(`📱 LINE通知送信完了: ${type}ダイバージェンス`);
    } catch (error) {
        console.error('📱 LINE通知送信失敗:', error);
        throw error;
    }
}

/**
 * エラー通知を送信
 */
async function sendErrorNotification(error) {
    const message = `⚠️ ダイバージェンス監視エラー

エラー: ${error.message}
時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

システム管理者にお知らせください。`;

    try {
        await sendLineNotification(message);
    } catch (notificationError) {
        console.error('エラー通知送信失敗:', notificationError);
    }
}

/**
 * 強度テキストを取得
 */
function getStrengthText(strength) {
    switch (strength) {
        case 'strong': return '強';
        case 'medium': return '中';
        case 'weak': return '弱';
        default: return '不明';
    }
}