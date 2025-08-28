import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// シンプルなLINE通知テスト（Supabase不要）
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { lineUserId, message } = await request.json();
    
    if (!lineUserId) {
      return json({ error: 'lineUserId is required' }, { status: 400 });
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const testMessage = message || `🧪 テストメッセージ

📱 LINE通知が正常に動作しています！
🕒 送信時刻: ${new Date().toLocaleString('ja-JP')}

✅ LINE APIとの接続に成功しました。`;

    // LINE Messaging APIに直接送信
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: testMessage
          }
        ]
      })
    });

    if (response.ok) {
      return json({ 
        success: true, 
        message: 'テストメッセージを送信しました！LINEを確認してください。',
        lineUserId,
        accessTokenStatus: 'OK'
      });
    } else {
      const errorData = await response.text();
      console.error('LINE API Error:', response.status, errorData);
      return json({ 
        success: false, 
        error: `LINE API Error: ${response.status}`,
        details: errorData
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Simple test error:', error);
    return json({ 
      error: 'テスト送信でエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({ 
    message: 'LINE Simple Test endpoint',
    usage: 'POST with { lineUserId: "U64396aeb536357cc8794bd114e1ffa88" } to test LINE notification',
    hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN
  });
};