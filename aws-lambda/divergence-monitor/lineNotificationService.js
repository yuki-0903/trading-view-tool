import axios from 'axios';

const LINE_API_BASE_URL = 'https://api.line.me/v2/bot';

/**
 * LINE Messaging APIを使用してプッシュメッセージを送信
 * @param {string} message 送信メッセージ
 * @param {string} lineUserId LINE User ID (オプション、環境変数から取得)
 * @returns {Promise<void>}
 */
export async function sendLineNotification(message, lineUserId = null) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = lineUserId || process.env.LINE_USER_ID;
  
  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN environment variable is not set');
  }

  if (!targetUserId) {
    throw new Error('LINE_USER_ID environment variable is not set');
  }

  try {
    const response = await axios.post(
      `${LINE_API_BASE_URL}/message/push`,
      {
        to: targetUserId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${channelAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒タイムアウト
      }
    );

    if (response.status !== 200) {
      throw new Error(`LINE Messaging API returned status ${response.status}: ${response.statusText}`);
    }

    console.log('📱 LINE通知送信成功:', response.data);
    return response.data;

  } catch (error) {
    console.error('📱 LINE通知送信エラー:', error);
    
    if (error.response) {
      // APIからエラーレスポンスが返された場合
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        throw new Error('LINE Channel Access Token is invalid or expired');
      } else if (status === 403) {
        throw new Error('LINE User ID is invalid or user has blocked the bot');
      } else if (status === 429) {
        throw new Error('LINE Messaging API rate limit exceeded');
      } else {
        throw new Error(`LINE Messaging API error ${status}: ${JSON.stringify(data)}`);
      }
    } else if (error.request) {
      // ネットワークエラー
      throw new Error('Network error occurred while sending LINE notification');
    } else {
      // その他のエラー
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }
}

/**
 * 複数のユーザーにマルチキャストメッセージを送信
 * @param {string} message 送信メッセージ
 * @param {string[]} userIds LINE User IDの配列
 * @returns {Promise<void>}
 */
export async function sendLineMulticast(message, userIds) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN environment variable is not set');
  }

  if (!userIds || userIds.length === 0) {
    throw new Error('User IDs array is empty');
  }

  try {
    const response = await axios.post(
      `${LINE_API_BASE_URL}/message/multicast`,
      {
        to: userIds,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${channelAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15秒タイムアウト（複数ユーザーのため）
      }
    );

    console.log(`📱 LINE マルチキャスト送信成功: ${userIds.length}人に送信`);
    return response.data;

  } catch (error) {
    console.error('📱 LINE マルチキャスト送信エラー:', error);
    throw error;
  }
}