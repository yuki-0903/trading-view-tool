import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface UserSettings {
  dataSettings: {
    symbol: string;
    interval: string;
    fromDate: string;
    toDate: string;
  };
  divergenceSettings: {
    lookback: number;
    minRange: number;
    maxRange: number;
  };
  backtestSettings: {
    stopLossPips: number;
    takeProfitPips: number;
    initialBalance: number;
    positionSize: number;
  };
}

// 認証状態
export const isAuthenticated = writable<boolean>(false);
export const currentUser = writable<User | null>(null);
export const userSettings = writable<UserSettings | null>(null);

// ローカルストレージから認証状態を復元
if (browser) {
  const savedUser = localStorage.getItem('trading-tool-user');
  const savedSettings = localStorage.getItem('trading-tool-settings');
  
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      currentUser.set(user);
      isAuthenticated.set(true);
    } catch (e) {
      console.error('Failed to parse saved user data:', e);
      localStorage.removeItem('trading-tool-user');
    }
  }
  
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      userSettings.set(settings);
    } catch (e) {
      console.error('Failed to parse saved settings:', e);
      localStorage.removeItem('trading-tool-settings');
    }
  }
}

// 認証機能
export const authService = {
  // ログイン（シンプルな実装：実際のアプリではサーバー認証が必要）
  login: async (username: string, password: string): Promise<boolean> => {
    // デモ用：admin/password で認証成功
    if (username === 'admin' && password === 'password') {
      const user: User = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        createdAt: new Date().toISOString()
      };
      
      currentUser.set(user);
      isAuthenticated.set(true);
      
      if (browser) {
        localStorage.setItem('trading-tool-user', JSON.stringify(user));
      }
      
      return true;
    }
    
    // ユーザー名でのシンプル登録も許可（デモ用）
    if (username && password && password.length >= 6) {
      const user: User = {
        id: Date.now().toString(),
        username: username,
        email: `${username}@example.com`,
        createdAt: new Date().toISOString()
      };
      
      currentUser.set(user);
      isAuthenticated.set(true);
      
      if (browser) {
        localStorage.setItem('trading-tool-user', JSON.stringify(user));
      }
      
      return true;
    }
    
    return false;
  },
  
  // ログアウト
  logout: () => {
    currentUser.set(null);
    isAuthenticated.set(false);
    userSettings.set(null);
    
    if (browser) {
      localStorage.removeItem('trading-tool-user');
      localStorage.removeItem('trading-tool-settings');
    }
  },
  
  // 設定保存
  saveSettings: (settings: UserSettings) => {
    userSettings.set(settings);
    
    if (browser) {
      localStorage.setItem('trading-tool-settings', JSON.stringify(settings));
    }
  },
  
  // 設定読み込み
  loadSettings: (): UserSettings | null => {
    if (browser) {
      const saved = localStorage.getItem('trading-tool-settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
          return null;
        }
      }
    }
    return null;
  }
};