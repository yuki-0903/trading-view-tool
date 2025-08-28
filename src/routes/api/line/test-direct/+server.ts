import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_USER_ID = process.env.LINE_USER_ID || '';

// 直接LINE APIテスト（データベース不要）
export const POST: RequestHandler = async ({ request }) => {
  console.log('🚀 LINE直接テスト API呼び出し開始');
  
  try {
    const { message } = await request.json();
    console.log('📨 受信したメッセージ:', message);
    
    console.log('🔑 環境変数チェック:');
    console.log('- LINE_CHANNEL_ACCESS_TOKEN:', LINE_CHANNEL_ACCESS_TOKEN ? '設定済み' : '未設定');
    console.log('- LINE_USER_ID:', LINE_USER_ID ? '設定済み' : '未設定');
    
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('❌ LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
      return json({ 
        success: false, 
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' 
      }, { status: 500 });
    }

    if (!LINE_USER_ID) {
      console.error('❌ LINE_USER_ID が設定されていません');
      return json({ 
        success: false, 
        error: 'LINE_USER_ID not configured' 
      }, { status: 500 });
    }

    const testMessage = message || `🧪 直接テスト通知
    
📱 LINE APIテスト成功！
🕒 送信時刻: ${new Date().toLocaleString('ja-JP')}

✅ サーバーサイドからの直接通知が正常に動作しています。`;

    console.log('📤 LINE APIに送信するメッセージ:', testMessage);

    // LINE Messaging APIに直接送信
    const linePayload = {
      to: LINE_USER_ID,
      messages: [
        {
          type: 'text',
          text: testMessage
        }
      ]
    };
    
    console.log('📦 LINE API送信ペイロード:', JSON.stringify(linePayload, null, 2));
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linePayload)
    });

    console.log('📊 LINE API レスポンス:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (response.ok) {
      console.log('✅ LINE通知送信成功!');
      return json({ 
        success: true, 
        message: 'データベース不要の直接テスト通知を送信しました！',
        lineUserId: LINE_USER_ID
      });
    } else {
      const errorData = await response.text();
      console.error('❌ LINE API エラー:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return json({ 
        success: false, 
        error: `LINE API Error: ${response.status}`,
        details: errorData
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 直接テストでエラーが発生:', error);
    console.error('エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return json({ 
      error: 'テスト送信でエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({ 
    message: 'LINE Direct Test endpoint',
    usage: 'POST with optional { message: "custom message" } to test LINE notification directly',
    hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN,
    hasLineUserId: !!LINE_USER_ID
  });
};