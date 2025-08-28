<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabaseAuthService } from '../stores/supabaseAuth';
	import { isDemoMode } from '../supabase';

	export let isOpen = false;
	
	const dispatch = createEventDispatcher();
	
	let isLogin = true; // true: ログイン, false: 新規登録
	let isPasswordReset = false; // true: パスワードリセット
	let username = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let isLoading = false;
	let error = '';
	let successMessage = '';

	function toggleMode() {
		isLogin = !isLogin;
		isPasswordReset = false;
		clearForm();
	}

	function showPasswordReset() {
		isPasswordReset = true;
		isLogin = false;
		clearForm();
	}

	function backToLogin() {
		isPasswordReset = false;
		isLogin = true;
		clearForm();
	}

	function clearForm() {
		username = '';
		email = '';
		password = '';
		confirmPassword = '';
		error = '';
		successMessage = '';
	}

	async function handleSubmit() {
		error = '';
		successMessage = '';
		
		// パスワードリセットの場合
		if (isPasswordReset) {
			const resetEmail = email || `${username}@example.com`;
			if (!username && !email) {
				error = 'メールアドレスまたはユーザー名を入力してください';
				return;
			}
			
			isLoading = true;
			try {
				const result = await supabaseAuthService.resetPassword(resetEmail);
				if (result.success) {
					successMessage = 'パスワードリセット用のメールを送信しました。メールをご確認ください。';
				} else {
					error = result.error || 'パスワードリセットに失敗しました';
				}
			} catch (err) {
				error = 'エラーが発生しました。もう一度お試しください。';
				console.error('Password reset error:', err);
			} finally {
				isLoading = false;
			}
			return;
		}
		
		if (!username || !password) {
			error = 'ユーザー名とパスワードを入力してください';
			return;
		}
		
		// Demo mode or Supabase validation
		if (isDemoMode()) {
			if (password.length < 3) {
				error = 'パスワードは3文字以上で入力してください';
				return;
			}
		} else {
			if (!isLogin) {
				if (!email) {
					error = 'メールアドレスを入力してください';
					return;
				}
				if (password !== confirmPassword) {
					error = 'パスワードが一致しません';
					return;
				}
				if (password.length < 6) {
					error = 'パスワードは6文字以上で入力してください';
					return;
				}
			} else {
				// ログイン時のバリデーション
				if (password.length < 6) {
					error = 'パスワードは6文字以上で入力してください';
					return;
				}
			}
		}
		
		isLoading = true;
		
		try {
			let result;
			
			if (isDemoMode()) {
				// Demo mode: use username as email
				const demoEmail = email || `${username}@demo.local`;
				result = isLogin 
					? await supabaseAuthService.signIn(demoEmail, password)
					: await supabaseAuthService.signUp(demoEmail, password, username);
			} else {
				// Supabase mode
				let userEmail: string;
				
				if (isLogin) {
					// ログイン時: メールアドレス形式かユーザー名かを自動判定
					userEmail = username.includes('@') ? username : `${username}@example.com`;
				} else {
					// 新規登録時: 従来の処理
					userEmail = email || `${username}@example.com`;
				}
				
				result = isLogin 
					? await supabaseAuthService.signIn(userEmail, password)
					: await supabaseAuthService.signUp(userEmail, password, username);
			}
			
			if (result.success) {
				dispatch('success');
				closeModal();
			} else {
				error = result.error || (isLogin ? 'ログインに失敗しました' : '登録に失敗しました');
			}
		} catch (err) {
			error = 'エラーが発生しました。もう一度お試しください。';
			console.error('Auth error:', err);
		} finally {
			isLoading = false;
		}
	}

	function closeModal() {
		isOpen = false;
		clearForm();
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isLoading) {
			handleSubmit();
		} else if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" on:click={closeModal}>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="bg-surface-900 border border-surface-600 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200" on:click|stopPropagation on:keydown={handleKeydown}>
			<div class="flex items-center justify-between p-4 border-b border-surface-600">
				<h2 class="text-xl font-bold text-primary-400">
					{#if isPasswordReset}
						パスワードリセット
					{:else if isLogin}
						ログイン
					{:else}
						新規登録
					{/if}
				</h2>
				<button class="text-surface-400 hover:text-surface-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-800 transition-colors" on:click={closeModal}>×</button>
			</div>
			
			<div class="p-6">
				<form on:submit|preventDefault={handleSubmit}>
					{#if isPasswordReset}
						<div class="mb-4">
							<label for="resetUsername" class="block font-medium text-surface-300 mb-2">ユーザー名またはメールアドレス</label>
							<input
								id="resetUsername"
								type="text"
								bind:value={username}
								placeholder="ユーザー名またはメールアドレスを入力"
								disabled={isLoading}
								required
								class="input w-full px-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>
						
						<div class="mb-4">
							<label for="resetEmail" class="block font-medium text-surface-300 mb-2">メールアドレス（任意）</label>
							<input
								id="resetEmail"
								type="email"
								bind:value={email}
								placeholder="メールアドレスを入力（オプション）"
								disabled={isLoading}
								class="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							<small class="block mt-1 text-xs text-surface-400 italic">
								ユーザー名のみ入力した場合、{username}@example.com にメールが送信されます
							</small>
						</div>
					{:else}
						<div class="mb-4">
							<label for="username" class="block font-medium text-surface-300 mb-2">ユーザー名またはメールアドレス</label>
							<input
								id="username"
								type="text"
								bind:value={username}
								placeholder="ユーザー名またはメールアドレス"
								disabled={isLoading}
								required
								class="input w-full px-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							{#if isLogin && !isDemoMode()}
								<small class="block mt-1 text-xs text-surface-400 italic">
									ユーザー名で登録した場合は「{username || 'username'}@example.com」でログイン
								</small>
							{/if}
						</div>
						
						{#if !isLogin}
							<div class="mb-4">
								<label for="email" class="block font-medium text-surface-300 mb-2">メールアドレス</label>
								<input
									id="email"
									type="email"
									bind:value={email}
									placeholder="メールアドレスを入力"
									disabled={isLoading}
									class="input w-full px-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>
						{/if}
						
						<div class="mb-4">
							<label for="password" class="block font-medium text-surface-300 mb-2">パスワード</label>
							<input
								id="password"
								type="password"
								bind:value={password}
								placeholder="パスワードを入力"
								disabled={isLoading}
								required
								class="input w-full px-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>
						
						{#if !isLogin}
							<div class="mb-4">
								<label for="confirmPassword" class="block font-medium text-surface-300 mb-2">パスワード確認</label>
								<input
									id="confirmPassword"
									type="password"
									bind:value={confirmPassword}
									placeholder="パスワードを再入力"
									disabled={isLoading}
									required
									class="input w-full px-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>
						{/if}
					{/if}
					
					{#if error}
						<div class="mb-4 p-3 bg-error-500 bg-opacity-20 border border-error-500 border-opacity-30 text-error-300 rounded-lg text-sm">{error}</div>
					{/if}
					
					{#if successMessage}
						<div class="mb-4 p-3 bg-success-500 bg-opacity-20 border border-success-500 border-opacity-30 text-success-300 rounded-lg text-sm">{successMessage}</div>
					{/if}
					
					<div class="mb-6">
						<button type="submit" class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-surface-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
							{#if isLoading}
								処理中...
							{:else if isPasswordReset}
								パスワードリセット用メールを送信
							{:else}
								{isLogin ? 'ログイン' : '新規登録'}
							{/if}
						</button>
					</div>
				</form>
				
				<div class="text-center border-t border-surface-600 pt-4">
					{#if isPasswordReset}
						<p class="text-sm text-surface-400 mb-2">ログインページに戻る</p>
						<button type="button" class="text-primary-400 hover:text-primary-300 font-medium text-sm underline" on:click={backToLogin}>ログイン</button>
					{:else if isLogin}
						<p class="text-sm text-surface-400 mb-2">アカウントをお持ちでない方は</p>
						<button type="button" class="text-primary-400 hover:text-primary-300 font-medium text-sm underline" on:click={toggleMode}>新規登録</button>
						<p class="text-sm text-surface-400 mt-4 mb-2">パスワードを忘れた方は</p>
						<button type="button" class="text-primary-400 hover:text-primary-300 font-medium text-sm underline" on:click={showPasswordReset}>パスワードリセット</button>
					{:else}
						<p class="text-sm text-surface-400 mb-2">既にアカウントをお持ちの方は</p>
						<button type="button" class="text-primary-400 hover:text-primary-300 font-medium text-sm underline" on:click={toggleMode}>ログイン</button>
					{/if}
				</div>
				
				<!-- <div class="mt-4 p-3 bg-surface-800 bg-opacity-50 border border-surface-600 border-opacity-30 rounded-lg">
					{#if isDemoMode()}
						<p class="text-xs text-surface-300 text-center leading-relaxed">
							<strong class="text-surface-200">🔄 デモモード:</strong><br>
							任意のユーザー名・パスワードでログイン可能<br>
							<small class="text-surface-400">データはブラウザに保存されます</small>
						</p>
					{:else}
						<p class="text-xs text-surface-300 text-center leading-relaxed">
							<strong class="text-surface-200">🌐 Supabaseモード:</strong><br>
							本格的な認証・データベース機能を使用<br>
							<small class="text-surface-400">アカウント作成には有効なメールアドレスが必要です</small>
						</p>
					{/if}
				</div> -->
			</div>
		</div>
	</div>
{/if}