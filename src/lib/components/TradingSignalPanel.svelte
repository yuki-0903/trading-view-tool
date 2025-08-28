<script lang="ts">
	import type { Divergence } from '../utils/divergence';
	import type { KLineData } from '../types/gmo';

	export let divergences: Divergence[] = [];
	export let klineData: KLineData[] = [];
	export let backtestTrades: any[] = []; // BacktestPanelからの取引結果
	export let symbol: string = '';
	export let interval: string = '';
	export let chartData: any[] = []; // チャートで変換済みのデータ全体

	
	// BacktestPanelと同じ設定値を使用
	const backtestSettings = {
		stopLossPips: 30,
		takeProfitPips: 50
	};

	/**
	 * pipsを価格差に変換（BacktestPanelと同じロジック）
	 */
	function pipsToPrice(pips: number, pair: string = 'USD_JPY'): number {
		if (pair === 'USD_JPY') {
			return pips * 0.01; // 1pip = 0.01円
		}
		return pips * 0.0001; // 一般的な通貨ペアの場合
	}

	/**
	 * 価格差をpipsに変換（BacktestPanelと同じロジック）
	 */
	function priceToPips(priceDiff: number, pair: string = 'USD_JPY'): number {
		if (pair === 'USD_JPY') {
			return priceDiff / 0.01; // 1pip = 0.01円
		}
		return priceDiff / 0.0001; // 一般的な通貨ペアの場合
	}




	// 日時フォーマット関数（チャート変換済みデータから直接取得）
	function formatDateTime(timestamp: number): string {
		// chartDataから対応する時間を検索
		const chartItem = chartData.find(item => item.time === timestamp);
		if (chartItem && chartItem.displayTime) {
			const date = new Date(timestamp * 1000);

			// 月/日 時:分 形式にフォーマット
			const utcMonth = date.getUTCMonth() + 1;
			const utcDay = date.getUTCDate();
			const utcHours = date.getUTCHours();
			const utcMinutes = date.getUTCMinutes().toString().padStart(2, "0");
			return `${utcMonth}/${utcDay} ${utcHours}:${utcMinutes}`;
		}
		
		// フォールバック（念のため）
		return String(new Date(timestamp * 1000));
	}

	// 価格フォーマット関数
	function formatPrice(price: number): string {
		return price.toFixed(3);
	}
</script>

<div class="trading-signal-panel">
	<h3>🎯 トレーディングシグナル - {symbol} ({interval})</h3>
	
	<div class="settings-info">
		<span class="setting-label">設定:</span>
		<span class="setting-value">損切り {backtestSettings.stopLossPips}pips / 利確 {backtestSettings.takeProfitPips}pips</span>
		<span class="setting-note">（BacktestPanelと同じ設定）</span>
	</div>

	{#if backtestTrades.length === 0}
		<div class="no-signals">
			<p>バックテストを実行してください</p>
			<p class="hint">BacktestPanelで「バックテスト実行」ボタンを押すと、ここに取引結果が表示されます</p>
		</div>
	{:else}
		<div class="signals-table">
			<table>
				<thead>
					<tr>
						<th>種類</th>
						<th>検出時間</th>
						<th>エントリー時間</th>
						<th>エントリー価格</th>
						<th>利確価格</th>
						<th>損切価格</th>
						<th>結果</th>
					</tr>
				</thead>
				<tbody>
					{#each backtestTrades as trade}
						<tr class="signal-row {trade.type === 'long' ? 'bullish' : 'bearish'}">
							<td class="signal-type">
								{trade.type === 'long' ? '📈 強気' : '📉 弱気'}
							</td>
							<td class="detect-time">
								{formatDateTime(trade.entryTime)}
							</td>
							<td class="entry-time">
								{formatDateTime(trade.entryTime)}
							</td>
							<td class="entry-price">
								{formatPrice(trade.entryPrice)}
							</td>
							<td class="profit-price">
								{formatPrice(trade.type === 'long' 
									? trade.entryPrice + pipsToPrice(backtestSettings.takeProfitPips, symbol)
									: trade.entryPrice - pipsToPrice(backtestSettings.takeProfitPips, symbol))}
							</td>
							<td class="loss-price">
								{formatPrice(trade.type === 'long'
									? trade.entryPrice - pipsToPrice(backtestSettings.stopLossPips, symbol)
									: trade.entryPrice + pipsToPrice(backtestSettings.stopLossPips, symbol))}
							</td>
							<td class="result {trade.status === 'open' ? 'pending' : (trade.exitReason === 'profit' ? 'profit' : 'loss')}">
								{#if trade.status === 'open'}
									⏳ 保留中
								{:else if trade.exitReason === 'profit'}
									✅ 利確 (+{Math.abs(trade.pips || 0)}pips)
								{:else if trade.exitReason === 'loss'}
									❌ 損切 ({trade.pips || 0}pips)
								{:else}
									❓ 不明
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

