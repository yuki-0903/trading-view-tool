import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import type { Divergence } from '$lib/utils/divergence';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const API_BASE_URL = 'https://api.line.me/v2/bot';

// Service Role Key使用でRLSを回避（cron job対応）
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface NotifyRequest {
  userId: string;
  divergence: Divergence;
  symbol: string;
  timeInterval: string;
}

// ダイバージェンス通知送信API
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId, divergence, symbol, timeInterval }: NotifyRequest = await request.json();
    
    if (!userId || !divergence || !symbol || !timeInterval) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
      return json({ error: 'LINE configuration error' }, { status: 500 });
    }

    // ユーザーの通知設定を取得（Service Role Key使用でRLS回避）
    const { data: settings, error: settingsError } = await serverSupabase
      .from('line_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return json({ error: 'Notification settings not found' }, { status: 404 });
    }

    if (!settings.is_enabled || !settings.line_user_id) {
      return json({ message: 'Notifications disabled or LINE User ID not set' });
    }

    // 監視対象かチェック
    if (!settings.monitored_pairs.includes(symbol) || 
        !settings.monitored_intervals.includes(timeInterval)) {
      return json({ message: 'Symbol or interval not monitored' });
    }

    // 通知種別をチェック
    const divergenceType = divergence.type.toLowerCase();
    if (divergenceType.includes('bullish') && !settings.notify_bullish_divergence) {
      return json({ message: 'Bullish divergence notifications disabled' });
    }
    if (divergenceType.includes('bearish') && !settings.notify_bearish_divergence) {
      return json({ message: 'Bearish divergence notifications disabled' });
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
      return json({ message: 'Notification rate limit exceeded' });
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
      return json({ message: 'Quiet hours - notification skipped' });
    }

    // メッセージを作成
    const typeText = {
      'bullish': '強気ダイバージェンス',
      'bearish': '弱気ダイバージェンス'
    }[divergence.type.toLowerCase()] || divergence.type;

    const currentTimeStr = new Date().toLocaleString('ja-JP');
    const message = `🔔 ダイバージェンス検出！

📊 通貨ペア: ${symbol}
⏰ 時間足: ${timeInterval}
📈 種別: ${typeText}
💪 強度: ${divergence.strength}
📅 検出時刻: ${currentTimeStr}

Trading View Toolで詳細を確認してください！`;

    // LINE通知を送信
    const lineResponse = await fetch(`${API_BASE_URL}/message/push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: settings.line_user_id,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    const success = lineResponse.ok;
    let errorMessage: string | undefined;

    if (!success) {
      const errorData = await lineResponse.text();
      errorMessage = `LINE API Error: ${lineResponse.status} ${errorData}`;
      console.error(errorMessage);
    }

    // ログを保存
    await serverSupabase.from('line_notification_logs').insert({
      user_id: userId,
      symbol,
      time_interval: timeInterval,
      divergence_type: divergence.type,
      message,
      success,
      error_message: errorMessage,
      divergence_data: divergence
    });

    if (success) {
      return json({ success: true, message: 'Notification sent successfully' });
    } else {
      return json({ success: false, message: 'Failed to send notification', error: errorMessage }, { status: 500 });
    }

  } catch (error) {
    console.error('Notification API error:', error);
    return json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};