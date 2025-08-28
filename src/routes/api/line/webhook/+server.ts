import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lineNotificationService } from '$lib/services/lineNotificationService';
import { supabase } from '$lib/supabase';
import crypto from 'crypto';

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

// リクエストの署名を検証
function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.warn('LINE_CHANNEL_SECRET is not set');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return signature === `sha256=${expectedSignature}`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // リクエストボディを取得
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // 署名を検証
    if (!verifySignature(body, signature)) {
      console.error('Invalid signature');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // JSONとしてパース
    const data = JSON.parse(body);
    const events = data.events || [];

    console.log('LINE Webhook received:', {
      eventsCount: events.length,
      events: events.map((e: any) => ({
        type: e.type,
        userId: e.source?.userId,
        message: e.message?.text
      }))
    });

    // 各イベントを処理
    for (const event of events) {
      await handleLineEvent(event);
    }

    return json({ success: true });
  } catch (error) {
    console.error('LINE Webhook error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};

// LINEイベントを処理
async function handleLineEvent(event: any) {
  const { type, source, message, replyToken } = event;

  if (type !== 'message' || message?.type !== 'text') {
    return;
  }

  const userId = source?.userId;
  const messageText = message?.text?.trim();

  if (!userId || !messageText) {
    return;
  }

  console.log(`LINE message from ${userId}: ${messageText}`);

  // コマンドを処理
  if (messageText.startsWith('/')) {
    await handleCommand(userId, messageText, replyToken);
  } else {
    // 一般的なメッセージへの自動応答
    await sendReplyMessage(replyToken, '🤖 Trading View Bot です\n\n利用可能なコマンド:\n/userid - あなたのユーザーIDを表示\n/help - ヘルプメッセージを表示');
  }
}

// コマンドを処理
async function handleCommand(userId: string, command: string, replyToken: string) {
  const cmd = command.toLowerCase();

  switch (cmd) {
    case '/userid':
      await sendReplyMessage(replyToken, `あなたのLINE User ID:\n\n${userId}\n\nこのIDをTrading View Toolの設定画面にコピーして貼り付けてください。`);
      break;

    case '/help':
      await sendReplyMessage(replyToken, 
        `🔔 Trading View Bot ヘルプ\n\n` +
        `利用可能なコマンド:\n` +
        `/userid - あなたのUser IDを表示\n` +
        `/status - 通知設定の状態を確認\n` +
        `/help - このヘルプを表示\n\n` +
        `ダイバージェンス検出時に自動で通知をお送りします。`
      );
      break;

    case '/status':
      await handleStatusCommand(userId, replyToken);
      break;

    default:
      await sendReplyMessage(replyToken, `不明なコマンドです: ${command}\n\n/help でヘルプを確認してください。`);
      break;
  }
}

// ステータス確認コマンド
async function handleStatusCommand(userId: string, replyToken: string) {
  try {
    // LINE User IDでユーザーを検索
    const { data: userData, error: userError } = await supabase
      .from('line_notification_settings')
      .select('*, users!inner(username)')
      .eq('line_user_id', userId)
      .single();

    if (userError || !userData) {
      await sendReplyMessage(replyToken, 
        `❌ 設定が見つかりません\n\n` +
        `Trading View Toolでアカウント作成後、LINE通知設定でこのUser IDを登録してください:\n${userId}`
      );
      return;
    }

    const settings = userData;
    const statusText = settings.is_enabled ? '✅ 有効' : '❌ 無効';
    const pairsText = settings.monitored_pairs?.join(', ') || 'なし';
    const intervalsText = settings.monitored_intervals?.join(', ') || 'なし';

    await sendReplyMessage(replyToken,
      `📊 通知設定状態\n\n` +
      `ユーザー: ${userData.users?.username || '不明'}\n` +
      `状態: ${statusText}\n` +
      `監視ペア: ${pairsText}\n` +
      `監視時間足: ${intervalsText}\n` +
      `最大通知数: ${settings.max_notifications_per_hour}/時間\n\n` +
      `設定の変更はTrading View Toolで行ってください。`
    );
  } catch (error) {
    console.error('Status command error:', error);
    await sendReplyMessage(replyToken, 'ステータス確認中にエラーが発生しました。');
  }
}

// リプライメッセージを送信
async function sendReplyMessage(replyToken: string, text: string) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: 'text',
            text
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LINE Reply API Error:', response.status, errorData);
    } else {
      console.log('Reply message sent successfully');
    }
  } catch (error) {
    console.error('Error sending reply message:', error);
  }
}

// GET request (for testing)
export const GET: RequestHandler = async () => {
  return json({ 
    message: 'LINE Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    url: 'This endpoint should be set as Webhook URL in LINE Developer Console'
  });
};