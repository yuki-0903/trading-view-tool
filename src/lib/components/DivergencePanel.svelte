<script lang="ts">
	import { onMount } from 'svelte';
	import type { KLineData } from '../types/gmo';
	import { analyzeDivergence, type Divergence, type Peak } from '../utils/divergence';

	export let data: KLineData[] = [];
	export let extendedData: KLineData[] = []; // RSI計算用の拡張データ
	export let onDivergenceDetected: (divergences: Divergence[]) => void = () => {};
	export let lookbackLeft: number = 3;
	export let lookbackRight: number = 3;
	export let rangeLower: number = 3;
	export let rangeUpper: number = 25;

	let divergences: Divergence[] = [];
	let summary: any = {};
	let lastAnalysis: string = '';
	let isCollapsed: boolean = true; // デフォルトで折りたたみ

	// データまたは設定が変更された時にダイバージェンス分析を実行
	$: if (data.length > 20) {
		runAnalysis();
	}
	
	// 設定変更時も再分析
	$: if (data.length > 20 && (lookbackLeft || lookbackRight || rangeLower || rangeUpper)) {
		runAnalysis();
	}

	function runAnalysis() {
		if (data.length < 20) return;

		// 拡張データでRSI計算し、表示期間に対応するRSIデータを生成
		let preCalculatedRsiData = undefined;
		if (extendedData.length > 0 && extendedData.length > data.length) {
			import('../utils/rsi').then(({ calculateRSI }) => {
				const fullRsiData = calculateRSI(extendedData, 14);
				preCalculatedRsiData = fullRsiData.slice(-(data.length));
				
				// 事前計算されたRSIデータでダイバージェンス分析
				const result = analyzeDivergence(
					data, 
					14,  // RSI期間
					lookbackLeft,
					lookbackRight,  
					rangeLower,
					rangeUpper,
					preCalculatedRsiData  // 事前計算されたRSIデータ
				);
				
				updateAnalysisResults(result);
			});
			return;
		}

		// 拡張データなしの場合（従来通り）
		const result = analyzeDivergence(
			data, 
			14,  // RSI期間
			lookbackLeft,
			lookbackRight,  
			rangeLower,
			rangeUpper
		);
		
		updateAnalysisResults(result);
	}
	
	function updateAnalysisResults(result: any) {
		divergences = result.divergences;
		summary = result.summary;
		lastAnalysis = new Date().toLocaleString('ja-JP');


		// 新しいダイバージェンスが検出された場合、親コンポーネントに通知
		if (divergences.length > 0) {
			onDivergenceDetected(divergences);
		}
	}

	function getDivergenceColor(type: string): string {
		return type === 'bullish' ? '#4caf50' : '#f44336';
	}

	function getStrengthIcon(strength: string): string {
		switch (strength) {
			case 'strong': return '🔥';
			case 'medium': return '⚡';
			default: return '💫';
		}
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString('ja-JP', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Tokyo'  // 明示的に日本時間を指定
		});
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleCollapse();
		}
	}
</script>

