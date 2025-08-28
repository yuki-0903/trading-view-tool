-- Trading View Tool Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Data settings
  symbol TEXT DEFAULT 'USD_JPY' NOT NULL,
  time_interval TEXT DEFAULT '1hour' NOT NULL,
  from_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  to_date DATE DEFAULT CURRENT_DATE,
  
  -- Divergence settings
  lookback INTEGER DEFAULT 2 CHECK (lookback >= 2 AND lookback <= 10),
  min_range INTEGER DEFAULT 2 CHECK (min_range >= 2 AND min_range <= 20),
  max_range INTEGER DEFAULT 15 CHECK (max_range >= 10 AND max_range <= 60),
  
  -- Backtest settings
  stop_loss_pips INTEGER DEFAULT 30 CHECK (stop_loss_pips >= 1 AND stop_loss_pips <= 100),
  take_profit_pips INTEGER DEFAULT 50 CHECK (take_profit_pips >= 1 AND take_profit_pips <= 200),
  initial_balance INTEGER DEFAULT 100000 CHECK (initial_balance >= 10000),
  position_size DECIMAL(4,2) DEFAULT 1.0 CHECK (position_size >= 0.1 AND position_size <= 10.0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Backtest results table
CREATE TABLE public.backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LINE notification settings table
CREATE TABLE public.line_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- LINE設定
  line_user_id TEXT, -- LINE User ID (友達登録時に取得)
  is_enabled BOOLEAN DEFAULT false,
  
  -- 監視設定
  monitored_pairs TEXT[] DEFAULT ARRAY['USD_JPY'], -- 監視する通貨ペア
  monitored_intervals TEXT[] DEFAULT ARRAY['1hour'], -- 監視する時間足
  
  -- 通知設定
  notify_bullish_divergence BOOLEAN DEFAULT true,
  notify_bearish_divergence BOOLEAN DEFAULT true,
  
  -- 制限設定
  max_notifications_per_hour INTEGER DEFAULT 5,
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- LINE notification log table (送信履歴)
CREATE TABLE public.line_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 通知内容
  symbol TEXT NOT NULL,
  time_interval TEXT NOT NULL,
  divergence_type TEXT NOT NULL, -- 'bullish', 'bearish'
  message TEXT NOT NULL,
  
  -- 送信結果
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- メタデータ
  divergence_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_backtest_results_user_id ON public.backtest_results(user_id);
CREATE INDEX idx_backtest_results_created_at ON public.backtest_results(created_at DESC);
CREATE INDEX idx_line_notification_settings_user_id ON public.line_notification_settings(user_id);
CREATE INDEX idx_line_notification_logs_user_id ON public.line_notification_logs(user_id);
CREATE INDEX idx_line_notification_logs_sent_at ON public.line_notification_logs(sent_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON public.user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_notification_settings_updated_at 
  BEFORE UPDATE ON public.line_notification_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view their own profile" ON public.users
  FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own backtest results" ON public.backtest_results
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own LINE notification settings" ON public.line_notification_settings
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own LINE notification logs" ON public.line_notification_logs
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Functions for easier data access
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS TABLE (
  symbol TEXT,
  time_interval TEXT,
  from_date DATE,
  to_date DATE,
  lookback INTEGER,
  min_range INTEGER,
  max_range INTEGER,
  stop_loss_pips INTEGER,
  take_profit_pips INTEGER,
  initial_balance INTEGER,
  position_size DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.symbol,
    us.time_interval,
    us.from_date,
    us.to_date,
    us.lookback,
    us.min_range,
    us.max_range,
    us.stop_loss_pips,
    us.take_profit_pips,
    us.initial_balance,
    us.position_size
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data (optional - for testing)
INSERT INTO public.users (id, email, username) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'demo@example.com', 'demo_user');

INSERT INTO public.user_settings (user_id, symbol, time_interval) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'USD_JPY', '1hour');