<script lang="ts">
	import { runBacktest, type BacktestSettings, type BacktestResult, type Trade } from '../utils/backtest';
	import type { KLineData } from '../types/gmo';
	import type { Divergence } from '../utils/divergence';
	import { isAuthenticated, userSettings } from '../stores/supabaseAuth';

	// icon
	import { Rocket } from 'lucide-svelte';
	import { FileChartColumnIncreasing } from 'lucide-svelte';
	import { History } from 'lucide-svelte';
	import { Radio } from 'lucide-svelte';
	import { TrendingUp } from 'lucide-svelte';
	import { TrendingDown } from 'lucide-svelte';

	// Props
	export let data: KLineData[] = [];
	export let divergences: Divergence[] = [];
	export let symbol: string = '';
	export let interval: string = '';
	export let chartData: any[] = [];
	export let onBacktestResult: (result: any) => void = () => {};

	// Backtest state
	let backtestSettings: BacktestSettings = {
		stopLossPips: 30,
		takeProfitPips: 50,
		initialBalance: 100000,
		positionSize: 1
	};

	let backtestResult: BacktestResult | null = null;
	let backtestTrades: any[] = [];
	let isRunning = false;
	let showDetailedTrades = false;
	let hasLoadedBacktestSettings = false;

	// Auto-save settings
	let backtestSaveTimeoutId: number | null = null;

	// Load user settings (現在はローカルストレージから読み込み)
	$: if ($isAuthenticated && $userSettings && !hasLoadedBacktestSettings) {
		// ブラウザ環境でのみローカルストレージから設定を読み込み
		if (typeof window !== 'undefined') {
			const savedSettings = localStorage.getItem('backtestSettings');
			if (savedSettings) {
				try {
					backtestSettings = { ...backtestSettings, ...JSON.parse(savedSettings) };
				} catch (e) {
					console.warn('Failed to parse saved backtest settings:', e);
				}
			}
		}
		hasLoadedBacktestSettings = true;
	}

	// Reset when logged out
	$: if (!$isAuthenticated) {
		hasLoadedBacktestSettings = false;
	}

	function saveBacktestSettings() {
		// バックテスト設定は現在UserSettingsに含まれていないため、
		// ローカルストレージまたは将来的なDB保存のための準備
		if (!$isAuthenticated || !hasLoadedBacktestSettings) return;
		
		if (backtestSaveTimeoutId) {
			clearTimeout(backtestSaveTimeoutId);
		}
		
		backtestSaveTimeoutId = window.setTimeout(() => {
			// ブラウザ環境でのみローカルに保存（将来的にはDB保存を実装予定）
			if (typeof window !== 'undefined') {
				localStorage.setItem('backtestSettings', JSON.stringify(backtestSettings));
			}
			backtestSaveTimeoutId = null;
		}, 500);
	}
	
	function onBacktestSettingsChange() {
		if (hasLoadedBacktestSettings) {
			saveBacktestSettings();
		}
	}

	// Run backtest
	function runBacktestAnalysis() {
		if (data.length === 0 || divergences.length === 0) {
			alert('データまたはダイバージェンスが不足しています');
			return;
		}

		isRunning = true;
		
		try {
			const result = runBacktest(data, divergences, backtestSettings);
			backtestResult = result;
			backtestTrades = result.trades || [];
			
			// 親コンポーネントに結果を通知
			onBacktestResult(result);
		} catch (error) {
			console.error('Backtest error:', error);
			alert('バックテストでエラーが発生しました: ' + error);
		} finally {
			isRunning = false;
		}
	}

	// Utility functions
	function formatDateTime(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Tokyo'
		});
	}


	function getTradeResultIcon(trade: Trade): string {
		if (trade.status !== 'closed') return '⏳';
		if (!trade.pnl) return '❓';
		return trade.pnl > 0 ? '✅' : '❌';
	}

	function formatPrice(price: number): string {
		return price.toFixed(3);
	}

	function pipsToPrice(pips: number, pair: string = 'USD_JPY'): number {
		if (pair === 'USD_JPY') {
			return pips * 0.01;
		}
		return pips * 0.0001;
	}

	function formatSignalDateTime(timestamp: number): string {
		const chartItem = chartData.find(item => item.time === timestamp);
		if (chartItem && chartItem.displayTime) {
			const date = new Date(timestamp * 1000);
			const utcMonth = date.getUTCMonth() + 1;
			const utcDay = date.getUTCDate();
			const utcHours = date.getUTCHours();
			const utcMinutes = date.getUTCMinutes().toString().padStart(2, "0");
			return `${utcMonth}/${utcDay} ${utcHours}:${utcMinutes}`;
		}
		return String(new Date(timestamp * 1000));
	}

