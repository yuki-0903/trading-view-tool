import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase, isDemoMode, TABLES, type Database } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface LineSettings {
  channelAccessToken: string;
  userId: string;
  enabled: boolean;
}

export interface LambdaSettings {
  functionName: string;
  region: string;
  enabled: boolean;
}

export interface DivergenceSettings {
  monitored_pairs: string[];
  monitored_intervals: string[];
  notify_bullish_divergence: boolean;
  notify_bearish_divergence: boolean;
  max_notifications_per_hour: number;
}

export interface UserSettings {
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
  lineSettings?: LineSettings;
  lambdaSettings?: LambdaSettings;
  divergenceSettings?: DivergenceSettings;
  backtestSettings?: {
    stopLossPips: number;
    takeProfitPips: number;
    initialBalance: number;
    positionSize: number;
  };
}

// Stores
export const isAuthenticated = writable<boolean>(false);
export const currentUser = writable<AppUser | null>(null);
export const userSettings = writable<UserSettings | null>(null);
export const session = writable<Session | null>(null);
export const loading = writable<boolean>(true);

class SupabaseAuthService {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!browser) return;

    try {
      // Check current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        await this.handleSession(currentSession);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (newSession) {
          await this.handleSession(newSession);
        } else {
          this.clearSession();
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      loading.set(false);
    }
  }

  private async handleSession(newSession: Session) {
    try {
      session.set(newSession);
      
      // Get or create user profile
      const userProfile = await this.getOrCreateUserProfile(newSession.user);
      if (userProfile) {
        currentUser.set(userProfile);
        isAuthenticated.set(true);
        
        // Load user settings
        await this.loadUserSettings(userProfile.id);
      }
    } catch (error) {
      console.error('Error handling session:', error);
      this.clearSession();
    }
  }

  private clearSession() {
    session.set(null);
    currentUser.set(null);
    userSettings.set(null);
    isAuthenticated.set(false);
  }

  async signUp(email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoMode()) {
      return this.handleDemoAuth(username, email);
    }

    try {
      console.log('Supabase新規登録試行:', { email, username, passwordLength: password.length });
      
      // まず同じメールアドレスで既に登録されているかチェック
      const { data: existingUserData } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingUserData) {
        console.log('既存ユーザーが見つかりました:', existingUserData);
        return { success: false, error: 'このメールアドレスは既に登録されています。ログインしてください。' };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      console.log('Supabase新規登録結果:', { 
        success: !error, 
        error: error?.message,
        hasUser: !!data.user,
        hasSession: !!data.session,
        needsConfirmation: !!data.user && !data.session,
        userEmail: data.user?.email,
        userId: data.user?.id
      });

      if (error) {
        // より詳細なエラーメッセージ
        if (error.message.includes('already registered')) {
          return { success: false, error: 'このメールアドレスは既に登録されています。ログインまたはパスワードリセットを試してください。' };
        }
        return { success: false, error: error.message };
      }

      // メール確認が必要な場合は成功として扱うが、メッセージを追加
      if (data.user && !data.session) {
        return { success: true, error: 'メール確認が必要です。送信されたメールのリンクをクリックして確認を完了してください。' };
      }

      return { success: true };
    } catch (error) {
      console.error('Supabase新規登録例外:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoMode()) {
      return this.handleDemoAuth(email.split('@')[0] || email, email);
    }

    try {
      console.log('Supabaseログイン試行:', { email, passwordLength: password.length });
      
      // まず該当するユーザーが存在するかチェック
      const { data: userData, error: userError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email)
        .single();

      console.log('ユーザー存在チェック:', {
        email,
        userExists: !!userData,
        userError: userError?.message,
        userName: userData?.username
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Supabaseログイン結果:', { 
        success: !error, 
        error: error?.message,
        errorCode: error?.code,
        hasUser: !!data.user,
        hasSession: !!data.session,
        userEmail: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at ? 'confirmed' : 'not confirmed'
      });

      if (error) {
        // より詳細なエラーメッセージ
        let detailedError = error.message;
        if (error.message === 'Invalid login credentials') {
          if (!userData) {
            detailedError = 'このメールアドレスは登録されていません';
          } else {
            detailedError = 'パスワードが間違っているか、メール確認が完了していません';
          }
        }
        return { success: false, error: detailedError };
      }

      return { success: true };
    } catch (error) {
      console.error('Supabaseログイン例外:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  async signOut(): Promise<void> {
    if (isDemoMode()) {
      this.clearSession();
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoMode()) {
      return { success: false, error: 'デモモードではパスワードリセットはできません' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'パスワードリセット処理中にエラーが発生しました' };
    }
  }

  async updatePassword(newPassword: string, accessToken: string, refreshToken: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoMode()) {
      return { success: false, error: 'デモモードではパスワード更新はできません' };
    }

    try {
      // セッションを設定
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        return { success: false, error: sessionError.message };
      }

      // パスワードを更新
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'パスワード更新処理中にエラーが発生しました' };
    }
  }

  private async handleDemoAuth(username: string, email: string): Promise<{ success: boolean; error?: string }> {
    // Demo mode fallback
    const demoUser: AppUser = {
      id: 'demo-user-id',
      username,
      email,
      created_at: new Date().toISOString()
    };

    currentUser.set(demoUser);
    isAuthenticated.set(true);
    
    // Load demo settings from localStorage
    this.loadDemoSettings();
    
    return { success: true };
  }

  private async getOrCreateUserProfile(user: User): Promise<AppUser | null> {
    try {
      // Check if user profile exists
      const { data: existingUser, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser) {
        return existingUser;
      }

      // Create new user profile
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      const { data: newUser, error: insertError } = await supabase
        .from(TABLES.USERS)
        .insert({
          id: user.id,
          email: user.email!,
          username
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      return newUser;
    } catch (error) {
      console.error('Error getting/creating user profile:', error);
      return null;
    }
  }

  async loadUserSettings(userId: string): Promise<void> {
    if (isDemoMode()) {
      this.loadDemoSettings();
      return;
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.USER_SETTINGS)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user settings:', error);
        return;
      }

      if (data) {
        const settings: UserSettings = {
          symbol: data.symbol,
          time_interval: data.time_interval,
          from_date: data.from_date,
          to_date: data.to_date,
          lookback: data.lookback,
          min_range: data.min_range,
          max_range: data.max_range,
          stop_loss_pips: data.stop_loss_pips,
          take_profit_pips: data.take_profit_pips,
          initial_balance: data.initial_balance,
          position_size: data.position_size
        };
        userSettings.set(settings);
      } else {
        // Create default settings
        await this.createDefaultSettings(userId);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }

  private loadDemoSettings(): void {
    const saved = localStorage.getItem('trading-tool-demo-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        userSettings.set(settings);
      } catch (error) {
        console.error('Error parsing demo settings:', error);
        this.setDefaultSettings();
      }
    } else {
      this.setDefaultSettings();
    }
  }

  private setDefaultSettings(): void {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const defaultSettings: UserSettings = {
      symbol: 'USD_JPY',
      time_interval: '1hour',
      from_date: weekAgo.toISOString().split('T')[0],
      to_date: today.toISOString().split('T')[0],
      lookback: 2,
      min_range: 2,
      max_range: 15,
      stop_loss_pips: 30,
      take_profit_pips: 50,
      initial_balance: 100000,
      position_size: 1.0
    };
    
    userSettings.set(defaultSettings);
  }

  private async createDefaultSettings(userId: string): Promise<void> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_SETTINGS)
        .insert({
          user_id: userId,
          from_date: weekAgo.toISOString().split('T')[0],
          to_date: today.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        this.setDefaultSettings();
        return;
      }

      const settings: UserSettings = {
        symbol: data.symbol,
        time_interval: data.time_interval,
        from_date: data.from_date,
        to_date: data.to_date,
        lookback: data.lookback,
        min_range: data.min_range,
        max_range: data.max_range,
        stop_loss_pips: data.stop_loss_pips,
        take_profit_pips: data.take_profit_pips,
        initial_balance: data.initial_balance,
        position_size: data.position_size
      };
      
      userSettings.set(settings);
    } catch (error) {
      console.error('Error creating default settings:', error);
      this.setDefaultSettings();
    }
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    let userId: string = '';
    
    const unsubscribe = currentUser.subscribe(u => {
      userId = u?.id || '';
    });
    unsubscribe();

    console.log('saveUserSettings 開始:', {
      userId,
      settings,
      isDemoMode: isDemoMode(),
      isAuthenticated: !!userId
    });

    if (!userId) {
      console.log('ユーザーIDが見つからないため保存をスキップ');
      return;
    }

    if (isDemoMode()) {
      console.log('デモモードのため localStorage に保存');
      localStorage.setItem('trading-tool-demo-settings', JSON.stringify(settings));
      userSettings.set(settings);
      return;
    }

    try {
      console.log('Supabase への保存を試行:', {
        table: TABLES.USER_SETTINGS,
        user_id: userId,
        settings
      });

      const { data, error } = await supabase
        .from(TABLES.USER_SETTINGS)
        .upsert({
          user_id: userId,
          ...settings
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('Supabase 保存結果:', {
        success: !error,
        error: error?.message,
        data,
        errorDetails: error
      });

      if (error) {
        console.error('Error saving user settings:', error);
        return;
      }

      console.log('設定保存成功、ストアを更新');
      userSettings.set(settings);
    } catch (error) {
      console.error('Error saving user settings (exception):', error);
    }
  }

  async saveBacktestResult(settings: any, results: any): Promise<void> {
    let userId: string = '';
    
    const unsubscribe = currentUser.subscribe(u => {
      userId = u?.id || '';
    });
    unsubscribe();

    if (!userId || isDemoMode()) return;

    try {
      const { error } = await supabase
        .from(TABLES.BACKTEST_RESULTS)
        .insert({
          user_id: userId,
          settings,
          results
        });

      if (error) {
        console.error('Error saving backtest result:', error);
      }
    } catch (error) {
      console.error('Error saving backtest result:', error);
    }
  }

  // デバッグ用：データベース内のユーザー情報を確認
  async debugCheckUser(email: string): Promise<void> {
    try {
      console.log('=== ユーザー情報デバッグ開始 ===');
      
      // 2. usersテーブルをチェック
      const { data: userTableData, error: tableError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email);
      
      console.log('usersテーブル検索結果:', {
        email,
        found: userTableData,
        error: tableError?.message
      });
      
      // 3. 全てのユーザー（最大10件）を表示
      const { data: allUsers, error: allUsersError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .limit(10);
      
      console.log('usersテーブル全体（最大10件）:', allUsers);
      if (allUsersError) {
        console.log('usersテーブルクエリエラー:', allUsersError.message);
      }
      
      console.log('=== ユーザー情報デバッグ終了 ===');
    } catch (error) {
      console.error('デバッグエラー:', error);
    }
  }
}

// Export singleton instance
export const supabaseAuthService = new SupabaseAuthService();