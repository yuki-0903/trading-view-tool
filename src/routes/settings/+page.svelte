<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, userSettings, supabaseAuthService } from '$lib/stores/supabaseAuth';

	// ダイバージェンス通知設定
	let divergenceSettings = {
		monitored_pairs: ['USD_JPY'],
		monitored_intervals: ['1hour'],
		notify_bullish_divergence: true,
		notify_bearish_divergence: true,
		max_notifications_per_hour: 5
	};

	let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

	// 通貨ペアと時間足のオプション
	const availablePairs = ['USD_JPY', 'EUR_JPY', 'GBP_JPY', 'AUD_JPY', 'EUR_USD', 'GBP_USD', 'AUD_USD', 'USD_CHF', 'EUR_CHF', 'GBP_CHF'];
	const availableIntervals = ['5min', '15min', '30min', '1hour', '4hour', '1day'];

	// 認証済みユーザーの設定を読み込み
	$: if ($isAuthenticated && $userSettings && $userSettings.divergenceSettings) {
		divergenceSettings = { ...$userSettings.divergenceSettings };
	}

	async function saveSettings() {
		if (!$isAuthenticated || !$userSettings) return;

		saveStatus = 'saving';
		
		try {
			const updatedSettings = {
				...$userSettings,
				divergenceSettings
			};
			
			await supabaseAuthService.saveUserSettings(updatedSettings);
			saveStatus = 'saved';
			
			setTimeout(() => {
				saveStatus = 'idle';
			}, 2000);
		} catch (error) {
			console.error('設定保存エラー:', error);
			saveStatus = 'error';
			
			setTimeout(() => {
				saveStatus = 'idle';
			}, 3000);
		}
	}

	// 通貨ペア選択の変更
	function toggleMonitoredPair(pair: string) {
		if (divergenceSettings.monitored_pairs.includes(pair)) {
			divergenceSettings.monitored_pairs = divergenceSettings.monitored_pairs.filter(p => p !== pair);
		} else {
			divergenceSettings.monitored_pairs = [...divergenceSettings.monitored_pairs, pair];
		}
		saveSettings();
	}

	// 時間足選択の変更
	function toggleMonitoredInterval(interval: string) {
		if (divergenceSettings.monitored_intervals.includes(interval)) {
			divergenceSettings.monitored_intervals = divergenceSettings.monitored_intervals.filter(i => i !== interval);
		} else {
			divergenceSettings.monitored_intervals = [...divergenceSettings.monitored_intervals, interval];
		}
		saveSettings();
	}

	onMount(() => {
		// 初期設定を読み込み
	});
</script>