<div class="bg-gradient-to-r from-surface-800/50 to-surface-700/30 border border-warning-500/20 rounded-lg overflow-hidden">
	<div 
		class="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface-900/60 to-surface-800/60 border-b border-warning-500/20 cursor-pointer hover:bg-surface-800/50 transition-colors"
		role="button" 
		tabindex="0"
		on:click={toggleCollapse}
		on:keydown={handleKeydown}
		aria-expanded={!isCollapsed}
	>
		<h3 class="flex items-center gap-2 text-lg font-semibold text-warning-400">
			<span class="transform transition-transform duration-200" class:rotate-90={!isCollapsed}>
				▶
			</span>
			ダイバージェンス分析
		</h3>
		<div class="text-xs text-surface-400">
			最終分析: {lastAnalysis}
		</div>
	</div>

	{#if !isCollapsed}

	{#if summary.totalPeaks > 0}
		<div class="p-4 border-b border-surface-700/30">
			<h4 class="text-base font-medium text-surface-200 mb-3">分析サマリー</h4>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				<div class="bg-surface-900/40 border border-surface-600/30 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">ピーク数</div>
					<div class="text-lg font-bold text-surface-200">{summary.totalPeaks}</div>
				</div>
				<div class="bg-surface-900/40 border border-surface-600/30 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">高値ピーク</div>
					<div class="text-lg font-bold text-tertiary-400">{summary.highPeaks}</div>
				</div>
				<div class="bg-surface-900/40 border border-surface-600/30 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">安値ピーク</div>
					<div class="text-lg font-bold text-secondary-400">{summary.lowPeaks}</div>
				</div>
				<div class="bg-surface-900/40 border border-success-600/20 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">ブリッシュ</div>
					<div class="text-lg font-bold text-success-400">{summary.bullishDivergences}</div>
				</div>
				<div class="bg-surface-900/40 border border-error-600/20 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">ベアリッシュ</div>
					<div class="text-lg font-bold text-error-400">{summary.bearishDivergences}</div>
				</div>
				<div class="bg-surface-900/40 border border-warning-600/20 rounded-lg p-3 text-center">
					<div class="text-xs text-surface-400 mb-1">強いシグナル</div>
					<div class="text-lg font-bold text-warning-400">{summary.strongDivergences}</div>
				</div>
			</div>
		</div>
	{/if}

	{#if divergences.length > 0}
		<div class="p-4">
			<h4 class="text-base font-medium text-surface-200 mb-3">検出されたダイバージェンス</h4>
			<div class="space-y-3 max-h-64 overflow-y-auto">
				{#each divergences as divergence}
					<div class="border-l-4 rounded-lg p-4" 
						 class:border-l-success-500={divergence.type === 'bullish'} 
						 class:border-l-error-500={divergence.type === 'bearish'}>
						<div class="flex justify-between items-start mb-2">
							<span class="font-medium text-sm" 
								  class:text-success-400={divergence.type === 'bullish'} 
								  class:text-error-400={divergence.type === 'bearish'}>
								{divergence.type === 'bullish' ? '📈 ブリッシュ' : '📉 ベアリッシュ'}
							</span>
							<span class="px-2 py-1 rounded-full text-xs font-medium"
								  class:bg-warning-500={divergence.strength === 'strong'}
								  class:text-warning-400={divergence.strength === 'strong'}
								  class:bg-secondary-500={divergence.strength === 'medium'}
								  class:text-secondary-400={divergence.strength === 'medium'}
								  class:bg-surface-500={divergence.strength === 'weak'}
								  class:text-surface-400={divergence.strength === 'weak'}>
								{getStrengthIcon(divergence.strength)} {divergence.strength}
							</span>
						</div>
						<div class="text-sm text-surface-300 mb-3">
							{divergence.description}
						</div>
						<div class="space-y-2 text-xs">
							<div class="flex justify-between text-surface-400">
								<span>期間:</span>
								<span>{formatTime(divergence.priceStart.time)} → {formatTime(divergence.priceEnd.time)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-surface-400">価格:</span>
								<span class="font-mono text-surface-300">
									{divergence.priceStart.price.toFixed(3)} → {divergence.priceEnd.price.toFixed(3)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-surface-400">RSI:</span>
								<span class="font-mono text-surface-300">
									{divergence.rsiStart.rsi.toFixed(1)} → {divergence.rsiEnd.rsi.toFixed(1)}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if data.length > 30}
		<div class="p-6 text-center">
			<div class="text-4xl mb-3">🔍</div>
			<p class="text-surface-300 font-medium mb-2">現在、明確なダイバージェンスは検出されていません</p>
			<p class="text-surface-400 text-sm">より多くのデータが蓄積されると、パターンが検出される可能性があります</p>
		</div>
	{:else}
		<div class="p-6 text-center">
			<div class="text-4xl mb-3">📊</div>
			<p class="text-warning-400 font-medium mb-2">ダイバージェンス分析には、より多くのデータが必要です</p>
			<p class="text-surface-400 text-sm">
				現在のデータ数: <span class="text-warning-400 font-medium">{data.length}</span> / 
				必要数: <span class="text-success-400 font-medium">30+</span>
			</p>
		</div>
	{/if}

	{/if}
</div>