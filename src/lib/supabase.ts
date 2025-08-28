import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Supabaseクライアントの設定
const supabaseUrl = PUBLIC_SUPABASE_URL || 'demo-mode';
const supabaseKey = PUBLIC_SUPABASE_ANON_KEY || 'demo-mode';

export const supabase = createClient(supabaseUrl, supabaseKey);

// データベーステーブル名
export const TABLES = {
  USERS: 'users',
  USER_SETTINGS: 'user_settings',
  BACKTEST_RESULTS: 'backtest_results',
  LINE_NOTIFICATION_SETTINGS: 'line_notification_settings',
  LINE_NOTIFICATION_LOGS: 'line_notification_logs'
} as const;

// デモモードかどうかを判定
export const isDemoMode = () => {
  return !PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY || 
         PUBLIC_SUPABASE_URL === 'demo-mode' || PUBLIC_SUPABASE_ANON_KEY === 'demo-mode';
};

// データベースのTypeScript型定義
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          time_interval: string;
          from_date: string;
          to_date: string;
          lookback: number;
          min_range: number;
          max_range: number;
          stop_loss_pips: number;
          take_profit_pips: number;
          initial_balance: number;
          position_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol?: string;
          time_interval?: string;
          from_date?: string;
          to_date?: string;
          lookback?: number;
          min_range?: number;
          max_range?: number;
          stop_loss_pips?: number;
          take_profit_pips?: number;
          initial_balance?: number;
          position_size?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          symbol?: string;
          time_interval?: string;
          from_date?: string;
          to_date?: string;
          lookback?: number;
          min_range?: number;
          max_range?: number;
          stop_loss_pips?: number;
          take_profit_pips?: number;
          initial_balance?: number;
          position_size?: number;
          updated_at?: string;
        };
      };
      backtest_results: {
        Row: {
          id: string;
          user_id: string;
          settings: any; // JSONB
          results: any;  // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings: any;
          results: any;
          created_at?: string;
        };
        Update: {
          settings?: any;
          results?: any;
        };
      };
      line_notification_settings: {
        Row: {
          id: string;
          user_id: string;
          line_user_id?: string;
          is_enabled: boolean;
          monitored_pairs: string[];
          monitored_intervals: string[];
          notify_bullish_divergence: boolean;
          notify_bearish_divergence: boolean;
          notify_hidden_divergence: boolean;
          max_notifications_per_hour: number;
          quiet_hours_start: string;
          quiet_hours_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          line_user_id?: string;
          is_enabled?: boolean;
          monitored_pairs?: string[];
          monitored_intervals?: string[];
          notify_bullish_divergence?: boolean;
          notify_bearish_divergence?: boolean;
          notify_hidden_divergence?: boolean;
          max_notifications_per_hour?: number;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          line_user_id?: string;
          is_enabled?: boolean;
          monitored_pairs?: string[];
          monitored_intervals?: string[];
          notify_bullish_divergence?: boolean;
          notify_bearish_divergence?: boolean;
          notify_hidden_divergence?: boolean;
          max_notifications_per_hour?: number;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          updated_at?: string;
        };
      };
      line_notification_logs: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          time_interval: string;
          divergence_type: string;
          message: string;
          sent_at: string;
          success: boolean;
          error_message?: string;
          divergence_data?: any; // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          time_interval: string;
          divergence_type: string;
          message: string;
          sent_at?: string;
          success?: boolean;
          error_message?: string;
          divergence_data?: any;
          created_at?: string;
        };
        Update: {
          success?: boolean;
          error_message?: string;
        };
      };
    };
  };
}