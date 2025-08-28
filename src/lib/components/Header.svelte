<script lang="ts">
	import { isAuthenticated, currentUser, supabaseAuthService, loading } from '../stores/supabaseAuth';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { User } from 'lucide-svelte';
	import { AlignHorizontalDistributeCenter } from 'lucide-svelte';

	let showAuthModal = false;

	async function handleLogout() {
		await supabaseAuthService.signOut();
	}

	function handleAuthSuccess() {
		showAuthModal = false;
	}

	function handleAuthClose() {
		showAuthModal = false;
	}
</script>

<header>
	<AppBar>
		{#snippet lead()}
			<span class="font-bold text-lg flex items-center justify-center flex-col"><AlignHorizontalDistributeCenter /></span>
		{/snippet}
		{#snippet trail()}
			{#if $isAuthenticated && $currentUser}
				<span class="text-surface-200 flex items-center gap-2 mr-4">
					<User size={16} />
					{$currentUser.username}
				</span>
				<button 
					class="bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
					on:click={handleLogout}
				>
					ログアウト
				</button>
			{/if}
		{/snippet}
	</AppBar>
</header>



