<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchRecentKlineData } from '$lib/api/gmoApiService';
	import type { KLineData } from '$lib/types/gmo';
	import CandlestickChart from '$lib/components/CandlestickChart.svelte';
	import RSIChart from '$lib/components/RSIChart.svelte';
	import Loading from '$lib/components/Loading.svelte';

	import type { Divergence } from '$lib/utils/divergence';
	import { detectTradingViewDivergence } from '$lib/utils/divergence';
	import { calculateRSI } from '$lib/utils/rsi';
	import { isAuthenticated, loading as authLoading } from '$lib/stores/supabaseAuth';


	let title: string = 'Trading View Tool';
	let showNotification: boolean = false;
	let klineData: KLineData[] = [];
	let loading: boolean = false;
	let error: string | null = null;
	let detectedDivergences: Divergence[] = [];
	let realtimeTimer: ReturnType<typeof setInterval> | null = null;
	let isInitialLoad: boolean = true; // 初回データ読み込みフラグ

	// デフォルト設定
	let symbol = 'USD_JPY';
	let interval = '5min';

	let parentRef;
	let parentWidth = 0;

	// チャートの参照
	let candlestickChart: any;
	let rsiChart: any;

	// 時間足に対応する更新間隔（ミリ秒）
	function getUpdateInterval(interval: string): number {
		const intervalMap: Record<string, number> = {
			'1min': 1 * 60 * 1000,    // 1分
			'5min': 5 * 60 * 1000,    // 5分
			'15min': 15 * 60 * 1000,  // 15分
			'30min': 30 * 60 * 1000,  // 30分
			'1hour': 60 * 60 * 1000,  // 1時間
			'4hour': 4 * 60 * 60 * 1000, // 4時間
			'1day': 24 * 60 * 60 * 1000  // 1日
		};
		return intervalMap[interval] || 5 * 60 * 1000; // デフォルトは5分
	}

	// タイマーを設定する関数
	function setupRealtimeTimer() {
		if (realtimeTimer) {
			clearInterval(realtimeTimer);
		}
		
		const updateInterval = getUpdateInterval(interval);
		realtimeTimer = setInterval(loadRealtimeData, updateInterval);
		
		console.log(`リアルタイム更新間隔: ${interval} = ${updateInterval / (60 * 1000)}分間隔`);
	}

	onMount(() => {
		const observer = new ResizeObserver(([entry]) => {
      parentWidth = entry.contentRect.width;
    });
    observer.observe(parentRef);

		if ($isAuthenticated) {
			// loadRealtimeData();
			setupRealtimeTimer();
		}

		return () => {
			if (realtimeTimer) {
				clearInterval(realtimeTimer);
			}
		};
	});

	async function loadRealtimeData() {
		if (!$isAuthenticated) return;
		
		loading = true;
		error = null;
		
		try {
			// RSI計算精度向上のため、表示期間+100本前からデータ取得
			const extendedData = await fetchRecentKlineData(symbol, interval, 300);
			console.log(`拡張データ取得: ${extendedData.length}本 (RSI計算精度向上のため)`);
			
			// 表示用データは最新200本
			const displayData = extendedData.slice(-200);
			klineData = displayData;
			console.log(`表示データ: ${displayData.length}本 (${symbol}, ${interval})`);
			
			// ダイバージェンス検出（詳細ログ付き）
			console.log('🔍 ダイバージェンス検出処理開始');
			console.log('データサンプル:', displayData.slice(-5).map(d => ({ time: d.openTime, close: d.close })));
			
			// RSI計算は拡張データで行い、表示期間分のみ取得
			const fullRsiData = calculateRSI(extendedData, 14);
			const rsiData = fullRsiData.slice(-200); // 表示期間に合わせて最新200個
			console.log(`RSIデータ: ${rsiData.length}個 (期間: 14)`);
			console.log('RSI直近5個:', rsiData.slice(-5));
			
			if (rsiData.length > 0) {
				// ダイバージェンス検出（表示データとRSIデータを使用）
				console.log('ダイバージェンス検出パラメータ:', {
					lookbackLeft: 2,
					lookbackRight: 2,
					rangeLower: 5,
					rangeUpper: 50
				});
				
				const divergences = detectTradingViewDivergence(
					displayData, // 表示用KLineData（最新200本）
					rsiData,     // 対応するRSIデータ（最新200個）
					2, // lookbackLeft
					2, // lookbackRight
					5, // rangeLower
					50 // rangeUpper
				);
				
				console.log(`ダイバージェンス検出結果: ${divergences.length}個`);
				if (divergences.length > 0) {
					console.log('検出されたダイバージェンス詳細:', divergences);
					
					if (isInitialLoad) {
						console.log('🔕 初回データ読み込み - 通知はスキップします');
						// 初回読み込み時は既存のダイバージェンスとして記録するが通知はしない
						detectedDivergences = [...divergences];
					} else {
						console.log(`🎯 リアルタイムダイバージェンス検出: ${divergences.length}個`);
						handleDivergenceDetected(divergences);
					}
				} else {
					console.log('❌ ダイバージェンス未検出');
				}
			} else {
				console.log('❌ RSIデータが不足（期間14に対してデータ不足）');
			}
			
			// チャート同期
			setTimeout(() => {
				syncChartTimeScales();
			}, 1000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'リアルタイムデータの取得に失敗しました';
			console.error('リアルタイムデータ取得エラー:', err);
		} finally {
			loading = false;
			// 初回読み込み完了後はフラグを更新
			if (isInitialLoad) {
				isInitialLoad = false;
				console.log('🔄 初回読み込み完了 - 以降はリアルタイム通知が有効になります');
			}
		}
	}

	// チャート間の時間軸を同期する関数
	function syncChartTimeScales() {
		if (candlestickChart && rsiChart) {
			const mainChart = candlestickChart.getChart();
			const rsiChartInstance = rsiChart.getChart();
			
			if (mainChart && rsiChartInstance) {
				console.log('Synchronizing chart time scales...');
				
				// リアルタイム表示用に右端まで表示されるように調整
				try {
					// scrollToRealTimeを使って最新データまで表示
					if (mainChart.timeScale().scrollToRealTime) {
						mainChart.timeScale().scrollToRealTime();
						rsiChartInstance.timeScale().scrollToRealTime();
						console.log('Charts scrolled to real-time position');
					} else {
						// フォールバック: fitContentを使用
						mainChart.timeScale().fitContent();
						rsiChartInstance.timeScale().fitContent();
						
						setTimeout(() => {
							// 右端に余白を追加
							const currentRange = mainChart.timeScale().getVisibleLogicalRange();
							if (currentRange && klineData.length > 0) {
								const dataLength = klineData.length;
								const padding = Math.max(3, Math.floor(dataLength * 0.08)); // 8%または最低3本分の余白
								
								const adjustedRange = {
									from: Math.max(0, currentRange.from),
									to: dataLength - 1 + padding
								};
								
								mainChart.timeScale().setVisibleLogicalRange(adjustedRange);
								rsiChartInstance.timeScale().setVisibleLogicalRange(adjustedRange);
								
								console.log(`Chart range adjusted with padding: ${padding} bars`);
							}
						}, 100);
					}
				} catch (error) {
					console.warn('Chart positioning error:', error);
					// 最終フォールバック
					mainChart.timeScale().fitContent();
					rsiChartInstance.timeScale().fitContent();
				}
				
				setTimeout(() => {
					// 同期リスナーを設定
					if (!mainChart._syncListenerAdded) {
						mainChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
							if (range) {
								rsiChartInstance.timeScale().setVisibleLogicalRange(range);
							}
						});
						mainChart._syncListenerAdded = true;
					}
					
					if (!rsiChartInstance._syncListenerAdded) {
						rsiChartInstance.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
							if (range) {
								mainChart.timeScale().setVisibleLogicalRange(range);
							}
						});
						rsiChartInstance._syncListenerAdded = true;
					}
					
					console.log('Chart time scales synchronized successfully with proper positioning');
				}, 500);
			}
		}
	}

	// データが変更されたときにも同期を実行
	$: if (klineData.length > 0 && candlestickChart && rsiChart) {
		setTimeout(() => {
			syncChartTimeScales();
		}, 500);
	}

	// ダイバージェンス検出時のハンドラー
	async function handleDivergenceDetected(divergences: Divergence[]) {
		const newDivergences = divergences.filter(d => 
			!detectedDivergences.some(existing => existing.id === d.id)
		);
		
		if (newDivergences.length > 0) {
			detectedDivergences = [...detectedDivergences, ...newDivergences];
			showNotification = true;
			
			// 通知を自動で閉じる
			setTimeout(() => {
				showNotification = false;
			}, 5000);
			
			// ブラウザ通知（許可されている場合）
			if ('Notification' in window && Notification.permission === 'granted') {
				new Notification('ダイバージェンス検出!', {
					body: `${newDivergences.length}個の新しいダイバージェンスが検出されました`,
					icon: '/favicon.ico'
				});
			}

			// LINE通知を送信（一旦コメントアウト）
			// console.log('🔔 ダイバージェンス検出によるLINE通知処理開始');
			// console.log('検出されたダイバージェンス:', newDivergences);
		}
	}

	// 通貨ペア変更
	function changeSymbol(newSymbol: string) {
		symbol = newSymbol;
		isInitialLoad = true; // 通貨ペア変更時も初回読み込み扱い
		detectedDivergences = []; // 既存のダイバージェンスをクリア
		loadRealtimeData();
	}

	// 時間足変更
	function changeInterval(newInterval: string) {
		interval = newInterval;
		isInitialLoad = true; // 時間足変更時も初回読み込み扱い
		detectedDivergences = []; // 既存のダイバージェンスをクリア
		loadRealtimeData();
		setupRealtimeTimer(); // 新しい間隔でタイマーを再設定
	}

	// LINE通知テスト機能（一旦無効化）
	// async function testLineNotification() {
	// 	console.log('🧪 LINE通知テスト開始');
	// 	
	// 	try {
	// 		const testMessage = `🧪 LINE通知テスト\n\n📊 通貨ペア: ${symbol}\n⏰ 時間足: ${interval}\n🕒 テスト時刻: ${new Date().toLocaleString('ja-JP')}\n\n✅ LINE通知機能が正常に動作しています！`;
	// 		
	// 		console.log('送信するテストメッセージ:', testMessage);
	// 		
	// 		const response = await fetch('/api/line/test-direct', {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': 'application/json',
	// 			},
	// 			body: JSON.stringify({
	// 				message: testMessage
	// 			})
	// 		});
	// 		
	// 		const responseData = await response.json();
	// 		console.log('テスト通知レスポンス:', responseData);
	// 		
	// 		if (response.ok && responseData.success) {
	// 			console.log('✅ LINE通知テスト成功!');
	// 			alert('LINE通知テストを送信しました。LINEをご確認ください。');
	// 		} else {
	// 			console.error('❌ LINE通知テスト失敗:', responseData.error);
	// 			alert(`LINE通知テスト失敗: ${responseData.error || 'Unknown error'}`);
	// 		}
	// 	} catch (error) {
	// 		console.error('❌ LINE通知テストでエラー:', error);
	// 		alert(`LINE通知テストでエラー: ${error instanceof Error ? error.message : String(error)}`);
	// 	}
	// }
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>




