<script lang="ts">
  import AuthModal from './AuthModal.svelte';
  import { AlignHorizontalDistributeCenter } from 'lucide-svelte';

  let showAuthModal = false;

  function handleLogin() {
		showAuthModal = true;
	}

  function handleAuthSuccess() {
		showAuthModal = false;
	}

	function handleAuthClose() {
		showAuthModal = false;
	}
</script>

<header class="bg-gray-800 text-white p-4">
  <div class="container mx-auto flex justify-between items-center">
      <!-- 左側: アイコン -->
      <div class="flex items-center">
          <AlignHorizontalDistributeCenter />
      </div>

      <!-- 右側: メニュー -->
      <nav class="flex space-x-4">
          <a href="#" class="hover:text-gray-300">ホーム</a>
          <a href="#" class="hover:text-gray-300" on:click={handleLogin}>ログイン</a>
      </nav>
  </div>
</header>
<div class="login-required">
  <div class="login-content text-center flex flex-col items-center justify-center min-h-screen">
    <div>
      <p class="login-description mb-4 leading-7">
        Trading View Toolをご利用いただくには、ログインが必要です。<br>
        ログインすると、以下の機能をご利用いただけます：
      </p>
      <button class="btn btn-lg preset-filled-primary-500" on:click={handleLogin}>
        ログイン
      </button>
    </div>

    <AuthModal 
      bind:isOpen={showAuthModal} 
      on:success={handleAuthSuccess}
      on:close={handleAuthClose}
    />
  </div>
</div>