<svelte:head>
	<title>Settings - Trading View Tool</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 p-6">
	<div class="max-w-4xl mx-auto">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-primary-400 mb-7">⚙️ 設定</h1>
			<p class="text-surface-300">ダイバージェンス通知の設定を管理します</p>
		</div>

		{#if !$isAuthenticated}
			<div class="bg-surface-800/90 border border-surface-600/50 rounded-xl backdrop-blur-sm p-6 text-center">
				<h2 class="text-xl font-semibold text-warning-400 mb-4">🔐 ログインが必要です</h2>
				<p class="text-surface-300 mb-4">設定を保存するにはログインしてください</p>
				<a href="/auth" class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 inline-block">ログイン</a>
			</div>
		{:else}
			<!-- ダイバージェンス通知設定 -->
			<div class="bg-surface-800/90 border border-primary-500/30 rounded-xl backdrop-blur-sm p-6 mb-6">
				<h2 class="text-xl font-semibold text-primary-400 mb-4 flex items-center gap-2">
					📊 ダイバージェンス通知設定
				</h2>
				
				<div class="space-y-6">
					<!-- 監視対象の通貨ペア -->
					<div>
						<h3 class="text-lg font-medium text-surface-200 mb-3">監視対象の通貨ペア</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
							{#each availablePairs as pair}
								<label class="flex items-center p-3 bg-surface-700/50 rounded-lg cursor-pointer hover:bg-surface-600/50 transition-colors">
									<input
										type="checkbox"
										checked={divergenceSettings.monitored_pairs.includes(pair)}
										on:change={() => toggleMonitoredPair(pair)}
										class="w-4 h-4 text-primary-600 bg-surface-600 border-surface-500 rounded focus:ring-primary-500 focus:ring-2 mr-3"
									/>
									<span class="text-sm font-medium text-surface-200">{pair}</span>
								</label>
							{/each}
						</div>
					</div>

					<!-- 監視対象の時間足 -->
					<div>
						<h3 class="text-lg font-medium text-surface-200 mb-3">監視対象の時間足</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
							{#each availableIntervals as interval}
								<label class="flex items-center p-3 bg-surface-700/50 rounded-lg cursor-pointer hover:bg-surface-600/50 transition-colors">
									<input
										type="checkbox"
										checked={divergenceSettings.monitored_intervals.includes(interval)}
										on:change={() => toggleMonitoredInterval(interval)}
										class="w-4 h-4 text-success-600 bg-surface-600 border-surface-500 rounded focus:ring-success-500 focus:ring-2 mr-3"
									/>
									<span class="text-sm font-medium text-surface-200">{interval}</span>
								</label>
							{/each}
						</div>
					</div>

					<!-- 通知タイプ -->
					<div>
						<h3 class="text-lg font-medium text-surface-200 mb-3">通知タイプ</h3>
						<div class="space-y-3">
							<label class="flex items-center p-3 bg-surface-700/50 rounded-lg cursor-pointer hover:bg-surface-600/50 transition-colors">
								<input
									type="checkbox"
									bind:checked={divergenceSettings.notify_bullish_divergence}
									on:change={saveSettings}
									class="w-4 h-4 text-success-600 bg-surface-600 border-surface-500 rounded focus:ring-success-500 focus:ring-2 mr-3"
								/>
								<div>
									<span class="text-sm font-medium text-surface-200">🐂 強気ダイバージェンス</span>
									<p class="text-xs text-surface-400 mt-1">価格が下降トレンドでRSIが上昇トレンドの時</p>
								</div>
							</label>

							<label class="flex items-center p-3 bg-surface-700/50 rounded-lg cursor-pointer hover:bg-surface-600/50 transition-colors">
								<input
									type="checkbox"
									bind:checked={divergenceSettings.notify_bearish_divergence}
									on:change={saveSettings}
									class="w-4 h-4 text-error-600 bg-surface-600 border-surface-500 rounded focus:ring-error-500 focus:ring-2 mr-3"
								/>
								<div>
									<span class="text-sm font-medium text-surface-200">🐻 弱気ダイバージェンス</span>
									<p class="text-xs text-surface-400 mt-1">価格が上昇トレンドでRSIが下降トレンドの時</p>
								</div>
							</label>
						</div>
					</div>

					<!-- 通知制限 -->
					<div>
						<h3 class="text-lg font-medium text-surface-200 mb-3">通知制限</h3>
						<div class="flex items-center space-x-4">
							<label class="flex items-center">
								<span class="text-sm text-surface-300 mr-3">1時間あたり最大通知数:</span>
								<input
									type="number"
									bind:value={divergenceSettings.max_notifications_per_hour}
									on:change={saveSettings}
									min="1"
									max="20"
									class="w-20 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
								/>
								<span class="text-sm text-surface-300 ml-2">回</span>
							</label>
						</div>
					</div>

					{#if saveStatus === 'saved'}
						<div class="p-4 bg-success-500/20 border border-success-500/30 text-success-300 rounded-lg">
							<span>✅ 設定が正常に保存されました</span>
						</div>
					{:else if saveStatus === 'error'}
						<div class="p-4 bg-error-500/20 border border-error-500/30 text-error-300 rounded-lg">
							<span>❌ 設定の保存に失敗しました</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- 設定ガイド -->
			<div class="bg-surface-800/90 border border-tertiary-500/30 rounded-xl backdrop-blur-sm p-6">
				<h2 class="text-xl font-semibold text-tertiary-400 mb-4 flex items-center gap-2">
					📖 ダイバージェンス設定ガイド
				</h2>
				
				<div class="space-y-4 text-surface-300">
					<div>
						<h3 class="text-lg font-semibold text-surface-200 mb-2">ダイバージェンスとは</h3>
						<p class="text-sm leading-relaxed">
							ダイバージェンスは、価格の動きとテクニカル指標（RSI）の動きが逆行する現象で、
							トレンド転換の重要なシグナルとされています。
						</p>
					</div>
					
					<div>
						<h3 class="text-lg font-semibold text-surface-200 mb-2">設定のポイント</h3>
						<ul class="list-disc list-inside space-y-1 text-sm">
							<li><strong>通貨ペア:</strong> よく取引する通貨ペアを選択してください</li>
							<li><strong>時間足:</strong> 短い時間足ほど多くの通知が発生します</li>
							<li><strong>通知制限:</strong> 過度な通知を避けるため、適切な制限を設定してください</li>
						</ul>
					</div>

					<div class="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
						<h4 class="font-semibold text-primary-400 mb-2">💡 推奨設定</h4>
						<ul class="list-disc list-inside space-y-1 text-sm">
							<li>初心者の方は1時間足以上での監視がおすすめ</li>
							<li>通知は1時間あたり3-5回程度に制限することを推奨</li>
							<li>メイン取引通貨ペアから始めて、慣れてから追加してください</li>
						</ul>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>