<div>
	<!-- ダイバージェンス通知 -->
	{#if showNotification}
	<div class="bg-success-500/20 border border-success-500/30 text-success-300 p-4 rounded-lg mb-4 relative">
		新しいダイバージェンスが検出されました！ 詳細は下記をご確認ください。
		<button class="absolute top-2 right-2 text-success-300 hover:text-success-100 text-xl" on:click={() => showNotification = false}>×</button>
	</div>
	{/if}

	<div bind:this={parentRef}>
		<h2 class="text-2xl font-bold text-primary-400 mb-7">リアルタイムチャート - {symbol} ({interval})</h2>
		
		<div class="flex items-center justify-end mb-5">
			<div class="text-surface-300 mr-4 text-sm">
				{#if loading}
					読み込み中...
				{:else}
					{interval}間隔で自動更新
				{/if}
			</div>
			<select bind:value={symbol} on:change={() => changeSymbol(symbol)} class="px-3 py-2 text-white max-w-32 mr-4 select">
				<option value="USD_JPY">USD/JPY</option>
				<option value="EUR_JPY">EUR/JPY</option>
				<option value="GBP_JPY">GBP/JPY</option>
				<option value="AUD_JPY">AUD/JPY</option>
				<option value="EUR_USD">EUR/USD</option>
			</select>
			<select bind:value={interval} on:change={() => changeInterval(interval)} class="px-3 py-2 text-white max-w-32 select">
				<option value="1min">1分足</option>
				<option value="5min">5分足</option>
				<option value="15min">15分足</option>
				<option value="30min">30分足</option>
				<option value="1hour">1時間足</option>
			</select>
		
			<!-- LINE通知テストボタン（一旦非表示） -->
			<!-- <button class="test-notification-btn" on:click={testLineNotification}>
				📱 LINE通知テスト
			</button> -->
		</div>

		{#if loading && klineData.length === 0}
			<div class="bg-surface-800 rounded-lg h-80 flex items-center justify-center text-surface-300 bg-opacity-50"><Loading /></div>
		{:else if error}
			<div class="bg-error-500 border border-error-500 text-error-300 p-4 rounded-lg bg-opacity-20 border-opacity-30">エラー: {error}</div>
		{:else if klineData.length > 0}
			<!-- チャート表示 -->
			<div class="chart-section">
				<CandlestickChart 
					bind:this={candlestickChart}
					data={klineData} 
					width={parentWidth > 500 ? parentWidth: 500} 
					height={400} 
					syncTimeScale={false}
				/>
			</div>
			
			<!-- RSIチャート表示 -->
			<div class="chart-section">
				<RSIChart 
					bind:this={rsiChart}
					data={klineData} 
					width={parentWidth > 500 ? parentWidth: 500} 
					height={300} 
					period={14}
					lookbackLeft={2}
					lookbackRight={2}
					rangeLower={5}
					rangeUpper={50}
					syncTimeScale={false}
				/>
			</div>

			<!-- ダイバージェンス検出履歴 -->
			<!-- {#if detectedDivergences.length > 0}
				<div class="divergence-history">
					<h3>🎯 検出されたダイバージェンス</h3>
					<div class="divergence-list">
						{#each detectedDivergences.slice(-5) as divergence}
							<div class="divergence-item {divergence.type}">
								<div class="divergence-type">
									{divergence.type === 'bullish' ? '📈 強気' : '📉 弱気'}ダイバージェンス
								</div>
								<div class="divergence-details">
									強度: {divergence.strength || 'medium'}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if} -->
		{:else}
			<div class="bg-surface-800 rounded-lg h-80 flex items-center justify-center text-surface-300 bg-opacity-50">データがありません</div>
		{/if}

	</div>
</div>
	

