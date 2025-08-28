import axios from "axios";
import type { KLineData, KLineResponse, TickerData, TickerResponse, StatusResponse } from "../types/gmo";

const BASE_URL = "https://gmo-proxy.vercel.app";

export const fetchGmoApi = async (
  symbol: string = "USD_JPY",
  interval: string = "5min",
  date: Date = new Date()
): Promise<KLineData[]> => {
  try {
    const formattedDate = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const requestURL = `${BASE_URL}/api/v1/klines?symbol=${symbol}&priceType=ASK&interval=${interval}&date=${formattedDate}`;
    console.log(requestURL);
    const responseData = await axios.get<KLineResponse>(requestURL);
    return responseData.data.data;
  } catch (err) {
    console.error("KLineデータの取得中にエラーが発生しました:", err);
    throw new Error(`KLineデータの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};

// 複数日のデータを取得して100本分のローソク足を取得
export const fetchRecentKlineData = async (
  symbol: string = "USD_JPY",
  interval: string = "1hour",
  count: number = 100
): Promise<KLineData[]> => {
  try {
    const allData: KLineData[] = [];
    const currentDate = new Date();
    let attemptDate = new Date(currentDate);
    
    // 100本分のデータが集まるまで過去の日付を遡って取得
    while (allData.length < count && attemptDate > new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      try {
        const dayData = await fetchGmoApi(symbol, interval, attemptDate);
        if (dayData && dayData.length > 0) {
          allData.unshift(...dayData); // 配列の先頭に追加（時系列順）
        }
      } catch (err) {
        console.log(`${attemptDate.toDateString()}のデータ取得をスキップ:`, err);
      }
      
      // 前日に移動
      attemptDate.setDate(attemptDate.getDate() - 1);
    }
    
    // 最新の100本を返す
    return allData.slice(-count);
  } catch (err) {
    console.error("過去データの取得中にエラーが発生しました:", err);
    throw new Error(`過去データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const fetchTickerData = async (): Promise<TickerData[]> => {
  try {
    const requestURL = `${BASE_URL}/api/v1/ticker`;
    console.log(requestURL);
    const responseData = await axios.get<TickerResponse>(requestURL);
    return responseData.data.data;
  } catch (err) {
    console.error("Tickerデータの取得中にエラーが発生しました:", err);
    throw new Error(`Tickerデータの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};

// 期間指定でKLineデータを取得
export const fetchRangeKlineData = async (
  symbol: string = "USD_JPY",
  interval: string = "1hour",
  fromDate: string, // YYYY-MM-DD形式
  toDate: string    // YYYY-MM-DD形式
): Promise<KLineData[]> => {
  try {
    const allData: KLineData[] = [];
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const minDate = new Date('2023-10-28');
    
    // データ取得可能日付の制限チェック
    if (startDate < minDate) {
      throw new Error(`データ取得可能期間は2023年10月28日以降です。指定された開始日: ${fromDate}`);
    }
    
    // 開始日から終了日まで1日ずつ取得
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      try {
        const dayData = await fetchGmoApi(symbol, interval, currentDate);
        if (dayData && dayData.length > 0) {
          allData.push(...dayData);
        }
      } catch (err) {
        console.log(`${currentDate.toDateString()}のデータ取得をスキップ:`, err);
      }
      
      // 次の日に移動
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 時系列順にソート
    allData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
    
    // 重複を除去（同じopenTimeのデータがある場合）
    const uniqueData = allData.filter((item, index, array) => 
      index === 0 || item.openTime !== array[index - 1].openTime
    );
    
    console.log(`期間指定データ取得完了: ${uniqueData.length}本 (${fromDate} 〜 ${toDate})`);
    return uniqueData;
  } catch (err) {
    console.error("期間指定データの取得中にエラーが発生しました:", err);
    throw new Error(`期間指定データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const fetchGmoStatus = async (): Promise<string> => {
  try {
    const requestURL = `${BASE_URL}/api/v1/status`;
    console.log(requestURL);
    const responseData = await axios.get<StatusResponse>(requestURL);
    return responseData.data.data.status;
  } catch (err) {
    console.error("ステータスの取得中にエラーが発生しました:", err);
    throw new Error(`ステータスの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};