<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { fetchRecentKlineData, fetchRangeKlineData, fetchGmoApi } from '$lib/api/gmoApiService';
	import type { KLineData } from '$lib/types/gmo';
	import CandlestickChart from '$lib/components/CandlestickChart.svelte';
	import RSIChart from '$lib/components/RSIChart.svelte';
	import DivergencePanel from '$lib/components/DivergencePanel.svelte';
	import TestAnalysisPanel from '$lib/components/TestAnalysisPanel.svelte';
	import type { Divergence } from '$lib/utils/divergence';
	import { isAuthenticated, userSettings, supabaseAuthService, type UserSettings } from '$lib/stores/supabaseAuth';
	
	let title: string = 'Trading View Tool - テスト分析';
	let klineData: KLineData[] = [];
	let globalExtendedData: KLineData[] = []; // RSI計算用拡張データ
	let loading: boolean = false;
	let error: string | null = null;
	let detectedDivergences: Divergence[] = [];
	let allDivergences: Divergence[] = [];
	let showNotification: boolean = false;
	let backtestTrades: any[] = [];
	let chartData: any[] = []; // チャート用に変換済みのデータ（時間含む）
	let dataCache: Map<string, {data: KLineData[], timestamp: number}> = new Map();
	let divergenceSettings = {
		lookback: 2,        // ピーク検出の前後期間（バー数）
		minRange: 2,        // 最小バー距離（バー数）
		maxRange: 15        // 最大バー距離（バー数）
	};
	
	// デフォルトで過去2日間を設定（当日の1日前から2日分）
	const today = new Date();
	const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
	const minDate = new Date('2023-10-28');
	const actualStartDate = twoDaysAgo < minDate ? minDate : twoDaysAgo;
	
	let dataSettings = {
		symbol: 'USD_JPY',
		interval: '1hour',
		fromDate: actualStartDate.toISOString().split('T')[0],  // YYYY-MM-DD形式
		toDate: today.toISOString().split('T')[0]              // YYYY-MM-DD形式
	};
	
	// チャートの参照
	let candlestickChart: any;
	let rsiChart: any;

	let parentRef;
	let parentWidth = 0;
	
	// ドラッグ可能パネル用の変数
	let draggablePanel: HTMLElement;
	let isMinimized = false;
	let isDragging = false;
	let dragOffset = { x: 0, y: 0 };
	
	// データ取得パネルの折りたたみ状態
	let isDataPanelCollapsed = true;
	
	// 日付ごとのキャッシュキーを生成
	function generateDailyCacheKey(symbol: string, interval: string, date: string): string {
		return `${symbol}_${interval}_${date}`;
	}
	
	// キャッシュの有効期限（5分）
	const CACHE_DURATION = 5 * 60 * 1000;
	
	// 当日データかどうかを判定（朝6:00から翌日6:00まで）
	function isCurrentDay(fromDate: string, toDate: string): boolean {
		const now = new Date();
		
		// 現在の日本時間での当日を計算（朝6:00基準）
		const today = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // JST
		const currentHour = today.getHours();
		
		// もし現在時刻が6時より前なら、前日の6時から始まる
		if (currentHour < 6) {
			today.setDate(today.getDate() - 1);
		}
		
		// 当日の朝6:00
		const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0);
		// 翌日の朝6:00
		const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
		
		const fromDateTime = new Date(fromDate).getTime();
		const toDateTime = new Date(toDate).getTime() + 24 * 60 * 60 * 1000; // 終了日の23:59:59まで
		
		// 期間が当日の範囲と重複するかチェック
		return (fromDateTime < todayEnd.getTime()) && (toDateTime > todayStart.getTime());
	}

	// 日付ごとのキャッシュからデータを取得
	function getCachedDataForDate(symbol: string, interval: string, date: string): KLineData[] | null {
		// 当日データかどうかチェック
		const today = new Date();
		const targetDate = new Date(date);
		const todayStr = today.toISOString().split('T')[0];
		
		if (date === todayStr) {
			console.log('⚠️ 当日データのためキャッシュをスキップ:', date);
			return null;
		}
		
		const cacheKey = generateDailyCacheKey(symbol, interval, date);
		const cached = dataCache.get(cacheKey);
		
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			console.log('📦 日付キャッシュヒット:', cacheKey, '件数:', cached.data.length);
			return cached.data;
		}
		
		if (cached) {
			console.log('⏰ 日付キャッシュ期限切れ:', cacheKey, '経過時間:', Math.round((Date.now() - cached.timestamp) / 1000 / 60), '分');
		}
		
		return null;
	}
	
	// 日付ごとのデータをキャッシュに保存
	function setCachedDataForDate(symbol: string, interval: string, date: string, data: KLineData[]) {
		// 当日データかどうかチェック
		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];
		
		if (date === todayStr) {
			console.log('⚠️ 当日データのためキャッシュに保存しない:', date);
			return;
		}
		
		const cacheKey = generateDailyCacheKey(symbol, interval, date);
		dataCache.set(cacheKey, {
			data,
			timestamp: Date.now()
		});
		
		console.log('💾 日付データをキャッシュに保存:', cacheKey, '件数:', data.length);
	}
	
	// キャッシュをクリア
	function clearCache() {
		dataCache.clear();
	}
	
	// キャッシュ情報を取得
	function getCacheInfo() {
		return {
			count: dataCache.size,
			keys: Array.from(dataCache.keys())
		};
	}

	// チャートと同じロジックでデータを変換（CandlestickChart.svelteから抽出）
	function convertToChartData(data: KLineData[]) {
		return data.map((item) => {
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
				// 元のデータも保持
				originalData: item,
				// 表示用の時間文字列も含める
				displayTime: new Date(jstTimestamp).toLocaleString('ja-JP', { 
					timeZone: 'Asia/Tokyo',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				})
			};
		});
	}
	
	onMount(async () => {
		// 認証済みの場合のみデータを読み込み
		if ($isAuthenticated) {
			const observer = new ResizeObserver(([entry]) => {
				parentWidth = entry.contentRect.width;
			});
			observer.observe(parentRef);
			await loadUserSettings();
			await loadData();
		}
		
		// 初期化完了
	});
	
	// ドラッグ機能の実装（Svelteイベント使用）
	let startX = 0, startY = 0;
	let initialX = 0, initialY = 0;
	
	function handleDragStart(e: MouseEvent) {
		isDragging = true;
		startX = e.clientX;
		startY = e.clientY;
		
		// 現在の位置を取得
		const rect = draggablePanel.getBoundingClientRect();
		initialX = rect.left;
		initialY = rect.top;
		
		// カーソルスタイルを変更
		const dragHandle = e.currentTarget as HTMLElement;
		dragHandle.style.cursor = 'grabbing';
		
		e.preventDefault();
		
		// グローバルイベントリスナーを追加
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}
	
	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !draggablePanel) return;
		
		e.preventDefault();
		
		const deltaX = e.clientX - startX;
		const deltaY = e.clientY - startY;
		
		const newX = initialX + deltaX;
		const newY = initialY + deltaY;
		
		// 画面境界内に制限
		const maxX = window.innerWidth - draggablePanel.offsetWidth;
		const maxY = window.innerHeight - draggablePanel.offsetHeight;
		
		const boundedX = Math.max(0, Math.min(newX, maxX));
		const boundedY = Math.max(0, Math.min(newY, maxY));
		
		draggablePanel.style.left = boundedX + 'px';
		draggablePanel.style.top = boundedY + 'px';
		draggablePanel.style.right = 'auto';
		draggablePanel.style.bottom = 'auto';
	}
	
	function handleMouseUp() {
		if (!isDragging) return;
		
		isDragging = false;
		
		// カーソルを戻す
		const dragHandle = draggablePanel?.querySelector('.drag-handle') as HTMLElement;
		if (dragHandle) {
			dragHandle.style.cursor = 'grab';
		}
		
		// グローバルイベントリスナーを削除
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}
	
	// ユーザー設定の読み込み
	async function loadUserSettings() {
		if ($isAuthenticated && $userSettings) {
			// 保存された設定を適用
			dataSettings.symbol = $userSettings.symbol;
			dataSettings.interval = $userSettings.time_interval;
			dataSettings.fromDate = $userSettings.from_date;
			dataSettings.toDate = $userSettings.to_date;
			
			divergenceSettings.lookback = $userSettings.lookback;
			divergenceSettings.minRange = $userSettings.min_range;
			divergenceSettings.maxRange = $userSettings.max_range;
		}
	}
	
	// 時間足に応じた日数を取得するヘルパー関数
	function getIntervalDays(interval: string): number {
		const intervalMap: Record<string, number> = {
			'1min': 1/1440,    // 1分 = 1/1440日
			'5min': 5/1440,    // 5分
			'15min': 15/1440,  // 15分
			'30min': 30/1440,  // 30分
			'1hour': 1/24,     // 1時間 = 1/24日
			'4hour': 4/24,     // 4時間
			'1day': 1          // 1日
		};
		return intervalMap[interval] || 1/24; // デフォルトは1時間
	}

	// 設定変更時の自動保存（デバウンス付き）
	let saveTimeoutId: number | null = null;
	
	function saveUserSettings() {
		if (!$isAuthenticated || !hasLoadedSettings) return;
		
		// 前のタイムアウトをクリア
		if (saveTimeoutId) {
			clearTimeout(saveTimeoutId);
		}
		
		// 500ms後に保存（デバウンス）
		saveTimeoutId = window.setTimeout(async () => {
			const settings: UserSettings = {
				symbol: dataSettings.symbol,
				time_interval: dataSettings.interval,
				from_date: dataSettings.fromDate,
				to_date: dataSettings.toDate,
				lookback: divergenceSettings.lookback,
				min_range: divergenceSettings.minRange,
				max_range: divergenceSettings.maxRange,
				stop_loss_pips: 30,
				take_profit_pips: 50,
				initial_balance: 100000,
				position_size: 1.0
			};
			await supabaseAuthService.saveUserSettings(settings);
			saveTimeoutId = null;
		}, 500);
	}
	
	// 設定変更を手動で監視して保存をトリガー
	function onSettingsChange() {
		if (hasLoadedSettings) {
			saveUserSettings();
		}
	}
	
	let hasLoadedSettings = false;
	
	// 認証状態の変更を監視して設定を一回だけ読み込み
	$: if ($isAuthenticated && $userSettings && !hasLoadedSettings) {
		loadUserSettings().then(() => {
			// 設定読み込み後にデータも読み込み
			loadData();
		});
		hasLoadedSettings = true;
	}
	
	// 認証状態が変わったら設定読み込みフラグをリセット
	$: if (!$isAuthenticated) {
		hasLoadedSettings = false;
		// ログアウト時にデータをクリア
		klineData = [];
		detectedDivergences = [];
		allDivergences = [];
		backtestTrades = [];
		error = null;
		loading = false;
	}
	
	async function loadData() {
		loading = true;
		error = null;
		
		try {
			// 日付バリデーション
			const minDate = new Date('2023-10-28');
			const fromDate = new Date(dataSettings.fromDate);
			const toDate = new Date(dataSettings.toDate);
			
			if (fromDate < minDate) {
				throw new Error('開始日は2023年10月28日以降を指定してください。それより前のデータは取得できません。');
			}
			
			if (fromDate > toDate) {
				throw new Error('開始日は終了日より前の日付を指定してください。');
			}
			
			if (toDate > new Date()) {
				throw new Error('終了日は今日以前の日付を指定してください。');
			}
			
			// 日付ごとのキャッシュを使用してデータを取得
			const allData: KLineData[] = [];
			let cacheHitCount = 0;
			let apiCallCount = 0;
			
			// RSI計算精度向上のため、開始日の100本前から拡張データを取得
			const extendedFromDate = new Date(dataSettings.fromDate);
			const intervalDays = getIntervalDays(dataSettings.interval);
			extendedFromDate.setDate(extendedFromDate.getDate() - Math.max(10, Math.ceil(100 * intervalDays))); // 最低10日、最大100本相当
			
			// 取得する日付範囲を決定
			const startDate = new Date(extendedFromDate);
			const endDate = new Date(dataSettings.toDate);
			
			console.log('🔄 データ取得開始:');
			console.log('  - 拡張期間:', extendedFromDate.toISOString().split('T')[0], '〜', dataSettings.toDate);
			console.log('  - 表示期間:', dataSettings.fromDate, '〜', dataSettings.toDate);
			
			// 日付ごとにキャッシュまたはAPIからデータを取得
			let currentDate = new Date(startDate);
			let weekendSkipCount = 0;
			
			while (currentDate <= endDate) {
				const dateStr = currentDate.toISOString().split('T')[0];
				const dayOfWeek = currentDate.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
				
				// 土曜日（6）と日曜日（0）はスキップ
				if (dayOfWeek === 0 || dayOfWeek === 6) {
					console.log('📅 週末のためスキップ:', dateStr, dayOfWeek === 0 ? '(日曜日)' : '(土曜日)');
					weekendSkipCount++;
					currentDate.setDate(currentDate.getDate() + 1);
					continue;
				}
				
				// まずキャッシュをチェック
				const cachedDayData = getCachedDataForDate(dataSettings.symbol, dataSettings.interval, dateStr);
				
				if (cachedDayData) {
					// キャッシュヒット
					allData.push(...cachedDayData);
					cacheHitCount++;
				} else {
					// キャッシュミス - APIからデータを取得
					console.log('🌐 [APIアクセス] 日付:', dateStr);
					apiCallCount++;
					
					try {
						const dayData = await fetchGmoApi(dataSettings.symbol, dataSettings.interval, currentDate);
						if (dayData && dayData.length > 0) {
							allData.push(...dayData);
							// 日付ごとにキャッシュに保存
							setCachedDataForDate(dataSettings.symbol, dataSettings.interval, dateStr, dayData);
						}
					} catch (err) {
						console.log(`${dateStr}のデータ取得をスキップ:`, err);
					}
				}
				
				currentDate.setDate(currentDate.getDate() + 1);
			}
			
			console.log('✅ データ取得完了:');
			console.log('  - 全データ件数:', allData.length, '件');
			console.log('  - キャッシュヒット:', cacheHitCount, '日');
			console.log('  - APIアクセス:', apiCallCount, '日');
			console.log('  - 週末スキップ:', weekendSkipCount, '日');
			
			// データを時系列順にソート
			const sortedData = allData.sort((a, b) => parseInt(a.openTime) - parseInt(b.openTime));
			
			// 表示用データは元の期間のみ
			const originalStartTime = new Date(`${dataSettings.fromDate}T00:00:00`).getTime();
			const displayData = sortedData.filter(item => {
				const itemTime = new Date(parseInt(item.openTime)).getTime();
				return itemTime >= originalStartTime;
			});
			
			klineData = displayData;
			globalExtendedData = sortedData; // 拡張データ全体を保存
			chartData = convertToChartData(displayData);
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			loading = false;
			
			// データ取得完了後にパネルを自動で折りたたむ
			if (klineData.length > 0) {
				setTimeout(() => {
					isDataPanelCollapsed = true;
				}, 500);
			}
		}
		
		// データ読み込み後に時間軸を同期
		setTimeout(() => {
			syncChartTimeScales();
		}, 1000);
	}
	
	// クイック期間設定の関数
	function setQuickPeriod(days: number) {
		const today = new Date();
		const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
		const minDate = new Date('2023-10-28');
		
		// 最小日付制限を適用
		const actualStartDate = startDate < minDate ? minDate : startDate;
		
		dataSettings.fromDate = actualStartDate.toISOString().split('T')[0];
		dataSettings.toDate = today.toISOString().split('T')[0];
		
		// 設定変更を保存
		onSettingsChange();
	}
	
	function setToday() {
		const today = new Date();
		dataSettings.toDate = today.toISOString().split('T')[0];
		
		// 設定変更を保存
		onSettingsChange();
	}
	
	// チャート間の時間軸を同期する関数
	function syncChartTimeScales() {
		if (candlestickChart && rsiChart) {
			const mainChart = candlestickChart.getChart();
			const rsiChartInstance = rsiChart.getChart();
			
			if (mainChart && rsiChartInstance) {
				
				// まずRSIチャートの時間軸をメインチャートに合わせる
				mainChart.timeScale().fitContent();
				
				// 少し待ってからRSIチャートも同じ範囲に設定
				setTimeout(() => {
					const timeRange = mainChart.timeScale().getVisibleLogicalRange();
					if (timeRange) {
						rsiChartInstance.timeScale().setVisibleLogicalRange(timeRange);
					}
					
					// RSIチャートも同様にフィット（データが同じ長さなので同じ範囲になる）
					rsiChartInstance.timeScale().fitContent();
					
					// 再度同期を確認
					setTimeout(() => {
						const mainRange = mainChart.timeScale().getVisibleLogicalRange();
						if (mainRange) {
							rsiChartInstance.timeScale().setVisibleLogicalRange(mainRange);
						}
						
						// イベントリスナーを一度だけ設定
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
						
					}, 100);
				}, 300);
			}
		}
	}
	
	// データが変更されたときにも同期を実行
	$: if (klineData.length > 0 && candlestickChart && rsiChart) {
		setTimeout(() => {
			syncChartTimeScales();
		}, 500);
	}
	
	
	async function handleDivergenceDetected(divergences: Divergence[]) {
		// 全てのダイバージェンスを保存（バックテスト用）
		allDivergences = divergences;
		
		// 新しいダイバージェンスが検出された場合
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
			// if ('Notification' in window && Notification.permission === 'granted') {
			// 	new Notification('ダイバージェンス検出!', {
			// 		body: `${newDivergences.length}個の新しいダイバージェンスが検出されました`,
			// 		icon: '/favicon.ico'
			// 	});
			// }
			
			// テスト分析ページではLINE通知は送信しない（レート制限回避のため）
			// LINE通知はメインページ（ライブ監視）でのみ動作
		}
	}
	
	function handleBacktestResult(result: any) {
		backtestTrades = result.trades || [];
	}
	

