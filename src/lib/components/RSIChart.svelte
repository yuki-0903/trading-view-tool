<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createChart } from 'lightweight-charts';
	import type { KLineData } from '../types/gmo';
	import { calculateRSI, type RSIData } from '../utils/rsi';
	import { analyzeDivergence, type Divergence, type Peak } from '../utils/divergence';

	export let data: KLineData[] = [];
	export let extendedData: KLineData[] = []; // RSI計算用の拡張データ
	export let width: number = 800;
	export let height: number = 200;
	export let period: number = 14;
	export let lookbackLeft: number = 3;
	export let lookbackRight: number = 3;
	export let rangeLower: number = 3;
	export let rangeUpper: number = 25;
	export let syncTimeScale: boolean = true;

	let chartContainer: HTMLDivElement;
	let chart: any = null;
	let rsiSeries: any = null;
	let overboughtLine: any = null;
	let oversoldLine: any = null;
	let centerLine: any = null;
	let divergenceMarkers: any[] = [];
	let divergenceLines: any[] = [];
	
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

	onMount(() => {
		if (chartContainer) {
			// RSIチャートを作成
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
						top: 0.05,
						bottom: 0.05,
					},
					entireTextOnly: false,
					autoScale: false, // RSIは常に10-90の範囲で表示
					mode: 0, // Normal scaling mode
					min: 10,
					max: 90,
					minimumWidth: 60,
					invertScale: false,
				},
				leftPriceScale: {
					visible: false,
				},
			});

			// RSIラインシリーズを追加
			rsiSeries = chart.addLineSeries({
				color: '#cccccc',
				lineWidth: 2,
				priceFormat: {
					type: 'custom',
					minMove: 0.01,
					formatter: (price: number) => price.toFixed(2),
				},
			});

			// 買われすぎライン（70）を追加
			overboughtLine = chart.addLineSeries({
				color: '#f44336',
				lineWidth: 1,
				lineStyle: 2, // dashed
				lastValueVisible: false,
				priceLineVisible: false,
			});

			// 売られすぎライン（30）を追加
			oversoldLine = chart.addLineSeries({
				color: '#4caf50',
				lineWidth: 1,
				lineStyle: 2, // dashed
				lastValueVisible: false,
				priceLineVisible: false,
			});

			// 中央ライン（50）を追加
			centerLine = chart.addLineSeries({
				color: '#757575',
				lineWidth: 1,
				lineStyle: 1, // dotted
				lastValueVisible: false,
				priceLineVisible: false,
			});

			// 初期データがある場合は設定
			updateRSIData();
		}
	});

	onDestroy(() => {
		if (chart) {
			chart.remove();
		}
	});

	function updateRSIData() {
		if (rsiSeries && data.length > period) {
			
			// RSI計算用データを決定（拡張データがあれば使用、なければ表示データ）
			const calculationData = extendedData.length > 0 ? extendedData : data;
			
			// RSIを拡張データで計算
			const fullRsiData = calculateRSI(calculationData, period);
			
			// 表示期間に対応するRSIデータを抽出
			let displayRsiData: RSIData[];
			if (extendedData.length > 0 && extendedData.length > data.length) {
				// 拡張データから表示データに相当する部分を取得
				displayRsiData = fullRsiData.slice(-(data.length));
			} else {
				displayRsiData = fullRsiData;
			}
			
			
			// ダイバージェンス分析を実行（表示データと事前計算RSIデータを使用）
			const analysis = analyzeDivergence(
				data,           // 表示用価格データ
				period,
				lookbackLeft,
				lookbackRight,
				rangeLower,
				rangeUpper,
				displayRsiData  // 事前計算されたRSIデータ
			);
			
			
			// 表示用RSIデータを使用
			const rsiData = displayRsiData;
			const divergences = analysis.divergences;
			const peaks = analysis.peaks;


			if (rsiData.length > 0) {
				
				// RSIラインにデータを設定
				rsiSeries.setData(rsiData);

				// 水平ラインの設定（10-90の範囲全体をカバー）
				const timeRange = [rsiData[0].time, rsiData[rsiData.length - 1].time];
				
				// 70ライン（買われすぎ）
				overboughtLine.setData([
					{ time: timeRange[0], value: 70 },
					{ time: timeRange[1], value: 70 }
				]);

				// 30ライン（売られすぎ）
				oversoldLine.setData([
					{ time: timeRange[0], value: 30 },
					{ time: timeRange[1], value: 30 }
				]);

				// 50ライン（中央）
				centerLine.setData([
					{ time: timeRange[0], value: 50 },
					{ time: timeRange[1], value: 50 }
				]);

				// 10-90の範囲を確保するためのダミーデータ（透明）
				const rangeSeries = chart.addLineSeries({
					color: 'transparent',
					lineWidth: 0,
					lastValueVisible: false,
					priceLineVisible: false,
					visible: false
				});
				rangeSeries.setData([
					{ time: timeRange[0], value: 10 },
					{ time: timeRange[1], value: 90 }
				]);

				// ダイバージェンスマーカーとラインを追加（全てのダイバージェンス）
				addDivergenceMarkersAndLines(divergences, peaks);

				// Y軸スケールを10-90に強制固定
				setTimeout(() => {
					chart.priceScale('right').applyOptions({
						autoScale: false,
						mode: 0,
						min: 10,
						max: 90,
						scaleMargins: {
							top: 0.05,
							bottom: 0.05,
						}
					});
				}, 100);

				if (chart && syncTimeScale) {
					chart.timeScale().fitContent();
				}
			}
		}
	}

	function addDivergenceMarkersAndLines(divergences: Divergence[], peaks: Peak[]) {		
		if (!divergences || divergences.length === 0) {
			return;
		}
		
		if (!chart) {
			return;
		}
		
		// 既存のマーカーとラインをクリア
		clearDivergenceDisplay();

		// 全てのピークをマーカーとして表示（非表示）
		// const highPeaks = peaks.filter(p => p.type === 'high');
		// const lowPeaks = peaks.filter(p => p.type === 'low');

		// // 高値ピーク（赤）
		// if (highPeaks.length > 0) {
		// 	const highSeries = chart.addLineSeries({
		// 		color: '#f44336',
		// 		lineWidth: 0,
		// 		pointMarkersVisible: true,
		// 		lastValueVisible: false,
		// 		priceLineVisible: false,
		// 		crosshairMarkerVisible: true,
		// 	});
		// 	highSeries.setData(highPeaks.map(peak => ({
		// 		time: peak.time,
		// 		value: peak.rsi
		// 	})));
		// 	divergenceMarkers.push(highSeries);
		// }

		// // 安値ピーク（緑）
		// if (lowPeaks.length > 0) {
		// 	const lowSeries = chart.addLineSeries({
		// 		color: '#4caf50',
		// 		lineWidth: 0,
		// 		pointMarkersVisible: true,
		// 		lastValueVisible: false,
		// 		priceLineVisible: false,
		// 		crosshairMarkerVisible: true,
		// 	});
		// 	lowSeries.setData(lowPeaks.map(peak => ({
		// 		time: peak.time,
		// 		value: peak.rsi
		// 	})));
		// 	divergenceMarkers.push(lowSeries);
		// }

		// ダイバージェンスを2点を結ぶ線として表示
		divergences.forEach((divergence, index) => {
			
			// 各ダイバージェンスの開始点と終了点
			const startPoint = { time: divergence.rsiStart.time, value: divergence.rsiStart.rsi };
			const endPoint = { time: divergence.rsiEnd.time, value: divergence.rsiEnd.rsi };
			
			// 強度と種類に応じた色と線の太さを決定
			let color = '#0066ff';
			let lineWidth = 2;
			let lineStyle = 0; // 実線
			
			if (divergence.type === 'bullish') {
				if (divergence.strength === 'strong') {
					color = '#4caf50'; // 強気・強
					lineWidth = 4;
					lineStyle = 0; // 実線
				} else if (divergence.strength === 'medium') {
					color = '#66bb6a'; // 強気・中
					lineWidth = 3;
					lineStyle = 0; // 実線
				} else {
					color = '#81c784'; // 強気・弱
					lineWidth = 2;
					lineStyle = 0; // 実線
				}
			} else {
				if (divergence.strength === 'strong') {
					color = '#f44336'; // 弱気・強
					lineWidth = 4;
					lineStyle = 0; // 実線
				} else if (divergence.strength === 'medium') {
					color = '#ef5350'; // 弱気・中
					lineWidth = 3;
					lineStyle = 0; // 実線
				} else {
					color = '#e57373'; // 弱気・弱
					lineWidth = 2;
					lineStyle = 0; // 実線
				}
			}
			
			// 2点を結ぶ線として追加
			const divergenceSeries = chart.addLineSeries({
				color: color,
				lineWidth: lineWidth,
				lineStyle: lineStyle,
				lastValueVisible: false,
				priceLineVisible: false,
				crosshairMarkerVisible: true,
			});
			divergenceSeries.setData([startPoint, endPoint]);
			divergenceLines.push(divergenceSeries);
			
		});
	}

	function clearDivergenceDisplay() {
		// マーカーシリーズをクリア
		divergenceMarkers.forEach(marker => {
			if (chart && marker) {
				chart.removeSeries(marker);
			}
		});
		divergenceMarkers = [];

		// ダイバージェンスラインをクリア
		divergenceLines.forEach(line => {
			if (chart && line) {
				chart.removeSeries(line);
			}
		});
		divergenceLines = [];
	}

	// データまたは設定が変更された時にRSIを更新
	$: if (rsiSeries && data.length > period) {
		updateRSIData();
	}
	
	// 設定変更時も再分析
	$: if (rsiSeries && data.length > period && (lookbackLeft || lookbackRight || rangeLower || rangeUpper)) {
		updateRSIData();
	}
