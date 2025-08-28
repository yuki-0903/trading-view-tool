import type { KLineData } from '../types/gmo';
import type { Divergence } from './divergence';

export interface Trade {
  id: string;
  type: 'long' | 'short';
  entryTime: number;
  entryPrice: number;
  exitTime?: number;
  exitPrice?: number;
  exitReason?: 'profit' | 'loss' | 'manual';
  pnl?: number;
  pips?: number;
  divergence: Divergence;
  status: 'open' | 'closed';
}

export interface BacktestSettings {
  stopLossPips: number;
  takeProfitPips: number;
  initialBalance: number;
  positionSize: number; // ロット数
}

export interface BacktestResult {
  trades: Trade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalPips: number;
  maxDrawdown: number;
  finalBalance: number;
  profitFactor: number;
}

/**
 * pipsを価格差に変換
 * USD/JPYの場合、1pip = 0.01 (最小価格単位は0.001だが、一般的に1pip = 0.01として扱う)
 */
function pipsToPrice(pips: number, pair: string = 'USD_JPY'): number {
  if (pair === 'USD_JPY') {
    return pips * 0.01; // 1pip = 0.01円
  }
  return pips * 0.0001; // 一般的な通貨ペアの場合
}

/**
 * 価格差をpipsに変換
 */
function priceToPips(priceDiff: number, pair: string = 'USD_JPY'): number {
  if (pair === 'USD_JPY') {
    return priceDiff / 0.01;
  }
  return priceDiff / 0.0001;
}

/**
 * ダイバージェンスベースのバックテスト実行
 */
export function runBacktest(
  data: KLineData[],
  divergences: Divergence[],
  settings: BacktestSettings
): BacktestResult {
  console.log('Backtest starting with:', { dataLength: data.length, divergencesLength: divergences.length, settings });
  
  const trades: Trade[] = [];
  let balance = settings.initialBalance;
  let equity = balance;
  let maxEquity = balance;
  let maxDrawdown = 0;

  // ダイバージェンス発生時点でエントリー
  divergences.forEach((divergence, index) => {
    const tradeType = divergence.type === 'bullish' ? 'long' : 'short';
    const entryTime = divergence.rsiEnd.time;
    
    // エントリー価格はダイバージェンス検出時点のクローズ価格
    const entryDataIndex = data.findIndex(d => 
      Math.floor((parseInt(d.openTime) + 9 * 60 * 60 * 1000) / 1000) === entryTime
    );
    
    if (entryDataIndex === -1 || entryDataIndex >= data.length - 1) return;
    
    const entryPrice = parseFloat(data[entryDataIndex].close);
    
    // ストップロスとテイクプロフィットの価格を計算
    const stopLossPrice = tradeType === 'long' 
      ? entryPrice - pipsToPrice(settings.stopLossPips)
      : entryPrice + pipsToPrice(settings.stopLossPips);
      
    const takeProfitPrice = tradeType === 'long'
      ? entryPrice + pipsToPrice(settings.takeProfitPips)
      : entryPrice - pipsToPrice(settings.takeProfitPips);

    const trade: Trade = {
      id: `trade_${index}_${entryTime}`,
      type: tradeType,
      entryTime,
      entryPrice,
      divergence,
      status: 'open'
    };

    // エントリー後の価格変動をチェック
    for (let i = entryDataIndex + 1; i < data.length; i++) {
      const currentData = data[i];
      const high = parseFloat(currentData.high);
      const low = parseFloat(currentData.low);
      const currentTime = Math.floor((parseInt(currentData.openTime) + 9 * 60 * 60 * 1000) / 1000);

      let exitPrice: number | null = null;
      let exitReason: 'profit' | 'loss' | null = null;

      if (tradeType === 'long') {
        // ロングポジション: 高値がテイクプロフィットに到達 or 安値がストップロスに到達
        if (high >= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'profit';
        } else if (low <= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'loss';
        }
      } else {
        // ショートポジション: 安値がテイクプロフィットに到達 or 高値がストップロスに到達
        if (low <= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'profit';
        } else if (high >= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'loss';
        }
      }

      if (exitPrice && exitReason) {
        // 決済
        const priceDiff = tradeType === 'long' 
          ? exitPrice - entryPrice 
          : entryPrice - exitPrice;
        
        const pips = priceToPips(priceDiff);
        const pnl = pips * settings.positionSize * 1000; // 1ロット=100,000通貨単位、USD/JPYでのPnL計算

        trade.exitTime = currentTime;
        trade.exitPrice = exitPrice;
        trade.exitReason = exitReason;
        trade.pnl = pnl;
        trade.pips = pips;
        trade.status = 'closed';

        // 残高更新
        balance += pnl;
        equity = balance;
        
        // 最大ドローダウン計算
        if (equity > maxEquity) {
          maxEquity = equity;
        }
        const currentDrawdown = (maxEquity - equity) / maxEquity * 100;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }

        break;
      }
    }

    trades.push(trade);
  });

  // 結果集計
  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => t.pnl! > 0);
  const losingTrades = closedTrades.filter(t => t.pnl! < 0);
  
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalPips = closedTrades.reduce((sum, t) => sum + (t.pips || 0), 0);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  const result: BacktestResult = {
    trades,
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    totalPnL,
    totalPips,
    maxDrawdown,
    finalBalance: balance,
    profitFactor
  };

  console.log('Backtest result computed:', result);
  return result;
}

/**
 * バックテスト結果をフォーマット
 */
export function formatBacktestResult(result: BacktestResult): string {
  return `
バックテスト結果:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
総取引数: ${result.totalTrades}
勝ちトレード: ${result.winningTrades} (${result.winRate.toFixed(1)}%)
負けトレード: ${result.losingTrades}
総損益: ${result.totalPnL.toFixed(0)}円
総獲得pips: ${result.totalPips.toFixed(1)}pips
最大ドローダウン: ${result.maxDrawdown.toFixed(1)}%
最終残高: ${result.finalBalance.toFixed(0)}円
プロフィットファクター: ${result.profitFactor.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}