</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>


<div>
	<!-- ダイバージェンス通知 -->
	<!-- {#if showNotification}
		<div class="fixed top-0 right-0 left-0 p-3"> 
			<div class="bg-gradient-to-r from-cyber-green/10 to-cyber-pink/10 border border-cyber-green/30 p-4 rounded-lg mb-6 flex justify-between items-center animate-pulse">
				<span class="text-cyber-green font-semibold">新しいダイバージェンスが検出されました！ 詳細は下記をご確認ください。</span>
				<button class="text-cyber-green hover:text-white hover:bg-cyber-green/20 w-6 h-6 rounded-full flex items-center justify-center transition-all" on:click={() => showNotification = false}>×</button>
			</div>
		</div>
	{/if} -->
	
	<div bind:this={parentRef}>
		<h2 class="text-2xl font-bold text-primary-400 mb-7">テスト分析 - {dataSettings.symbol} ({dataSettings.interval})</h2>
		
		<!-- テスト分析モードの注意書き -->
		<!-- <div class="bg-cyber-dark-3/50 border border-cyber-pink/30 p-4 rounded-lg mb-6 flex items-center gap-4">
			<div class="text-3xl">🧪</div>
			<div>
				<strong class="text-cyber-pink font-semibold">テスト分析モード</strong>
				<span class="block text-cyber-text-muted text-sm">LINE通知は送信されません（レート制限回避のため）</span>
			</div>
		</div> -->
		
		<!-- チャート設定パネル -->
		<div class="bg-cyber-dark-2/30 border border-white/10 rounded-lg mb-6">
			<!-- パネルヘッダー -->
			<div class="flex items-center justify-between p-4 border-b border-white/10">
				<h3 class="text-lg font-semibold text-primary-400">データ取得設定</h3>
				<button 
					class="text-primary-400 hover:bg-primary-500/20 p-2 rounded transition-all text-sm"
					on:click={() => isDataPanelCollapsed = !isDataPanelCollapsed}
				>
					{isDataPanelCollapsed ? '詳細設定 ▼' : '折りたたむ ▲'}
				</button>
			</div>
			
			<!-- 基本設定（常に表示） -->
			<div class="p-4 border-b border-white/10">
				<div class="flex flex-wrap gap-4">
					<div class="flex flex-col gap-2">
						<label for="symbol" class="text-sm">通貨ペア:</label>
						<select id="symbol" bind:value={dataSettings.symbol} on:change={onSettingsChange} class="text-xl select">
							<option value="USD_JPY">USD/JPY</option>
							<option value="EUR_JPY">EUR/JPY</option>
							<option value="GBP_JPY">GBP/JPY</option>
							<option value="AUD_JPY">AUD/JPY</option>
							<option value="EUR_USD">EUR/USD</option>
						</select>
					</div>

					<div class="flex flex-col gap-2">
						<label for="interval" class="text-sm">時間足:</label>
						<select id="interval" bind:value={dataSettings.interval} on:change={onSettingsChange} class="text-xl select">
							<option value="1min">1分足</option>
							<option value="5min">5分足</option>
							<option value="15min">15分足</option>
							<option value="30min">30分足</option>
							<option value="1hour">1時間足</option>
							<option value="4hour">4時間足</option>
							<option value="1day">1日足</option>
						</select>
					</div>

					<div class="flex flex-col gap-2">
						<label for="fromDate" class="text-sm">開始日:</label>
						<input 
							id="fromDate" 
							type="date" 
							bind:value={dataSettings.fromDate} 
							min="2023-10-28" 
							max={dataSettings.toDate} 
							on:change={onSettingsChange}
							class="text-xl input" 
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label for="toDate" class="text-sm font-medium text-cyber-green">終了日:</label>
						<input 
							id="toDate" 
							type="date" 
							bind:value={dataSettings.toDate} 
							min={dataSettings.fromDate} 
							max={new Date().toISOString().split('T')[0]} 
							on:change={onSettingsChange}
							class="text-xl input" 
						/>
					</div>
					
					<div class="flex flex-col gap-2 justify-end">
						<button 
							class="bg-primary-600 hover:bg-primary-700 disabled:bg-surface-600 text-white px-6 py-3 rounded-lg text-xl font-medium transition-colors duration-200" 
							disabled={loading} 
							on:click={loadData}
						>
							{loading ? '読み込み中...' : 'データ取得'}
						</button>
					</div>
				</div>
			</div>
			
			<!-- 詳細設定（折りたたみ可能） -->
			{#if !isDataPanelCollapsed}
			<div class="details-panel p-6" transition:slide={{ duration: 300, easing: cubicOut }}>

			<div class="settings-row">
				<div class="quick-period-controls">
					<!-- <label class="block mb-1">クイック設定:</label> -->
					<div class="quick-buttons">
						<button type="button" class="btn preset-tonal-secondary" on:click={() => setQuickPeriod(7)}>7日</button>
						<button type="button" class="btn preset-tonal-secondary" on:click={() => setQuickPeriod(14)}>2週</button>
						<button type="button" class="btn preset-tonal-secondary" on:click={() => setQuickPeriod(30)}>1月</button>
						<button type="button" class="btn preset-tonal-secondary" on:click={() => setQuickPeriod(90)}>3月</button>
						<button type="button" class="btn preset-tonal-secondary" on:click={() => setToday()}>今日まで</button>
					</div>
				</div>
			</div>

			<br />

			<div class="settings-row」">
				<div class="divergence-settings">
					<p>ダイバージェンス設定:</p>
					<div class="divergence-controls flex">
						<div class="control-item mr-4">
							<label for="lookback" class="text-sm">ピーク検出範囲:</label>
							<div class="text-sm flex items-center mt-1">
								<input 
								id="lookback" 
								type="number" 
								class="input px-3 py-2 max-w-24 mr-2"
								min="1" 
								max="10" 
								bind:value={divergenceSettings.lookback} 
								on:change={onSettingsChange} 
								/>
								<span class="unit text-sm break-keep">期間</span>
							</div>
						</div>
						<div class="control-item mr-4">
							<label for="minRange" class="text-sm">最小距離:</label>
							<div class="flex items-center mt-1">
								<input 
								id="minRange" 
								type="number"
								class="input px-3 py-2 max-w-24 mr-2"
								min="1" 
								max="20" 
								bind:value={divergenceSettings.minRange} 
								on:change={onSettingsChange} 
								/>
								<span class="unit text-sm break-keep">バー</span>
							
							</div>
						</div>
						<div class="control-item mr-4">
							<label for="maxRange" class="text-sm">最大距離:</label>
							<div class="flex items-center mt-1">
								<input 
								id="maxRange" 
								type="number"
								class="input px-3 py-2 max-w-24 mr-2"
								min="5" 
								max="50" 
								bind:value={divergenceSettings.maxRange} 
								on:change={onSettingsChange} 
							/>
							<span class="unit text-sm break-keep">バー</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- キャッシュ情報とクリアボタン -->
				<!-- <div class="cache-info">
					{#if isCurrentDay(dataSettings.fromDate, dataSettings.toDate)}
						<span class="cache-status current-day">当日データ（キャッシュ無効）</span>
					{:else if getCacheInfo().count > 0}
						<span class="cache-status">{getCacheInfo().count}件キャッシュ済み</span>
						<button class="clear-cache-btn" on:click={clearCache}>🗑️ クリア</button>
					{:else}
						<span class="cache-status">キャッシュ可能</span>
					{/if}
				</div> -->
			</div>
			{/if}
		</div>

		{#if loading}
			<div class="loading">データを読み込み中...</div>
		{:else if error}
			<div class="error">エラー: {error}</div>
		{:else if klineData.length > 0}
			<!-- チャート表示 -->
			<div class="chart-section">
				<CandlestickChart 
					bind:this={candlestickChart}
					data={klineData} 
					width={parentWidth > 500 ? parentWidth: 500} 
					height={400} 
					syncTimeScale={false}
					trades={backtestTrades}
				/>
			</div>
			
			<!-- RSIチャート表示 -->
			<div class="chart-section">
				<RSIChart 
					bind:this={rsiChart}
					data={klineData}
					extendedData={globalExtendedData}
					width={parentWidth > 500 ? parentWidth: 500} 
					height={300} 
					period={14}
					lookbackLeft={divergenceSettings.lookback}
					lookbackRight={divergenceSettings.lookback}
					rangeLower={divergenceSettings.minRange}
					rangeUpper={divergenceSettings.maxRange}
					syncTimeScale={false}
				/>
			</div>
			<!-- ダイバージェンス分析パネル -->
			<div class="chart-section">
				<DivergencePanel 
					data={klineData}
					extendedData={globalExtendedData}
					onDivergenceDetected={handleDivergenceDetected}
					lookbackLeft={divergenceSettings.lookback}
					lookbackRight={divergenceSettings.lookback}
					rangeLower={divergenceSettings.minRange}
					rangeUpper={divergenceSettings.maxRange}
				/>
			</div>

			<!-- テスト分析統合パネル（ドラッグ可能） -->
			<div class="draggable-panel-container">
				<div 
					class="fixed bottom-5 right-5 z-50 max-w-3xl max-h-[80vh] overflow-y-auto bg-surface-900/20 border border-primary-500/20 rounded-xl backdrop-blur-xl shadow-2xl text-sm min-w-md"
					bind:this={draggablePanel}
				>
					<div 
						class="flex items-center justify-between px-3 py-2 bg-surface-900/30 border-b border-primary-500/20 rounded-t-xl cursor-grab select-none backdrop-blur-sm"
						on:mousedown={handleDragStart}
						role="button"
						tabindex="0"
					>
						<span class="text-primary-400 font-bold text-xs tracking-wider">⋮⋮</span>
						<span class="text-primary-400 font-semibold text-sm flex-1 text-center mx-2">バックテスト</span>
						<button 
							class="text-primary-400 hover:bg-primary-500/20 p-2 rounded transition-all hover:scale-110"
							on:click={() => isMinimized = !isMinimized}
						>
							{isMinimized ? '📖' : '📕'}
						</button>
					</div>
					{#if !isMinimized}
						<div class="p-4 max-h-[calc(80vh-3rem)] overflow-y-auto" transition:slide={{ duration: 300, easing: cubicOut }}>
							<TestAnalysisPanel 
								data={klineData}
								divergences={allDivergences}
								symbol={dataSettings.symbol}
								interval={dataSettings.interval}
								chartData={chartData}
								onBacktestResult={handleBacktestResult}
							/>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="no-data">データがありません</div>
		{/if}
	</div>
	
</div>

