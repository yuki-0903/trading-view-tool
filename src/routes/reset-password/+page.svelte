<script lang="ts">
	import { onMount } from 'svelte';
	import { supabaseAuthService } from '$lib/stores/supabaseAuth';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';

	let newPassword = '';
	let confirmPassword = '';
	let isLoading = false;
	let error = '';
	let success = false;
	let accessToken = '';
	let refreshToken = '';
	let initialCheckDone = false;

	onMount(() => {
		// URLからアクセストークンとリフレッシュトークンを取得
		const urlParams = new URLSearchParams($page.url.searchParams);
		const urlHash = $page.url.hash;
		
		console.log('パスワードリセットページにアクセス', {
			url: $page.url.href,
			searchParams: Object.fromEntries(urlParams.entries()),
			hash: urlHash
		});

		// URLのクエリパラメータから取得を試行
		accessToken = urlParams.get('access_token') || '';
		refreshToken = urlParams.get('refresh_token') || '';

		// ハッシュフラグメントからも取得を試行（Supabaseの一般的な形式）
		if (!accessToken && urlHash) {
			const hashParams = new URLSearchParams(urlHash.substring(1)); // # を削除
			accessToken = hashParams.get('access_token') || '';
			refreshToken = hashParams.get('refresh_token') || '';
		}

		// type=recoveryパラメータがある場合もチェック
		const type = urlParams.get('type') || (urlHash ? new URLSearchParams(urlHash.substring(1)).get('type') : '');
		
		console.log('取得した認証情報:', {
			accessToken: accessToken ? 'あり' : 'なし',
			refreshToken: refreshToken ? 'あり' : 'なし',
			type: type
		});

		// Supabaseの認証状態変化を監視
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			console.log('認証状態変化:', event, session?.access_token ? 'トークンあり' : 'トークンなし');
			
			if (event === 'PASSWORD_RECOVERY' && session) {
				accessToken = session.access_token;
				refreshToken = session.refresh_token;
				error = ''; // エラーをクリア
				console.log('パスワードリカバリーセッション取得成功');
			}
			
			// パスワード更新後のサインイン状態
			if (event === 'SIGNED_IN' && session && isLoading) {
				console.log('パスワード更新完了、サインイン成功');
				isLoading = false; // ローディング状態を解除
				success = true;
				setTimeout(() => {
					goto('/');
				}, 3000);
			}
			
			// 初回チェック完了後、トークンがない場合にエラーを表示
			if (!initialCheckDone) {
				initialCheckDone = true;
				setTimeout(() => {
					if (!accessToken) {
						error = '無効なリセットリンクです。新しいパスワードリセット要求を行ってください。';
					}
				}, 1000); // 1秒待機してからチェック
			}
		});

		// コンポーネント破棄時にリスナーを削除
		return () => {
			subscription.unsubscribe();
		};
	});

	async function handlePasswordUpdate() {
		error = '';
		
		if (!newPassword || !confirmPassword) {
			error = 'パスワードと確認パスワードを入力してください';
			return;
		}

		if (newPassword !== confirmPassword) {
			error = 'パスワードが一致しません';
			return;
		}

		if (newPassword.length < 6) {
			error = 'パスワードは6文字以上で入力してください';
			return;
		}

		if (!accessToken) {
			error = '無効なリセットリンクです';
			return;
		}

		isLoading = true;

		try {
			const result = await supabaseAuthService.updatePassword(newPassword, accessToken, refreshToken);
			console.log('パスワード更新結果:', result);
			
			if (result.success) {
				// 成功時は認証状態変化イベントでハンドルされるため、ここではローディング状態のみ解除
				// success = true; と isLoading = false; は認証状態変化で処理
				console.log('パスワード更新成功、認証状態変化を待機中...');
				
				// 5秒後に強制的にローディング状態を解除（フォールバック）
				setTimeout(() => {
					if (isLoading) {
						console.log('タイムアウト: 強制的にローディング状態を解除');
						isLoading = false;
						success = true;
						setTimeout(() => goto('/'), 2000);
					}
				}, 5000);
			} else {
				error = result.error || 'パスワード更新に失敗しました';
				isLoading = false;
			}
		} catch (err) {
			error = 'エラーが発生しました。もう一度お試しください。';
			console.error('Password update error:', err);
			isLoading = false;
		}
	}

	function goToLogin() {
		goto('/');
	}
</script>

<svelte:head>
	<title>パスワードリセット - Trading View Tool</title>
