<script lang="ts">
	import { runBacktest, formatBacktestResult, type BacktestSettings, type BacktestResult, type Trade } from '../utils/backtest';
	import type { KLineData } from '../types/gmo';
	import type { Divergence } from '../utils/divergence';
	import { isAuthenticated, authService, userSettings } from '../stores/auth';

	export let data: KLineData[] = [];
	export let divergences: Divergence[] = [];
	export let onBacktestResult: (result: BacktestResult) => void = () => {};

	let backtestSettings: BacktestSettings = {
		stopLossPips: 30,
		takeProfitPips: 50,
		initialBalance: 100000, // 10万円
		positionSize: 1 // 0.1ロット
	};

	let backtestResult: BacktestResult | null = null;
	let isRunning = false;
	let showDetailedTrades = false;
	
	// reactive statement to monitor backtestResult changes
	$: {
	}
	
	let hasLoadedBacktestSettings = false;
	
	// 認証済みユーザーの設定を一回だけ読み込み
	$: if ($isAuthenticated && $userSettings && $userSettings.backtestSettings && !hasLoadedBacktestSettings) {
		backtestSettings = { ...$userSettings.backtestSettings };
		hasLoadedBacktestSettings = true;
	}
	
	// 認証状態が変わったら設定読み込みフラグをリセット
	$: if (!$isAuthenticated) {
		hasLoadedBacktestSettings = false;
	}
	
	// バックテスト設定保存（デバウンス付き）
	let backtestSaveTimeoutId: number | null = null;
	
	function saveBacktestSettings() {
		if (!$isAuthenticated || !$userSettings || !hasLoadedBacktestSettings) return;
		
		if (backtestSaveTimeoutId) {
			clearTimeout(backtestSaveTimeoutId);
		}
		
		backtestSaveTimeoutId = window.setTimeout(() => {
			const updatedSettings = {
				...$userSettings,
				backtestSettings
			};
			authService.saveSettings(updatedSettings);
			backtestSaveTimeoutId = null;
		}, 500);
	}
	
	function onBacktestSettingsChange() {
		if (hasLoadedBacktestSettings) {
			saveBacktestSettings();
		}
	}

	function runBacktestAnalysis() {
		
		if (data.length === 0 || divergences.length === 0) {
			alert('データまたはダイバージェンスが不足しています');
			return;
		}

		isRunning = true;
		
		try {
			const result = runBacktest(data, divergences, backtestSettings);
			
			// 結果を親コンポーネントに通知
			onBacktestResult(result);
			
			// ローカル状態を更新
			backtestResult = result;
		} catch (error) {
			console.error('Backtest error:', error);
			alert('バックテストでエラーが発生しました: ' + error);
		} finally {
			isRunning = false;
		}
	}

	function formatDateTime(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Tokyo'  // 明示的に日本時間を指定
		});
	}

	function getTradeResultClass(trade: Trade): string {
		if (trade.status !== 'closed' || !trade.pnl) return '';
		return trade.pnl > 0 ? 'profit' : 'loss';
	}

	function getTradeResultIcon(trade: Trade): string {
		if (trade.status !== 'closed') return '⏳';
		if (!trade.pnl) return '❓';
		return trade.pnl > 0 ? '✅' : '❌';
	}
</script>

