import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// デバッグ用エンドポイント
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return json({ error: 'userId is required' }, { status: 400 });
    }

    // 環境変数をチェック
    const envCheck = {
      hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN,
      accessTokenLength: LINE_CHANNEL_ACCESS_TOKEN.length,
      accessTokenPrefix: LINE_CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...'
    };

    // データベースの設定をチェック
    const { data: settings, error: settingsError } = await supabase
      .from('line_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const dbCheck = {
      hasSettings: !!settings,
      settingsError: settingsError?.message || null,
      isEnabled: settings?.is_enabled || false,
      hasLineUserId: !!settings?.line_user_id,
      lineUserId: settings?.line_user_id || null,
      monitoredPairs: settings?.monitored_pairs || [],
      monitoredIntervals: settings?.monitored_intervals || []
    };

    return json({
      success: true,
      userId,
      envCheck,
      dbCheck,
      message: 'Debug information collected'
    });

  } catch (error) {
    console.error('Debug error:', error);
    return json({ 
      error: 'Debug error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({ 
    message: 'LINE Debug endpoint',
    usage: 'POST with { userId } to debug LINE notification settings'
  });
};