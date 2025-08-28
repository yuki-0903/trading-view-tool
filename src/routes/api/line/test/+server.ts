import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// Service Role Key使用でRLS回避（cron job対応）
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// テスト用のダイバージェンス通知送信エンドポイント
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return json({ 
        success: false,
        error: 'userId is required',
        details: 'リクエストにuserIdが含まれていません'
      }, { status: 400 });
    }

    console.log('🔍 Test notification request for user:', userId);
    console.log('🔐 Using Service Role Key for database access');
    
    // Supabase接続テスト
    try {
      console.log('🧪 Testing Supabase connection...');
      const { data: testData, error: testError } = await serverSupabase
        .from('line_notification_settings')
        .select('count', { count: 'exact', head: true });
      console.log('🧪 Connection test result:', { testData, testError });
    } catch (connError) {
      console.error('🚨 Connection test failed:', connError);
    }

    // デバッグ情報を収集
    const debugInfo = {
      userId,
      envCheck: {
        hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN,
        accessTokenLength: LINE_CHANNEL_ACCESS_TOKEN.length,
        accessTokenPrefix: LINE_CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...',
        hasServiceKey: !!supabaseServiceKey,
        serviceKeyLength: supabaseServiceKey.length,
        usingServiceRole: true
      },
      dbCheck: {
        hasSettings: false,
        settingsError: null as string | null,
        isEnabled: false,
        hasLineUserId: false,
        lineUserId: null as string | null,
        monitoredPairs: [] as string[],
        monitoredIntervals: [] as string[]
      }
    };

    // データベースの設定をチェック
    try {
      console.log('🔍 Querying database for userId:', userId);
      console.log('🔍 Supabase URL:', supabaseUrl);
      console.log('🔍 Service Key prefix:', supabaseServiceKey.substring(0, 50) + '...');
      
      // まず、単純にselect()で全レコードを取得してみる
      const { data: allSettings, error: allError } = await serverSupabase
        .from('line_notification_settings')
        .select('*')
        .eq('user_id', userId);

      console.log('📊 Database query result (all):', JSON.stringify({ allSettings, allError }, null, 2));

      // 次に.single()を試す
      const { data: settings, error: settingsError } = await serverSupabase
        .from('line_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📊 Database query result (single):', JSON.stringify({ settings, settingsError }, null, 2));

      debugInfo.dbCheck = {
        hasSettings: !!settings,
        settingsError: settingsError?.message || null,
        isEnabled: settings?.is_enabled || false,
        hasLineUserId: !!settings?.line_user_id,
        lineUserId: settings?.line_user_id || null,
        monitoredPairs: settings?.monitored_pairs || [],
        monitoredIntervals: settings?.monitored_intervals || [],
        rawQueryData: allSettings,
        rawQueryError: allError?.message || null,
        recordCount: allSettings?.length || 0
      };
    } catch (dbError) {
      console.error('💥 Database error:', dbError);

      debugInfo.dbCheck.settingsError = dbError instanceof Error ? dbError.message : 'Database error';
    }

    console.log('🔍 Debug info:', debugInfo);

    // 環境変数チェック
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return json({ 
        success: false, 
        message: 'LINE設定エラー',
        details: {
          error: 'LINE_CHANNEL_ACCESS_TOKEN not configured',
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck
        }
      });
    }

    // データベース設定チェック
    if (!debugInfo.dbCheck.hasSettings) {
      return json({ 
        success: false, 
        message: 'LINE通知設定が必要です',
        instruction: '以下の手順でLINE通知を設定してください：\n1. サイドバーの「📱 LINE通知設定」セクションを開く\n2. 「LINE通知を有効にする」をチェック\n3. LINE User ID「U5b14cce8c2bc0c88c0d5ebe8b6b254ca」を入力\n4. 監視する通貨ペアと時間足を選択\n5. 設定を保存後、再度テスト通知をお試しください',
        details: {
          error: 'No LINE notification settings found - please configure in sidebar first',
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck,
          solution: 'Configure LINE settings in sidebar before testing'
        }
      });
    }

    if (!debugInfo.dbCheck.isEnabled) {
      return json({ 
        success: false, 
        message: 'LINE通知が無効です',
        details: {
          error: 'LINE notifications are disabled',
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck
        }
      });
    }

    if (!debugInfo.dbCheck.hasLineUserId) {
      return json({ 
        success: false, 
        message: 'LINE User IDが未設定です',
        details: {
          error: 'LINE User ID not configured',
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck
        }
      });
    }

    // テスト用のダイバージェンスデータ
    const testDivergence = {
      id: `test_${Date.now()}`,
      type: 'bullish' as const,
      priceStart: { index: 0, time: Date.now(), price: 150.25, rsi: 25.5, type: 'low' as const },
      priceEnd: { index: 10, time: Date.now() + 1000, price: 149.80, rsi: 32.1, type: 'low' as const },
      rsiStart: { index: 0, time: Date.now(), price: 150.25, rsi: 25.5, type: 'low' as const },
      rsiEnd: { index: 10, time: Date.now() + 1000, price: 149.80, rsi: 32.1, type: 'low' as const },
      strength: 'medium' as const,
      description: 'テスト用強気ダイバージェンス'
    };

    // 内部API経由でテスト通知送信
    console.log('📡 Calling internal notify API...');
    const response = await fetch('/api/line/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        divergence: testDivergence,
        symbol: 'USD_JPY',
        timeInterval: '1hour'
      })
    });

    const result = await response.json();
    console.log('📡 Internal API response:', { 
      status: response.status, 
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      result: JSON.stringify(result, null, 2) 
    });

    if (response.ok && result.success) {
      console.log('✅ Notification sent successfully');
      return json({ 
        success: true, 
        message: 'テスト通知を送信しました',
        divergence: testDivergence,
        details: {
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck,
          apiResult: result
        }
      });
    } else {
      console.error('❌ Notification failed:', {
        status: response.status,
        statusText: response.statusText,
        result: JSON.stringify(result, null, 2)
      });
      return json({ 
        success: false, 
        message: 'テスト通知の送信に失敗しました',
        details: {
          envCheck: debugInfo.envCheck,
          dbCheck: debugInfo.dbCheck,
          apiResult: result,
          apiStatus: response.status,
          errorMessage: result.error || result.message || 'Unknown error'
        }
      });
    }

  } catch (error) {
    console.error('🚨 Test notification error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      details: JSON.stringify(error, null, 2)
    });
    return json({ 
      success: false,
      error: 'Internal Server Error',
      message: 'サーバー内部エラーが発生しました',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
};

// GET request for testing endpoint availability
export const GET: RequestHandler = async () => {
  return json({ 
    message: 'LINE Test Notification endpoint is working',
    timestamp: new Date().toISOString(),
    usage: 'POST with { userId, lineUserId } to send test notification'
  });
};