</svelte:head>

<Header />

<main>
	<div class="reset-container">
		<div class="reset-content">
			{#if success}
				<div class="success-section">
					<div class="success-icon">✅</div>
					<h2 class="text-2xl font-bold text-primary-400 mb-7">パスワード更新完了</h2>
					<p>パスワードが正常に更新されました。</p>
					<p class="redirect-text">3秒後にメインページに自動で移動します...</p>
					<button class="redirect-btn" on:click={goToLogin}>
						今すぐメインページに移動
					</button>
				</div>
			{:else}
				<div class="form-section">
					<div class="form-header">
						<h2 class="text-2xl font-bold text-primary-400 mb-7">🔑 新しいパスワードを設定</h2>
						<p>新しいパスワードを入力してください</p>
					</div>

					<form on:submit|preventDefault={handlePasswordUpdate}>
						<div class="form-group">
							<label for="newPassword">新しいパスワード</label>
							<input
								id="newPassword"
								type="password"
								bind:value={newPassword}
								placeholder="新しいパスワードを入力"
								disabled={isLoading}
								required
							/>
						</div>

						<div class="form-group">
							<label for="confirmPassword">パスワード確認</label>
							<input
								id="confirmPassword"
								type="password"
								bind:value={confirmPassword}
								placeholder="パスワードを再入力"
								disabled={isLoading}
								required
							/>
						</div>

						{#if error}
							<div class="error-message">{error}</div>
						{/if}

						<div class="form-actions">
							<button 
								type="submit" 
								class="submit-btn" 
								disabled={isLoading || !accessToken}
							>
								{#if isLoading}
									更新中...
								{:else}
									パスワードを更新
								{/if}
							</button>
						</div>
					</form>

					<div class="back-to-login">
						<button class="link-btn" on:click={goToLogin}>
							← メインページに戻る
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	main {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.reset-container {
		min-height: 70vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f8f9fa, #e3f2fd);
		border-radius: 16px;
		margin: 2rem 0;
		box-shadow: 0 8px 32px rgba(0,0,0,0.1);
	}

	.reset-content {
		text-align: center;
		max-width: 400px;
		padding: 3rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 16px rgba(0,0,0,0.1);
		width: 100%;
	}

	.form-header h2 {
		margin: 0 0 0.5rem 0;
		color: #1565c0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.form-header p {
		margin: 0 0 2rem 0;
		color: #666;
		font-size: 1rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
		text-align: left;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e1e1e1;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #007bff;
	}

	.form-group input:disabled {
		background: #f8f9fa;
		cursor: not-allowed;
	}

	.error-message {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		border: 1px solid #f5c6cb;
		font-size: 0.9rem;
		text-align: left;
	}

	.form-actions {
		margin: 1.5rem 0;
	}

	.submit-btn {
		width: 100%;
		background: linear-gradient(135deg, #007bff, #0056b3);
		color: white;
		border: none;
		padding: 0.875rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(0,123,255,0.3);
	}

	.submit-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #0056b3, #004085);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0,123,255,0.4);
	}

	.submit-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.back-to-login {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e1e1e1;
	}

	.link-btn {
		background: none;
		border: none;
		color: #007bff;
		cursor: pointer;
		font-weight: 600;
		text-decoration: underline;
		font-size: 0.9rem;
	}

	.link-btn:hover {
		color: #0056b3;
	}

	.success-section {
		text-align: center;
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: bounce 2s infinite;
	}

	@keyframes bounce {
		0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-10px); }
		60% { transform: translateY(-5px); }
	}

	.success-section h2 {
		margin: 0 0 1rem 0;
		color: #28a745;
		font-size: 2rem;
		font-weight: 700;
	}

	.success-section p {
		margin: 0 0 1rem 0;
		color: #333;
		line-height: 1.5;
	}

	.redirect-text {
		font-size: 0.9rem;
		color: #666;
		font-style: italic;
	}

	.redirect-btn {
		background: linear-gradient(135deg, #28a745, #20c997);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(40,167,69,0.3);
		margin-top: 1rem;
	}

	.redirect-btn:hover {
		background: linear-gradient(135deg, #20c997, #17a2b8);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(40,167,69,0.4);
	}

	/* レスポンシブ対応 */
	@media (max-width: 768px) {
		.reset-content {
			padding: 2rem 1rem;
		}
		
		.form-header h2 {
			font-size: 1.5rem;
		}
	}
</style>