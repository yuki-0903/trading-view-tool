<script lang="ts">
	import { onMount } from 'svelte';
	import { lineNotificationService, type LineNotificationSettings } from '$lib/services/lineNotificationService';
	import { currentUser } from '$lib/stores/supabaseAuth';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	  // Icons
	import IconMenu from '@lucide/svelte/icons/menu';


  import IconSettings from '@lucide/svelte/icons/settings';
	import { AlignHorizontalDistributeCenter } from 'lucide-svelte';
	import { ChartPie } from 'lucide-svelte';
	import { BellRing } from 'lucide-svelte';
	

	// Navigation state - simplified for Svelte 4 compatibility
	let selectedValue = 'dashboard';
	let isExpanded = true;
	
	// LINE通知設定の管理
	let lineSettings: LineNotificationSettings = {
		user_id: '',
		line_user_id: '',
		is_enabled: false,
		monitored_pairs: ['USD_JPY'],
		monitored_intervals: ['1hour'],
		notify_bullish_divergence: true,
		notify_bearish_divergence: true,
		max_notifications_per_hour: 5,
		quiet_hours_start: '23:00',
		quiet_hours_end: '07:00'
	};

	let loadingLineSettings = false;
	let savingLineSettings = false;

	// 通貨ペアと時間足のオプション
	const availablePairs = ['USD_JPY', 'EUR_JPY', 'GBP_JPY', 'AUD_JPY', 'EUR_USD'];
	const availableIntervals = ['5min', '15min', '30min', '1hour', '4hour', '1day'];


	// Handle value change
	function onValueChange(newValue: string) {
		selectedValue = newValue;
	}

	// LINE設定を読み込み
	async function loadLineSettings() {
		if (!$currentUser) return;
		
		loadingLineSettings = true;
		try {
			const settings = await lineNotificationService.getNotificationSettings($currentUser.id);
			if (settings) {
				lineSettings = settings;
			} else {
				lineSettings.user_id = $currentUser.id;
			}
		} catch (error) {
			console.error('LINE設定の読み込みエラー:', error);
		} finally {
			loadingLineSettings = false;
		}
	}

	// LINE設定を保存
	async function saveLineSettings() {
		if (!$currentUser) return;
		
		savingLineSettings = true;
		try {
			await lineNotificationService.saveNotificationSettings({
				...lineSettings,
				user_id: $currentUser.id
			});
		} catch (error) {
			console.error('LINE設定保存エラー:', error);
		} finally {
			savingLineSettings = false;
		}
	}

	// 通貨ペア選択の変更
	function toggleMonitoredPair(pair: string) {
		if (lineSettings.monitored_pairs.includes(pair)) {
			lineSettings.monitored_pairs = lineSettings.monitored_pairs.filter((p: string) => p !== pair);
		} else {
			lineSettings.monitored_pairs = [...lineSettings.monitored_pairs, pair];
		}
		saveLineSettings();
	}

	// 時間足選択の変更
	function toggleMonitoredInterval(interval: string) {
		if (lineSettings.monitored_intervals.includes(interval)) {
			lineSettings.monitored_intervals = lineSettings.monitored_intervals.filter((i: string) => i !== interval);
		} else {
			lineSettings.monitored_intervals = [...lineSettings.monitored_intervals, interval];
		}
		saveLineSettings();
	}

	onMount(() => {
		loadLineSettings();
	});

	let isExpansed = $state(true);

  function toggleExpanded() {
    isExpansed = !isExpansed;
  }
</script>

<!-- Component -->
<Navigation.Rail expanded={isExpansed} classes="sticky top-0 col-span-1 h-screen">
	{#snippet header()}
		<Navigation.Tile labelExpanded="Menu" onclick={toggleExpanded} title="Toggle Menu Width"><IconMenu /></Navigation.Tile>
	{/snippet}
	{#snippet tiles()}
		<Navigation.Tile
			labelExpanded="ダッシュボード"
			href="/"
			on:click={() => onValueChange('dashboard')}
		>
			<AlignHorizontalDistributeCenter />
		</Navigation.Tile>
		<Navigation.Tile
			labelExpanded="テスト分析"
			href="/test-analysis"
			on:click={() => onValueChange('analysis')}
		>
			<ChartPie />
		</Navigation.Tile>
		<Navigation.Tile
			labelExpanded="LINE通知設定"
			href="/settings"
			on:click={() => onValueChange('notifications')}
		>
			<BellRing />
		</Navigation.Tile>
		
	{/snippet}
	{#snippet footer()}
		<Navigation.Tile labelExpanded="Settings" href="/settings" title="Settings"><IconSettings /></Navigation.Tile>
	{/snippet}
</Navigation.Rail>

