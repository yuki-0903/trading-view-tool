import { supabase } from '../supabase';
import type { Divergence } from '../utils/divergence';

interface LineNotificationSettings {
  id?: string;
  user_id: string;
  line_user_id?: string;
  is_enabled: boolean;
  monitored_pairs: string[];
  monitored_intervals: string[];
  notify_bullish_divergence: boolean;
  notify_bearish_divergence: boolean;
  max_notifications_per_hour: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface LineNotificationLog {
  user_id: string;
  symbol: string;
  time_interval: string;
  divergence_type: string;
  message: string;
  success: boolean;
  error_message?: string;
  divergence_data?: any;
}

class LineNotificationService {

  // ユーザーのLINE通知設定を取得
  async getNotificationSettings(userId: string): Promise<LineNotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('line_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading LINE notification settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error loading LINE notification settings:', error);
      return null;
    }
  }

  // LINE通知設定を保存
  async saveNotificationSettings(settings: Partial<LineNotificationSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('line_notification_settings')
        .upsert(settings, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving LINE notification settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving LINE notification settings:', error);
      return false;
    }
  }

  // ダイバージェンス検出時の通知（サーバーAPI経由）
  async notifyDivergenceDetected(
    userId: string,
    divergence: Divergence,
    symbol: string,
    timeInterval: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/line/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          divergence,
          symbol,
          timeInterval
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('LINE通知を送信しました:', result.message);
        return true;
      } else {
        console.log('LINE通知の送信結果:', result.message || result.error);
        return false;
      }
    } catch (error) {
      console.error('LINE通知送信エラー:', error);
      return false;
    }
  }


  // 通知ログを取得（直近の履歴）
  async getNotificationLogs(userId: string, limit: number = 20): Promise<LineNotificationLog[]> {
    try {
      const { data, error } = await supabase
        .from('line_notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading notification logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error loading notification logs:', error);
      return [];
    }
  }

  // LINE友達登録用のQRコードURLを生成（実際には LINE Bot 設定で決まる）
  generateFriendQRCodeUrl(): string {
    // 実際のLINE Bot QRコードURLに置き換える
    return 'https://line.me/R/ti/p/@your-bot-id';
  }
}

export const lineNotificationService = new LineNotificationService();
export type { LineNotificationSettings, LineNotificationLog };