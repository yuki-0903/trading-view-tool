<script lang="ts">
  import AuthModal from './AuthModal.svelte';
  import FloatingCandlesticks from './FloatingCandlesticks.svelte';
  import { AlignHorizontalDistributeCenter, TrendingUp, Target, TestTube, Settings } from 'lucide-svelte';

  let showAuthModal = false;
  let selectedFeature = null; // 選択された機能
  let isFeatureViewMode = false; // 機能詳細表示モード

  function handleLogin() {
		showAuthModal = true;
	}

  function handleFeatureClick(feature) {
    selectedFeature = feature;
    isFeatureViewMode = true;
  }

  function handleBackToMain() {
    isFeatureViewMode = false;
    selectedFeature = null;
  }

  function handleAuthSuccess() {
		showAuthModal = false;
	}

	function handleAuthClose() {
		showAuthModal = false;
	}
</script>

<!-- 3D浮遊ローソク足背景 -->
<FloatingCandlesticks {isFeatureViewMode} {selectedFeature} />

<div class="relative z-10">
  <header class="bg-gradient-to-r from-cyber-dark-2/20 to-cyber-dark-3/20 backdrop-blur-md border-b border-cyber-green/20 text-white p-4">
    <div class="container mx-auto flex justify-between items-center">
        <!-- 左側: アイコン -->
        <div class="flex items-center">
            <AlignHorizontalDistributeCenter class="text-cyber-green" />
            <span class="ml-2 text-xl font-bold text-cyber-green">Trading View Tool</span>
        </div>

        <!-- 右側: メニュー -->
        <nav class="flex space-x-4">
            <a href="#" class="hover:text-cyber-green transition-colors duration-200">ホーム</a>
            <a href="#" class="hover:text-cyber-green transition-colors duration-200" on:click={handleLogin}>ログイン</a>
        </nav>
    </div>
  </header>

  <div class="login-required relative">
    {#if !isFeatureViewMode}
      <div class="login-content text-center flex flex-col items-center justify-center min-h-screen px-6">
        <div class="bg-gradient-to-br from-cyber-dark-2/10 to-cyber-dark-3/10 backdrop-blur-lg border border-cyber-green/20 rounded-2xl p-12 shadow-2xl max-w-2xl mx-auto">
        <!-- タイトル -->
        <div class="mb-8">
          <h1 class="text-5xl font-bold text-cyber-green mb-4 animate-pulse">
            Trading View Tool
          </h1>
          <div class="h-1 bg-gradient-to-r from-transparent via-cyber-green to-transparent rounded-full"></div>
        </div>

        <!-- 説明文 -->
        <div class="mb-10">
          <p class="text-cyber-text-muted mb-6 leading-7 text-lg">
            次世代のトレーディング分析ツールへようこそ<br>
            リアルタイムチャート分析とダイバージェンス検出機能をご利用ください
          </p>
          
          <!-- 機能一覧 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
            <button class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4 text-left hover:bg-cyber-green/10 transition-all duration-300 transform hover:scale-105" on:click={() => handleFeatureClick('realtime')}>
              <div class="text-cyber-green font-semibold mb-2 flex items-center gap-2">
                <TrendingUp size={18} />
                リアルタイム分析
              </div>
              <div class="text-cyber-text-muted">GMO証券APIから最新データを取得</div>
            </button>
            <button class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4 text-left hover:bg-cyber-pink/10 transition-all duration-300 transform hover:scale-105" on:click={() => handleFeatureClick('divergence')}>
              <div class="text-cyber-pink font-semibold mb-2 flex items-center gap-2">
                <Target size={18} />
                ダイバージェンス検出
              </div>
              <div class="text-cyber-text-muted">RSIとの乖離を自動検出</div>
            </button>
            <button class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4 text-left hover:bg-cyber-green/10 transition-all duration-300 transform hover:scale-105" on:click={() => handleFeatureClick('backtest')}>
              <div class="text-cyber-green font-semibold mb-2 flex items-center gap-2">
                <TestTube size={18} />
                バックテスト
              </div>
              <div class="text-cyber-text-muted">過去データでの戦略検証</div>
            </button>
            <button class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4 text-left hover:bg-cyber-pink/10 transition-all duration-300 transform hover:scale-105" on:click={() => handleFeatureClick('settings')}>
              <div class="text-cyber-pink font-semibold mb-2 flex items-center gap-2">
                <Settings size={18} />
                カスタム設定
              </div>
              <div class="text-cyber-text-muted">パラメータの細かな調整</div>
            </button>
          </div>
        </div>

        <!-- ログインボタン -->
        <button 
          class="btn-cyber-primary text-xl px-12 py-4 font-semibold uppercase tracking-wider transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyber-green/25" 
          on:click={handleLogin}
        >
          ログイン / 新規登録
        </button>
        
        <!-- サブテキスト -->
        <p class="text-cyber-text-muted text-sm mt-6 opacity-70">
          無料でアカウント作成が可能です
        </p>
        </div>
      </div>
    {:else}
      <!-- 機能詳細表示モード -->
      <div class="flex min-h-screen">
        <!-- 左側: 詳細パネル -->
        <div class="w-1/2 p-8 flex flex-col justify-center">
          <div class="bg-gradient-to-br from-cyber-dark-2/20 to-cyber-dark-3/20 backdrop-blur-lg border border-cyber-green/20 rounded-2xl p-8 shadow-2xl">
            <button class="text-cyber-green hover:text-white mb-6 flex items-center gap-2" on:click={handleBackToMain}>
              ← 戻る
            </button>
            
            {#if selectedFeature === 'realtime'}
              <div class="text-cyber-green">
                <TrendingUp size={32} class="mb-4" />
                <h2 class="text-3xl font-bold mb-4">リアルタイム分析</h2>
                <p class="text-cyber-text-muted mb-6">GMO証券のAPIを通じて、リアルタイムの為替レートを取得し、チャート分析を行います。</p>
                
                <div class="space-y-4">
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">主要通貨ペア対応</h3>
                    <p class="text-cyber-text-muted text-sm">USD/JPY, EUR/JPY, GBP/JPY, AUD/JPY, EUR/USD</p>
                  </div>
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">多彩な時間足</h3>
                    <p class="text-cyber-text-muted text-sm">1分足から1日足まで、様々な時間軸でのチャート分析が可能</p>
                  </div>
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">自動更新機能</h3>
                    <p class="text-cyber-text-muted text-sm">設定した間隔で自動的にデータを更新し、最新の市場状況を把握</p>
                  </div>
                </div>
              </div>
            {:else if selectedFeature === 'divergence'}
              <div class="text-cyber-pink">
                <Target size={32} class="mb-4" />
                <h2 class="text-3xl font-bold mb-4">ダイバージェンス検出</h2>
                <p class="text-cyber-text-muted mb-6">価格とRSIの乖離を自動検出し、トレンド転換のサインを捉えます。</p>
                
                <div class="space-y-4">
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">強気・弱気ダイバージェンス</h3>
                    <p class="text-cyber-text-muted text-sm">上昇・下降トレンドの転換点を高精度で検出</p>
                  </div>
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">カスタマイズ可能</h3>
                    <p class="text-cyber-text-muted text-sm">検出感度やパラメータを細かく調整可能</p>
                  </div>
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">リアルタイム通知</h3>
                    <p class="text-cyber-text-muted text-sm">新しいダイバージェンスを検出時に即座に通知</p>
                  </div>
                </div>
              </div>
            {:else if selectedFeature === 'backtest'}
              <div class="text-cyber-green">
                <TestTube size={32} class="mb-4" />
                <h2 class="text-3xl font-bold mb-4">バックテスト</h2>
                <p class="text-cyber-text-muted mb-6">過去のデータを使用して、取引戦略の有効性を検証します。</p>
                
                <div class="space-y-4">
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">戦略検証</h3>
                    <p class="text-cyber-text-muted text-sm">ダイバージェンス戦略の過去パフォーマンスを分析</p>
                  </div>
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">詳細レポート</h3>
                    <p class="text-cyber-text-muted text-sm">勝率、利益率、最大ドローダウンなどの統計情報</p>
                  </div>
                  <div class="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                    <h3 class="text-cyber-green font-semibold mb-2">パラメータ最適化</h3>
                    <p class="text-cyber-text-muted text-sm">最適な設定値を見つけるための分析機能</p>
                  </div>
                </div>
              </div>
            {:else if selectedFeature === 'settings'}
              <div class="text-cyber-pink">
                <Settings size={32} class="mb-4" />
                <h2 class="text-3xl font-bold mb-4">カスタム設定</h2>
                <p class="text-cyber-text-muted mb-6">各機能のパラメータを細かく調整できます。</p>
                
                <div class="space-y-4">
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">検出パラメータ</h3>
                    <p class="text-cyber-text-muted text-sm">ピーク検出範囲、最小・最大距離の調整</p>
                  </div>
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">取引設定</h3>
                    <p class="text-cyber-text-muted text-sm">損切り・利確幅、ポジションサイズの設定</p>
                  </div>
                  <div class="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-4">
                    <h3 class="text-cyber-pink font-semibold mb-2">通知設定</h3>
                    <p class="text-cyber-text-muted text-sm">アラートの条件や頻度をカスタマイズ</p>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- 右側: チャート領域（ローソク足がここに集まる） -->
        <div class="w-1/2 flex items-center justify-center">
          <div class="text-cyber-text-muted text-center">
            <p class="mb-4">右側にローソク足が集まって</p>
            <p>チャートが形成されます</p>
          </div>
        </div>
      </div>
    {/if}

    <AuthModal 
      bind:isOpen={showAuthModal} 
      on:success={handleAuthSuccess}
      on:close={handleAuthClose}
    />
  </div>
</div>

<style>
  .btn-cyber-primary {
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
    color: #00ff88;
    border: 2px solid #00ff88;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
    position: relative;
    overflow: hidden;
  }
  
  .btn-cyber-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.1), transparent);
    transition: left 0.6s;
  }
  
  .btn-cyber-primary:hover::before {
    left: 100%;
  }
  
  .btn-cyber-primary:hover {
    background: linear-gradient(135deg, #00ff88 0%, #00cc6f 100%);
    color: #000;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
  }
</style>