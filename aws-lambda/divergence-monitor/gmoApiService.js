import axios from "axios";

const BASE_URL = "https://gmo-proxy.vercel.app";

export const fetchGmoApi = async (
  symbol = "USD_JPY",
  interval = "15min",
  date = new Date()
) => {
  try {
    const formattedDate = date.getFullYear() + 
      String(date.getMonth() + 1).padStart(2, '0') + 
      String(date.getDate()).padStart(2, '0');
    
    const requestURL = `${BASE_URL}/api/v1/klines?symbol=${symbol}&priceType=ASK&interval=${interval}&date=${formattedDate}`;
    console.log(`📡 API Request: ${requestURL}`);
    
    const responseData = await axios.get(requestURL);
    
    if (!responseData.data || !responseData.data.data) {
      throw new Error('Invalid API response format');
    }
    
    const data = responseData.data.data;
    console.log(`📊 取得データ: ${data.length}件`);
    
    return data;
  } catch (err) {
    console.error("KLineデータの取得中にエラーが発生しました:", err);
    throw new Error(`KLineデータの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
};