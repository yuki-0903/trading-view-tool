<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createChart, type IChartApi } from 'lightweight-charts';
	import type { KLineData } from '../types/gmo';
	import type { Trade } from '../utils/backtest';

	export let data: KLineData[] = [];
	export let width: number = 800;
	export let height: number = 400;
	export let syncTimeScale: boolean = true;
	export let trades: Trade[] = [];

	let chartContainer: HTMLDivElement;
	let chart: IChartApi | null = null;
	let candlestickSeries: any = null;
	let tradeMarkerSeries: any[] = [];
	
	// チャートのAPIを外部から参照できるようにエクスポート
	export function getChart() {
		return chart;
	}
	
	// 時間軸を同期する関数
	export function syncTimeScaleWith(targetRange: any) {
		if (chart && targetRange) {
			chart.timeScale().setVisibleRange(targetRange);
		}
	}

	// トレードマーカーをクリアする関数
	function clearTradeMarkers() {
		if (candlestickSeries) {
			candlestickSeries.setMarkers([]);
		}
		tradeMarkerSeries.forEach(series => {
			if (chart && series) {
				chart.removeSeries(series);
			}
		});
		tradeMarkerSeries = [];
	}

	// トレードマーカーを追加する関数
	function addTradeMarkers() {
		if (!chart || trades.length === 0) return;

		// 既存のマーカーをクリア
		clearTradeMarkers();

		// 全てのマーカーを一つの配列に集約
		const allMarkers: any[] = [];

		trades.forEach(trade => {
			if (trade.status === 'closed') {
				// エントリーマーカー
				if (trade.type === 'long') {
					allMarkers.push({
						time: trade.entryTime,
						position: 'belowBar',
						color: '#28a745',
						shape: 'arrowUp',
						text: 'Long'
					});
				} else {
					allMarkers.push({
						time: trade.entryTime,
						position: 'aboveBar',
						color: '#dc3545',
						shape: 'arrowDown',
						text: 'Short'
					});
				}

				// 決済マーカー
				if (trade.exitReason === 'profit') {
					allMarkers.push({
						time: trade.exitTime,
						position: 'inBar',
						color: '#007bff',
						shape: 'circle',
						text: '利確'
					});
				} else if (trade.exitReason === 'loss') {
					allMarkers.push({
						time: trade.exitTime,
						position: 'inBar',
						color: '#fd7e14',
						shape: 'circle',
						text: '損切'
					});
				}
			}
		});

		// マーカーを時間順にソート
		allMarkers.sort((a, b) => a.time - b.time);

		// ローソク足シリーズにマーカーを設定
		if (candlestickSeries && allMarkers.length > 0) {
			candlestickSeries.setMarkers(allMarkers);
		}
	}

	onMount(() => {
		if (chartContainer) {
			// チャートを作成
			chart = createChart(chartContainer, {
				width: width,
				height: height,
				layout: {
					background: { color: 'transparent' },
					textColor: '#383838',
				},
				grid: {
					vertLines: { color: '#181818' },
					horzLines: { color: '#181818' },
				},
				timeScale: {
					borderColor: '#383838',
					timeVisible: true,
					secondsVisible: false,
				},
				rightPriceScale: {
					borderColor: '#383838',
					visible: true,
					scaleMargins: {
						top: 0.02,
						bottom: 0.02,
					},
					entireTextOnly: false,
					autoScale: true,
					minimumWidth: 60,
				},
				leftPriceScale: {
					visible: false,
				},
			});
			// ローソク足シリーズを追加
			candlestickSeries = chart.addCandlestickSeries({
				upColor: '#26a69a',
				downColor: '#ef5350',
				borderVisible: false,
				wickUpColor: '#26a69a',
				wickDownColor: '#ef5350',
			})



			// 初期データがある場合は設定
			updateChartData();
		}
	});

	onDestroy(() => {
		if (chart) {
			chart.remove();
		}
	});

	function updateChartData() {
		if (candlestickSeries && data.length > 0) {
			const chartData = data.map((item, index) => {
				// GMO APIのopenTimeはミリ秒のタイムスタンプ（UTC）
				const utcTimestamp = parseInt(item.openTime);
				// JST = UTC + 9時間（9 * 60 * 60 * 1000 = 32400000ミリ秒）
				const jstTimestamp = utcTimestamp + (9 * 60 * 60 * 1000);
				
				return {
					time: Math.floor(jstTimestamp / 1000), // Lightweight Chartsは秒単位
					open: parseFloat(item.open),
					high: parseFloat(item.high),
					low: parseFloat(item.low),
					close: parseFloat(item.close),
				};
			});

			candlestickSeries.setData(chartData);
			
			// トレードマーカーを追加
			addTradeMarkers();
			
			if (chart && syncTimeScale) {
				chart.timeScale().fitContent();
			}
		}
	}

	// データが変更された時にチャートを更新
	$: if (candlestickSeries && data.length > 0) {
		updateChartData();
	}
	
	// トレードデータが変更された時にマーカーを更新
	$: if (candlestickSeries && trades.length >= 0) {
		addTradeMarkers();
	}
</script>

<div class="chart-container">
	<div bind:this={chartContainer} class="chart"></div>
	{#if trades.length > 0}
		<div class="py-3">
			<div class="legend-items justify-center">
				<span class="legend-item">
					<span class="marker long-entry">↑</span> ロングエントリー
				</span>
				<span class="legend-item">
					<span class="marker short-entry">↓</span> ショートエントリー
				</span>
				<span class="legend-item">
					<span class="marker profit-exit">●</span> 利確決済
				</span>
				<span class="legend-item">
					<span class="marker loss-exit">●</span> 損切決済
				</span>
			</div>
		</div>
	{/if}
</div>

<style>

	.chart {
		width: 100%;
		height: 100%;
		display: block;
		position: relative;
	}

	:global(.chart .tv-lightweight-charts) {
		width: 100% !important;
		height: 100% !important;
		display: block !important;
		border-radius: 0 !important;
		overflow: hidden !important;
	}

	:global(.chart canvas) {
		display: block !important;
		border-radius: 0 !important;
	}

	/* テーブルレイアウトの調整 */
	:global(.chart table) {
		width: 100% !important;
		table-layout: fixed !important;
	}

	/* Y軸（価格軸）のtd幅を制限 */
	:global(.chart table td:last-child) {
		width: 60px !important;
		max-width: 60px !important;
		min-width: 50px !important;
	}

	/* チャート部分のtd幅を最大化 */
	:global(.chart table td:first-child) {
		width: calc(100% - 60px) !important;
	}

	.trade-legend {
		background: #f8f9fa;
		padding: 0.75rem 1rem;
		border-top: 1px solid #e1e1e1;
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.85rem;
	}

	.legend-header {
		font-weight: 600;
		color: #333;
	}

	.legend-items {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #666;
	}

	.marker {
		font-size: 1.2rem;
	}

	.marker.long-entry {
		color: #28a745;
	}

	.marker.short-entry {
		color: #dc3545;
	}

	.marker.profit-exit {
		color: #007bff;
	}

	.marker.loss-exit {
		color: #fd7e14;
	}
</style>