</script>

<div class="chart-container">

	<div bind:this={chartContainer} class="chart"></div>
	<div class="chart-footer">
		<div class="rsi-legend">
			<!-- <span class="legend-item oversold">● 売られすぎ (≤30)</span>
			<span class="legend-item neutral">● 中立 (30-70)</span>
			<span class="legend-item overbought">● 買われすぎ (≥70)</span> -->
			<span class="legend-item divergence-bullish-strong">━ 📈強気(強)</span>
			<span class="legend-item divergence-bullish-medium">━ 📈強気(中)</span>
			<span class="legend-item divergence-bullish-weak">━ 📈強気(弱)</span>
			<span class="legend-item divergence-bearish-strong">━ 📉弱気(強)</span>
			<span class="legend-item divergence-bearish-medium">━ 📉弱気(中)</span>
			<span class="legend-item divergence-bearish-weak">━ 📉弱気(弱)</span>
		</div>
	</div>
	<div class="chart-header">
		<h4>RSI ({period}) - 全ダイバージェンス表示</h4>
	</div>
</div>

<style>

	.chart-header {
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.chart-footer {
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	h4 {
		margin: 0;
		color: #333;
		font-size: 1rem;
		font-weight: 600;
	}

	.rsi-legend {
		display: flex;
		gap: 1rem;
		font-size: 0.85rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.legend-item.oversold {
		color: #4caf50;
	}

	.legend-item.neutral {
		color: #cccccc;
	}

	.legend-item.overbought {
		color: #f44336;
	}

	.legend-item.divergence-bullish-strong {
		color: #4caf50;
		font-weight: bold;
	}

	.legend-item.divergence-bullish-medium {
		color: #66bb6a;
	}

	.legend-item.divergence-bullish-weak {
		color: #81c784;
	}

	.legend-item.divergence-bearish-strong {
		color: #f44336;
		font-weight: bold;
	}

	.legend-item.divergence-bearish-medium {
		color: #ef5350;
	}

	.legend-item.divergence-bearish-weak {
		color: #e57373;
	}

	.chart {
		width: 100%;
		height: 100%;
		display: block;
		position: relative;
	}

	:global(.rsi-chart-container .chart .tv-lightweight-charts) {
		width: 100% !important;
		height: 100% !important;
		display: block !important;
		border-radius: 0 !important;
		overflow: hidden !important;
	}

	:global(.rsi-chart-container .chart canvas) {
		display: block !important;
		border-radius: 0 !important;
	}

	/* RSIチャートのテーブルレイアウト調整 */
	:global(.rsi-chart-container .chart table) {
		width: 100% !important;
		table-layout: fixed !important;
	}

	/* RSI Y軸（価格軸）のtd幅を制限 */
	:global(.rsi-chart-container .chart table td:last-child) {
		width: 60px !important;
		max-width: 60px !important;
		min-width: 50px !important;
	}

	/* RSI チャート部分のtd幅を最大化 */
	:global(.rsi-chart-container .chart table td:first-child) {
		width: calc(100% - 60px) !important;
	}
</style>