<div class="backtest-panel">
	<div class="panel-header">
		<h3>📊 バックテスト分析</h3>
		<div class="header-info">
			検出ダイバージェンス: {divergences.length}個 | データ期間: {data.length}本
		</div>
	</div>

	<div class="settings-section">
		<h4>取引設定</h4>
		<div class="settings-grid">
			<div class="setting-item">
				<label for="stopLoss">損切り (pips):</label>
				<input id="stopLoss" type="number" bind:value={backtestSettings.stopLossPips} min="1" max="100" on:input={onBacktestSettingsChange} />
			</div>
			<div class="setting-item">
				<label for="takeProfit">利確 (pips):</label>
				<input id="takeProfit" type="number" bind:value={backtestSettings.takeProfitPips} min="1" max="200" on:input={onBacktestSettingsChange} />
			</div>
			<div class="setting-item">
				<label for="balance">初期残高 (円):</label>
				<input id="balance" type="number" bind:value={backtestSettings.initialBalance} step="10000" min="10000" on:input={onBacktestSettingsChange} />
			</div>
			<div class="setting-item">
				<label for="positionSize">ポジションサイズ (ロット):</label>
				<input id="positionSize" type="number" bind:value={backtestSettings.positionSize} step="0.1" min="0.1" max="10" on:input={onBacktestSettingsChange} />
			</div>
		</div>
		
		<div class="action-section">
			<button class="run-backtest-btn" on:click={runBacktestAnalysis} disabled={isRunning || data.length === 0 || divergences.length === 0}>
				{isRunning ? '分析中...' : '🚀 バックテスト実行'}
			</button>
		</div>
	</div>

	{#if backtestResult}
		<div class="results-section">
			<h4>📈 結果サマリー</h4>
			<div class="summary-grid">
				<div class="summary-item">
					<span class="label">総取引数</span>
					<span class="value">{backtestResult.totalTrades}</span>
				</div>
				<div class="summary-item">
					<span class="label">勝率</span>
					<span class="value {backtestResult.winRate >= 60 ? 'good' : backtestResult.winRate >= 50 ? 'neutral' : 'bad'}">{backtestResult.winRate.toFixed(1)}%</span>
				</div>
				<div class="summary-item">
					<span class="label">総損益</span>
					<span class="value {backtestResult.totalPnL >= 0 ? 'profit' : 'loss'}">{backtestResult.totalPnL.toFixed(0)}円</span>
				</div>
				<div class="summary-item">
					<span class="label">総pips</span>
					<span class="value {backtestResult.totalPips >= 0 ? 'profit' : 'loss'}">{backtestResult.totalPips.toFixed(1)}pips</span>
				</div>
				<div class="summary-item">
					<span class="label">最大DD</span>
					<span class="value {backtestResult.maxDrawdown <= 10 ? 'good' : backtestResult.maxDrawdown <= 20 ? 'neutral' : 'bad'}">{backtestResult.maxDrawdown.toFixed(1)}%</span>
				</div>
				<div class="summary-item">
					<span class="label">PF</span>
					<span class="value {backtestResult.profitFactor >= 2 ? 'good' : backtestResult.profitFactor >= 1 ? 'neutral' : 'bad'}">{backtestResult.profitFactor.toFixed(2)}</span>
				</div>
			</div>

			<div class="trades-section">
				<div class="trades-header">
					<h4>💼 取引履歴</h4>
					<button class="toggle-btn" on:click={() => showDetailedTrades = !showDetailedTrades}>
						{showDetailedTrades ? '簡略表示' : '詳細表示'}
					</button>
				</div>

				{#if showDetailedTrades}
					<div class="trades-list">
						{#each backtestResult.trades.filter(t => t.status === 'closed') as trade}
							<div class="trade-item {getTradeResultClass(trade)}">
								<div class="trade-header">
									<span class="trade-icon">{getTradeResultIcon(trade)}</span>
									<span class="trade-type">{trade.type === 'long' ? 'ロング' : 'ショート'}</span>
									<span class="trade-result">{trade.pips?.toFixed(1)}pips ({trade.pnl?.toFixed(0)}円)</span>
								</div>
								<div class="trade-details">
									<div class="trade-time">
										エントリー: {formatDateTime(trade.entryTime)} → 
										決済: {trade.exitTime ? formatDateTime(trade.exitTime) : '未決済'}
									</div>
									<div class="trade-prices">
										{trade.entryPrice.toFixed(3)} → {trade.exitPrice?.toFixed(3) || '−'} 
										({trade.exitReason === 'profit' ? '利確' : trade.exitReason === 'loss' ? '損切' : '−'})
									</div>
									<div class="divergence-info">
										ダイバージェンス: {trade.divergence.type === 'bullish' ? 'ブリッシュ' : 'ベアリッシュ'} 
										({trade.divergence.strength})
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="trades-summary">
						勝ちトレード: {backtestResult.winningTrades} | 負けトレード: {backtestResult.losingTrades}
					</div>
				{/if}
			</div>
		</div>
	{:else if data.length === 0}
		<div class="no-data">
			<p>📊 データを読み込んでからバックテストを実行してください</p>
		</div>
	{:else if divergences.length === 0}
		<div class="no-data">
			<p>🔍 ダイバージェンスが検出されていません</p>
			<p class="hint">設定を調整してダイバージェンスを検出してください</p>
		</div>
	{/if}
</div>