</script>

<div class="space-y-6">
		<!-- バックテスト実行セクション -->
		<div class="border-b border-surface-600 pb-6 border-opacity-30">

			<div class="space-y-4">
				<h5 class="text-sm font-medium text-surface-300">取引設定</h5>
				<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<label for="stopLoss" class="block text-sm font-medium text-surface-300">損切り (pips)</label>
					<input 
						id="stopLoss" 
						type="number" 
						bind:value={backtestSettings.stopLossPips} 
						min="1" 
						max="100" 
						on:input={onBacktestSettingsChange} 
						class="input w-full text-sm"
					/>
				</div>
				<div class="space-y-1">
					<label for="takeProfit" class="block text-sm font-medium text-surface-300">利確 (pips)</label>
					<input 
						id="takeProfit" 
						type="number" 
						bind:value={backtestSettings.takeProfitPips} 
						min="1" 
						max="200" 
						on:input={onBacktestSettingsChange} 
						class="input w-full text-sm"
					/>
				</div>
				<div class="space-y-1">
					<label for="balance" class="block text-sm font-medium text-surface-300">初期残高 (円)</label>
					<input 
						id="balance" 
						type="number" 
						bind:value={backtestSettings.initialBalance} 
						step="10000" 
						min="10000" 
						on:input={onBacktestSettingsChange} 
						class="input w-full text-sm"
					/>
				</div>
				<div class="space-y-1">
					<label for="positionSize" class="block text-sm font-medium text-surface-300">ポジションサイズ (ロット)</label>
					<input 
						id="positionSize" 
						type="number" 
						bind:value={backtestSettings.positionSize} 
						step="0.1" 
						min="0.1" 
						max="10" 
						on:input={onBacktestSettingsChange} 
						class="input w-full text-sm"
					/>
				</div>
			</div>
			
				<div class="pt-2">
					<button 
						class="btn variant-filled-primary w-full"
						class:opacity-50={isRunning || data.length === 0 || divergences.length === 0}
						on:click={runBacktestAnalysis} 
						disabled={isRunning || data.length === 0 || divergences.length === 0}
					>
					{#if isRunning}
							分析中...
					{:else}
						<Rocket /> バックテスト開始
					{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- バックテスト結果セクション -->
		{#if backtestResult}
		<div class="border-b border-surface-600 pb-6 border-opacity-30">
			<h4 class="text-base font-semibold text-success-400 mb-4 flex items-center gap-2"><FileChartColumnIncreasing /> 分析結果</h4>
			
			<!-- サマリーグリッド -->
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">総取引数</div>
					<div class="text-lg font-bold text-surface-200">{backtestResult.totalTrades}</div>
				</div>
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">勝率</div>
					<div class="text-lg font-bold" class:text-success-400={backtestResult.winRate >= 60} class:text-warning-400={backtestResult.winRate >= 50 && backtestResult.winRate < 60} class:text-error-400={backtestResult.winRate < 50}>
						{backtestResult.winRate.toFixed(1)}%
					</div>
				</div>
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">総損益</div>
					<div class="text-lg font-bold" class:text-success-400={backtestResult.totalPnL >= 0} class:text-error-400={backtestResult.totalPnL < 0}>
						{backtestResult.totalPnL.toFixed(0)}円
					</div>
				</div>
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">総pips</div>
					<div class="text-lg font-bold" class:text-success-400={backtestResult.totalPips >= 0} class:text-error-400={backtestResult.totalPips < 0}>
						{backtestResult.totalPips.toFixed(1)}pips
					</div>
				</div>
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">最大DD</div>
					<div class="text-lg font-bold" class:text-success-400={backtestResult.maxDrawdown <= 10} class:text-warning-400={backtestResult.maxDrawdown <= 20 && backtestResult.maxDrawdown > 10} class:text-error-400={backtestResult.maxDrawdown > 20}>
						{backtestResult.maxDrawdown.toFixed(1)}%
					</div>
				</div>
				<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 text-center bg-opacity-50 border-opacity-30">
					<div class="text-xs text-surface-400 mb-1">PF</div>
					<div class="text-lg font-bold" class:text-success-400={backtestResult.profitFactor >= 2} class:text-warning-400={backtestResult.profitFactor >= 1 && backtestResult.profitFactor < 2} class:text-error-400={backtestResult.profitFactor < 1}>
						{backtestResult.profitFactor.toFixed(2)}
					</div>
				</div>
			</div>

			<!-- 取引履歴セクション -->
			<div class="space-y-3">
				<div class="flex justify-between items-center">
					<h4 class="text-base font-medium text-surface-300 flex items-center gap-2"><History />  取引履歴</h4>
					<button 
						class="btn variant-ghost-surface btn-sm"
						on:click={() => showDetailedTrades = !showDetailedTrades}
					>
						{showDetailedTrades ? '簡略表示' : '詳細表示'}
					</button>
				</div>

				{#if showDetailedTrades}
					<div class="space-y-2 max-h-64 overflow-y-auto">
						{#each backtestResult.trades.filter(t => t.status === 'closed') as trade}
							<div class="bg-surface-900 border border-surface-600 rounded-lg p-3 transition-colors bg-opacity-50 border-opacity-30">
								<div class="flex justify-between items-start mb-2">
									<div class="flex items-center gap-2">
										<span class="text-lg">{getTradeResultIcon(trade)}</span>
										<span class="text-sm font-medium text-surface-300">{trade.type === 'long' ? 'ロング' : 'ショート'}</span>
									</div>
									<div class="text-sm font-bold" class:text-success-400={trade.pnl && trade.pnl > 0} class:text-error-400={trade.pnl && trade.pnl <= 0}>
										{trade.pips?.toFixed(1)}pips ({trade.pnl?.toFixed(0)}円)
									</div>
								</div>
								<div class="space-y-1 text-xs text-surface-400">
									<div>
										エントリー: {formatDateTime(trade.entryTime)} → 
										決済: {trade.exitTime ? formatDateTime(trade.exitTime) : '未決済'}
									</div>
									<div>
										{trade.entryPrice.toFixed(3)} → {trade.exitPrice?.toFixed(3) || '−'} 
										<span class="ml-2 px-2 py-0.5 rounded text-xs" class:bg-success-500={trade.exitReason === 'profit'} class:bg-error-500={trade.exitReason === 'loss'}>
											{trade.exitReason === 'profit' ? '利確' : trade.exitReason === 'loss' ? '損切' : '−'}
										</span>
									</div>
									<div>
										ダイバージェンス: {trade.divergence.type === 'bullish' ? 'ブリッシュ' : 'ベアリッシュ'} 
										({trade.divergence.strength})
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-surface-400 bg-surface-900 rounded-lg p-3 bg-opacity-30">
						勝ちトレード: <span class="text-success-400 font-medium">{backtestResult.winningTrades}</span> | 
						負けトレード: <span class="text-error-400 font-medium">{backtestResult.losingTrades}</span>
					</div>
				{/if}
			</div>
		</div>
		{/if}

		<!-- トレーディングシグナルセクション -->
		{#if backtestTrades.length > 0}
		<div class="border-b border-surface-600 pb-6 border-opacity-30">
			<h4 class="text-base font-semibold text-tertiary-400 mb-4 flex items-center gap-2"><Radio /> トレーディングシグナル - {symbol} ({interval})</h4>
			
			<div class="text-sm text-surface-300 mb-4 bg-surface-900 rounded-lg p-2 bg-opacity-30">
				設定: 損切り <span class="text-error-400 font-medium">{backtestSettings.stopLossPips}pips</span> / 
				利確 <span class="text-success-400 font-medium">{backtestSettings.takeProfitPips}pips</span>
			</div>

			<div class="overflow-x-auto bg-surface-900 rounded-lg bg-opacity-20">
				<table class="table table-hover w-full">
					<thead>
						<tr>
							<th class="text-xs font-medium text-surface-300">種類</th>
							<th class="text-xs font-medium text-surface-300">検出時間</th>
							<th class="text-xs font-medium text-surface-300">エントリー時間</th>
							<th class="text-xs font-medium text-surface-300">エントリー価格</th>
							<th class="text-xs font-medium text-surface-300">利確価格</th>
							<th class="text-xs font-medium text-surface-300">損切価格</th>
							<th class="text-xs font-medium text-surface-300">結果</th>
						</tr>
					</thead>
					<tbody>
						{#each backtestTrades as trade}
							<tr class="hover:bg-surface-800 transition-colors border-l-4 hover:bg-opacity-50" 
								class:border-l-success-500={trade.exitReason === 'profit'}
								class:border-l-error-500={trade.exitReason === 'loss'}
								class:border-l-warning-500={trade.status === 'open'}>
								<td class="text-xs">
									<div class="flex items-center gap-1">
										{#if trade.type === 'long'}
											<span class="text-success-400"><TrendingUp /></span>
										{:else}
											<span class="text-error-400"><TrendingDown /></span>
										{/if}
									</div>
								</td>
								<td class="text-xs text-surface-300">
									{formatSignalDateTime(trade.entryTime)}
								</td>
								<td class="text-xs text-surface-300">
									{formatSignalDateTime(trade.entryTime)}
								</td>
								<td class="text-xs font-mono text-surface-200">
									{formatPrice(trade.entryPrice)}
								</td>
								<td class="text-xs font-mono">
									{formatPrice(trade.type === 'long' 
										? trade.entryPrice + pipsToPrice(backtestSettings.takeProfitPips, symbol)
										: trade.entryPrice - pipsToPrice(backtestSettings.takeProfitPips, symbol))}
								</td>
								<td class="text-xs font-mono">
									{formatPrice(trade.type === 'long'
										? trade.entryPrice - pipsToPrice(backtestSettings.stopLossPips, symbol)
										: trade.entryPrice + pipsToPrice(backtestSettings.stopLossPips, symbol))}
								</td>
								<td class="text-xs">
									{#if trade.status === 'open'}
										<span class="px-2 py-1 rounded-full text-warning-400 bg-opacity-20">保留中</span>
									{:else if trade.exitReason === 'profit'}
										<span class="px-2 py-1 rounded-full text-success-400 bg-opacity-20">⚪︎ +{Math.abs(trade.pips || 0).toFixed(2)}pips</span>
									{:else if trade.exitReason === 'loss'}
										<span class="px-2 py-1 rounded-full text-error-400 bg-opacity-20">✖︎ {Math.abs(trade.pips || 0).toFixed(2)}pips</span>
									{:else}
										<span class="px-2 py-1 rounded-full text-surface-400 bg-opacity-20">？</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		{/if}

		<!-- データ不足時のメッセージ -->
		{#if data.length === 0}
			<div class="bg-gradient-to-r from-warning-900 to-warning-800 border border-warning-500 rounded-lg p-6 text-center from-opacity-20 to-opacity-20 border-opacity-30">
				<div class="text-4xl mb-3">📊</div>
				<p class="text-warning-400 font-medium">データを読み込んでからバックテストを実行してください</p>
			</div>
		{:else if divergences.length === 0}
			<div class="bg-gradient-to-r from-secondary-900 to-secondary-800 border border-secondary-500 rounded-lg p-6 text-center from-opacity-20 to-opacity-20 border-opacity-30">
				<div class="text-4xl mb-3">🔍</div>
				<p class="text-secondary-400 font-medium mb-2">ダイバージェンスが検出されていません</p>
				<p class="text-surface-400 text-sm">設定を調整してダイバージェンスを検出してください</p>
			</div>
		{:else if backtestTrades.length === 0}
			<div class="bg-gradient-to-r from-primary-900 to-primary-800 border border-primary-500 rounded-lg p-6 text-center from-opacity-20 to-opacity-20 border-opacity-30">
				<!-- <div class="text-4xl mb-3">🚀</div> -->
				<p class="text-primary-400 font-medium mb-2">バックテストを実行してください</p>
				<p class="text-surface-400 text-sm">上記の「バックテスト実行」ボタンを押すと、取引結果が表示されます</p>
			</div>
		{/if}
</div>