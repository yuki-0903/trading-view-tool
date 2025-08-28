import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { detectTradingViewDivergence } from '$lib/utils/divergence';
import type { Divergence } from '$lib/utils/divergence';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Service Role Key使用でRLS回避（cron job対応）
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface CheckRequest {
  symbol: string;
  interval: string;
  userId: string;
}

// GMO APIからデータ取得（プロキシ経由）
async function fetchMarketData(symbol: string, interval: string): Promise<any[]> {
  // 複数日のデータを取得するため、過去1週間分のデータを取得
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.getFullYear() + 
                   String(date.getMonth() + 1).padStart(2, '0') + 
                   String(date.getDate()).padStart(2, '0');
    dates.push(dateStr);
  }

  let allData: any[] = [];

  for (const date of dates) {
    try {
      const response = await fetch(
        `https://gmo-proxy.vercel.app/api/v1/klines?symbol=${symbol}&priceType=ASK&interval=${interval}&date=${date}`
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 0 && result.data && Array.isArray(result.data)) {
          allData = allData.concat(result.data);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch data for ${date}:`, error);
    }
  }

  // 時刻でソート（古い順）
  allData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
  
  return allData;
}

// ダイバージェンスチェックと通知送信
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { symbol, interval, userId }: CheckRequest = await request.json();
    
    if (!symbol || !interval || !userId) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`🔍 Divergence check for ${symbol} ${interval} (User: ${userId})`);

    // ユーザーの通知設定を確認
    const { data: settings, error: settingsError } = await serverSupabase
      .from('line_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return json({ error: 'User notification settings not found' }, { status: 404 });
    }

    if (!settings.is_enabled) {
      return json({ message: 'Notifications disabled for user', divergences: 0 });
    }

    // 市場データを取得
    const marketData = await fetchMarketData(symbol, interval);
    
    if (marketData.length < 50) {
      return json({ 
        error: 'Insufficient data for analysis', 
        dataPoints: marketData.length,
        divergences: 0 
      });
    }

    // データを変換
    const candleData = marketData.map((item, index) => ({
      openTime: item.openTime,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      time: parseInt(item.openTime),
      index
    }));

    // ダイバージェンスを検出
    const { calculateRSI } = await import('$lib/utils/rsi');
    const rsiData = calculateRSI(candleData, 14);
    const divergences = detectTradingViewDivergence(
      candleData,
      rsiData,
      2, // lookbackLeft
      2, // lookbackRight
      5, // rangeLower
      50 // rangeUpper
    );

    console.log(`📊 Found ${divergences.length} divergences for ${symbol} ${interval}`);

    let notificationsSent = 0;

    // ダイバージェンスが見つかった場合、通知を送信
    for (const divergence of divergences) {
      try {
        // 通知種別をチェック
        const divergenceType = divergence.type.toLowerCase();
        if ((divergenceType.includes('bullish') && !settings.notify_bullish_divergence) ||
            (divergenceType.includes('bearish') && !settings.notify_bearish_divergence) ||
            (divergenceType.includes('hidden') && !settings.notify_hidden_divergence)) {
          continue; // この種類の通知は無効
        }

        // 時間制限チェック
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const { count } = await serverSupabase
          .from('line_notification_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('success', true)
          .gte('sent_at', oneHourAgo.toISOString());

        if ((count || 0) >= settings.max_notifications_per_hour) {
          console.log('⏰ Notification rate limit reached');
          continue;
        }

        // 静寂時間チェック
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const start = parseInt(settings.quiet_hours_start.replace(':', ''));
        const end = parseInt(settings.quiet_hours_end.replace(':', ''));
        
        let isQuietHours = false;
        if (start <= end) {
          isQuietHours = currentTime >= start && currentTime <= end;
        } else {
          isQuietHours = currentTime >= start || currentTime <= end;
        }

        if (isQuietHours) {
          console.log('🤫 Quiet hours - notification skipped');
          continue;
        }

        // LINE通知API経由で通知送信
        const notificationResponse = await fetch(`${request.url.split('/api')[0]}/api/line/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            divergence,
            symbol,
            timeInterval: interval
          })
        });

        const notificationResult = await notificationResponse.json();
        
        if (notificationResponse.ok && notificationResult.success) {
          notificationsSent++;
          console.log(`✅ Notification sent for ${divergence.type} divergence`);
        } else {
          console.error('❌ Notification failed:', notificationResult);
        }

      } catch (error) {
        console.error('Notification error:', error);
      }
    }

    return json({
      success: true,
      symbol,
      interval,
      userId,
      divergences: divergences.length,
      notificationsSent,
      dataPoints: marketData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Divergence check error:', error);
    return json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      divergences: 0
    }, { status: 500 });
  }
};