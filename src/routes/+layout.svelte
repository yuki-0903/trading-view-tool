<script>
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { isAuthenticated, loading as authLoading } from '$lib/stores/supabaseAuth';
	import Header from '$lib/components/Header.svelte';
	import Login from '$lib/components/Login.svelte';
	import Loading from '$lib/components/Loading.svelte';
</script>


	<!-- 認証状態確認中のローディング画面 -->
{#if $authLoading}
<div class="flex flex-col justify-center items-center min-h-screen">
	<Loading />
</div>

{:else}
	{#if $isAuthenticated}
		<div class="grid grid-cols-[auto_1fr]">
			<Sidebar />
			<div>
				<Header />
				<div class="p-8 py-10">
					<slot />
				</div>
			</div>
		</div>
		{:else}
			<div>
				<Login />
			</div>
		
	{/if}
{/if}


