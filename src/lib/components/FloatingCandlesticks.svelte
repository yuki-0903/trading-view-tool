<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	export let isFeatureViewMode = false;
	export let selectedFeature = null;

	let canvasContainer: HTMLDivElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number;
	let candlesticks: THREE.Group[] = [];
	let isAnimatingToChart = false;
	let showDebugPanel = false;
	let candlestickData: Array<{open: number, close: number, x: number}> = [];
	
	// Neon Cyber Theme colors
	const colors = {
		background: 0x13151b,
		green: 0x00ff88,    // ネオングリーン（陽線）
		pink: 0xff0080,     // ホットピンク（陰線）
		accent: 0x1a1a2e    // アクセント
	};

	// ローソク足を作成する関数
	function createCandlestick(x: number, y: number, z: number) {
		const group = new THREE.Group();
		
		// 可愛いローソク足の属性（実体長め、ヒゲ短め）
		const isGreen = Math.random() > 0.5;
		const candleType = Math.random();
		
		let bodyHeight, upperWickHeight, lowerWickHeight, width;
		
		// より多様な実体とヒゲの組み合わせ（ヒゲは控えめに）
		if (candleType < 0.2) {
			// 長い陽線・陰線（大きな値動き）
			bodyHeight = Math.random() * 1.2 + 0.8; // 0.8-2.0 (長い実体)
			upperWickHeight = Math.random() * 0.3 + 0.05; // 0.05-0.35 (短いヒゲ)
			lowerWickHeight = Math.random() * 0.3 + 0.05;
			width = 0.1;
		} else if (candleType < 0.35) {
			// 短い実体、やや長めのヒゲ（十字線・コマ）
			bodyHeight = Math.random() * 0.4 + 0.1; // 0.1-0.5 (短い実体)
			upperWickHeight = Math.random() * 0.6 + 0.2; // 0.2-0.8 (適度なヒゲ)
			lowerWickHeight = Math.random() * 0.6 + 0.2;
			width = 0.1;
		} else if (candleType < 0.5) {
			// 上ヒゲがやや長い（売り圧力）
			bodyHeight = Math.random() * 0.8 + 0.3; // 0.3-1.1
			upperWickHeight = Math.random() * 0.6 + 0.3; // 0.3-0.9 (やや長い上ヒゲ)
			lowerWickHeight = Math.random() * 0.2 + 0.05; // 0.05-0.25 (短い下ヒゲ)
			width = 0.1;
		} else if (candleType < 0.65) {
			// 下ヒゲがやや長い（買い支え）
			bodyHeight = Math.random() * 0.8 + 0.3; // 0.3-1.1
			upperWickHeight = Math.random() * 0.2 + 0.05; // 0.05-0.25 (短い上ヒゲ)
			lowerWickHeight = Math.random() * 0.6 + 0.3; // 0.3-0.9 (やや長い下ヒゲ)
			width = 0.1;
		} else if (candleType < 0.85) {
			// 中程度の実体、バランスの取れたヒゲ（標準的）
			bodyHeight = Math.random() * 0.8 + 0.4; // 0.4-1.2
			upperWickHeight = Math.random() * 0.4 + 0.1; // 0.1-0.5
			lowerWickHeight = Math.random() * 0.4 + 0.1;
			width = 0.1;
		} else {
			// 小さめの実体（値動き少ない）
			bodyHeight = Math.random() * 0.3 + 0.2; // 0.2-0.5 (小さめ実体)
			upperWickHeight = Math.random() * 0.3 + 0.1; // 0.1-0.4
			lowerWickHeight = Math.random() * 0.3 + 0.1;
			width = 0.1;
		}
		
		// メイン部分（実体）- カプセル型（角丸の円柱）
		const bodyGeometry = new THREE.CylinderGeometry(width/2, width/2, bodyHeight, 16);
		const bodyMaterial = new THREE.MeshBasicMaterial({ 
			color: isGreen ? colors.green : colors.pink
		});
		const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
		
		// 上下にキャップ（半球）を追加してカプセル型に
		const capGeometry = new THREE.SphereGeometry(width/2, 8, 4, 0, Math.PI * 2, 0, Math.PI/2);
		const topCap = new THREE.Mesh(capGeometry, bodyMaterial);
		topCap.position.y = bodyHeight/2;
		
		const bottomCapGeometry = new THREE.SphereGeometry(width/2, 8, 4, 0, Math.PI * 2, Math.PI/2, Math.PI/2);
		const bottomCap = new THREE.Mesh(bottomCapGeometry, bodyMaterial);
		bottomCap.position.y = -bodyHeight/2;
		
		group.add(body);
		group.add(topCap);
		group.add(bottomCap);
		
		// 陽線・陰線判別のための情報を保存
		(group as any).initialColor = isGreen ? colors.green : colors.pink;
		(group as any).materials = []; // 全ての材質を保存
		
		// 材質を配列に保存（メッシュのみ）
		group.traverse((child) => {
			if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
				(group as any).materials.push(child.material);
			}
		});
		
		// 上ヒゲ - 個別の長さで作成
		if (upperWickHeight > 0.05) { // 最小長さチェック
			const upperWickGeometry = new THREE.CylinderGeometry(width/15, width/15, upperWickHeight, 12);
			const upperWickMaterial = new THREE.MeshBasicMaterial({ 
				color: isGreen ? colors.green : colors.pink
			});
			const upperWick = new THREE.Mesh(upperWickGeometry, upperWickMaterial);
			
			// 上ヒゲの先端に小さな球体を追加
			const upperWickCapGeometry = new THREE.SphereGeometry(width/15, 6, 6);
			const upperWickCap = new THREE.Mesh(upperWickCapGeometry, upperWickMaterial);
			upperWickCap.position.y = upperWickHeight / 2;
			upperWick.add(upperWickCap);
			
			const upperWickBottomCap = new THREE.Mesh(upperWickCapGeometry, upperWickMaterial);
			upperWickBottomCap.position.y = -upperWickHeight / 2;
			upperWick.add(upperWickBottomCap);
			
			upperWick.position.y = bodyHeight/2 + upperWickHeight/2;
			group.add(upperWick);
		}
		
		// 下ヒゲ - 個別の長さで作成
		if (lowerWickHeight > 0.05) { // 最小長さチェック
			const lowerWickGeometry = new THREE.CylinderGeometry(width/15, width/15, lowerWickHeight, 12);
			const lowerWickMaterial = new THREE.MeshBasicMaterial({ 
				color: isGreen ? colors.green : colors.pink
			});
			const lowerWick = new THREE.Mesh(lowerWickGeometry, lowerWickMaterial);
			
			// 下ヒゲの先端に小さな球体を追加
			const lowerWickCapGeometry = new THREE.SphereGeometry(width/15, 6, 6);
			const lowerWickCap = new THREE.Mesh(lowerWickCapGeometry, lowerWickMaterial);
			lowerWickCap.position.y = lowerWickHeight / 2;
			lowerWick.add(lowerWickCap);
			
			const lowerWickBottomCap = new THREE.Mesh(lowerWickCapGeometry, lowerWickMaterial);
			lowerWickBottomCap.position.y = -lowerWickHeight / 2;
			lowerWick.add(lowerWickBottomCap);
			
			lowerWick.position.y = -(bodyHeight/2 + lowerWickHeight/2);
			group.add(lowerWick);
		}
		
		// アウトライン（エッジ）を削除 - 実体に変な線が入る問題を解決
		// const edgesGeometry = new THREE.EdgesGeometry(bodyGeometry);
		// const edgesMaterial = new THREE.LineBasicMaterial({ 
		// 	color: isGreen ? colors.green : colors.pink,
		// 	linewidth: 2
		// });
		// const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
		// group.add(edges);
		
		group.position.set(x, y, z);
		
		// アニメーション用のランダムな速度と回転を設定
		(group as any).velocity = {
			x: (Math.random() - 0.5) * 0.01,
			y: (Math.random() - 0.5) * 0.01,
			z: (Math.random() - 0.5) * 0.01
		};
		
		(group as any).rotationSpeed = {
			x: (Math.random() - 0.5) * 0.02,
			y: (Math.random() - 0.5) * 0.02,
			z: (Math.random() - 0.5) * 0.02
		};
		
		return group;
	}

	function initThreeJS() {
		// シーンの作成
		scene = new THREE.Scene();
		scene.background = new THREE.Color(colors.background);
		
		// カメラの作成（Orthographicカメラに変更して遠近感を無くす）
		const aspect = window.innerWidth / window.innerHeight;
		const frustumSize = 10;
		camera = new THREE.OrthographicCamera(
			frustumSize * aspect / -2, 
			frustumSize * aspect / 2, 
			frustumSize / 2, 
			frustumSize / -2, 
			1, 
			1000
		) as any;
		camera.position.z = 5;
		
		// レンダラーの作成
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(colors.background, 1);
		
		canvasContainer.appendChild(renderer.domElement);
		
		// 環境光を追加
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);
		
		// ポイントライトを追加（グロー効果のため）
		const pointLight = new THREE.PointLight(colors.green, 1, 100);
		pointLight.position.set(10, 10, 10);
		scene.add(pointLight);
		
		const pointLight2 = new THREE.PointLight(colors.pink, 1, 100);
		pointLight2.position.set(-10, -10, 10);
		scene.add(pointLight2);
		
		// デバッグ用：XYZ軸を表示
		const axesHelper = new THREE.AxesHelper(5);
		scene.add(axesHelper);
		
		// デバッグ用：グリッドを追加
		const gridHelperXZ = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
		scene.add(gridHelperXZ);
		
		const gridHelperXY = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
		gridHelperXY.rotateX(Math.PI / 2);
		scene.add(gridHelperXY);
		
		// ローソク足を複数作成
		for (let i = 0; i < 50; i++) {
			const x = (Math.random() - 0.5) * 20;
			const y = (Math.random() - 0.5) * 20;
			const z = (Math.random() - 0.5) * 20;
			
			const candlestick = createCandlestick(x, y, z);
			candlesticks.push(candlestick);
			scene.add(candlestick);
		}
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);
		
		if (isFeatureViewMode && !isAnimatingToChart) {
			// チャート形成アニメーションを開始
			animateToChart();
		} else if (!isFeatureViewMode && isAnimatingToChart) {
			// 浮遊状態に戻すアニメーション
			animateToFloat();
		}
		
		// 各ローソク足をアニメーション
		candlesticks.forEach((candlestick, index) => {
			if (!isAnimatingToChart) {
				// 通常の浮遊アニメーション
				const velocity = (candlestick as any).velocity;
				const rotationSpeed = (candlestick as any).rotationSpeed;
				
				// 位置の更新
				candlestick.position.x += velocity.x;
				candlestick.position.y += velocity.y;
				candlestick.position.z += velocity.z;
				
				// 回転の更新
				candlestick.rotation.x += rotationSpeed.x;
				candlestick.rotation.y += rotationSpeed.y;
				candlestick.rotation.z += rotationSpeed.z;
				
				// 境界に到達したら反対側に移動
				const boundary = 15;
				if (Math.abs(candlestick.position.x) > boundary) {
					candlestick.position.x *= -1;
				}
				if (Math.abs(candlestick.position.y) > boundary) {
					candlestick.position.y *= -1;
				}
				if (Math.abs(candlestick.position.z) > boundary) {
					candlestick.position.z *= -1;
				}
			} else {
				// チャート形成中のアニメーション
				const targetPosition = (candlestick as any).targetPosition;
				if (targetPosition) {
					// スムーズに目標位置に移動
					candlestick.position.lerp(targetPosition, 0.05);
					
					// 回転を徐々に停止
					candlestick.rotation.x *= 0.95;
					candlestick.rotation.y *= 0.95;
					candlestick.rotation.z *= 0.95;
				}
			}
		});
		
		// カメラは固定位置に保持
		camera.lookAt(0, 0, 0);
		
		renderer.render(scene, camera);
	}

	function animateToChart() {
		if (isAnimatingToChart) return; // 重複実行を防止
		isAnimatingToChart = true;
		
		// チャート形成：始値・終値を正しく連続させる
		let currentPrice = 0; // 現在の価格レベル（最初のローソク足の始値）
		
		candlesticks.forEach((candlestick, index) => {
			// 画面幅に応じたスケーリング（右端限界まで使用）
			const totalCandles = candlesticks.length;
			const chartWidth = 10; // チャート全体の幅
			const spacing = chartWidth / totalCandles; // 動的な間隔
			const startX = -1; // 右端限界まで使用（-1から+9までの範囲）
			const targetX = startX + index * spacing;
			
			// 前のローソク足の終値が次の始値になるように設定
			const openPrice = currentPrice;
			
			// ランダムな価格変動（小さめ）
			const priceChange = (Math.random() - 0.5) * 0.4; // -0.2 〜 +0.2
			const closePrice = openPrice + priceChange;
			
			// 価格範囲を制限
			const limitedClosePrice = Math.max(-3, Math.min(3, closePrice));
			
			// 始値と終値の中点に配置（ローソク足の中心）
			const centerY = (openPrice + limitedClosePrice) / 2;
			
			// 陽線・陰線の判定と色変更
			const isGreenCandle = limitedClosePrice >= openPrice; // 終値 >= 始値なら陽線
			const newColor = isGreenCandle ? colors.green : colors.pink;
			
			// 色変更のみ行う（形状変更は一切しない）
			candlestick.traverse((child) => {
				if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
					// 材質をクローンして個別に設定
					if (child.material.color.getHex() !== newColor) {
						child.material = child.material.clone();
						child.material.color.setHex(newColor);
					}
				}
			});
			
			// デバッグ用ログ（連続性チェック）
			if (index < 10) {
				const candleType = isGreenCandle ? '陽線' : '陰線';
				// ローソク足の実際のY軸位置を計算
				const openY = centerY + (openPrice - centerY); // 始値のY位置
				const closeY = centerY + (limitedClosePrice - centerY); // 終値のY位置
				console.log(`Candle ${index}: x=${targetX.toFixed(3)}, centerY=${centerY.toFixed(3)} [${candleType}]`);
				console.log(`  開始値: price=${openPrice.toFixed(3)}, y=${openY.toFixed(3)}`);
				console.log(`  終了値: price=${limitedClosePrice.toFixed(3)}, y=${closeY.toFixed(3)}`);
				if (index > 0) {
					const prevCandlestick = candlesticks[index - 1];
					const prevClose = (prevCandlestick as any).closePrice;
					const prevX = (prevCandlestick as any).targetPosition ? (prevCandlestick as any).targetPosition.x : 'N/A';
					const prevY = (prevCandlestick as any).targetPosition ? (prevCandlestick as any).targetPosition.y : 'N/A';
					console.log(`連続性チェック: prev close = ${prevClose.toFixed(3)} (x=${prevX}, y=${prevY}), current open = ${openPrice.toFixed(3)} (y=${openY.toFixed(3)}), 差=${Math.abs(prevClose - openPrice).toFixed(3)}`);
				}
			}
			
			// 目標位置のみ設定（形状は元のまま保持）
			(candlestick as any).targetPosition = new THREE.Vector3(targetX, centerY, 0);
			(candlestick as any).openPrice = openPrice;
			(candlestick as any).closePrice = limitedClosePrice;
			(candlestick as any).isGreenCandle = isGreenCandle;
			
			// GUI用データを保存（最初の10本のみ）
			if (index < 10) {
				if (!candlestickData[index]) {
					candlestickData[index] = { open: openPrice, close: limitedClosePrice, x: targetX };
				} else {
					candlestickData[index].open = openPrice;
					candlestickData[index].close = limitedClosePrice;
					candlestickData[index].x = targetX;
				}
			}
			
			// 重要：次のローソク足用に終値を更新（ここで更新）
			currentPrice = limitedClosePrice;
		});
		
		console.log('Chart formation completed with price continuity');
	}

	function animateToFloat() {
		isAnimatingToChart = false;
		
		// 各ローソク足にランダムな位置を再設定
		candlesticks.forEach(candlestick => {
			(candlestick as any).targetPosition = null;
			
			// 新しいランダムな位置に設定
			candlestick.position.set(
				(Math.random() - 0.5) * 20,
				(Math.random() - 0.5) * 20,
				(Math.random() - 0.5) * 20
			);
		});
	}

	// propsの変更を監視
	$: if (isFeatureViewMode !== undefined) {
		// 状態変更時の処理は animate() 内で行う
	}

	function handleResize() {
		if (camera && renderer) {
			// OrthographicCameraのリサイズ処理
			const aspect = window.innerWidth / window.innerHeight;
			const frustumSize = 10;
			(camera as any).left = frustumSize * aspect / -2;
			(camera as any).right = frustumSize * aspect / 2;
			(camera as any).top = frustumSize / 2;
			(camera as any).bottom = frustumSize / -2;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}
	}

	onMount(() => {
		initThreeJS();
		animate();
		window.addEventListener('resize', handleResize);
	});

	// GUI値の変更を反映する関数
	function updateCandlestickFromGUI(index: number) {
		if (index < candlesticks.length && candlestickData[index]) {
			const candlestick = candlesticks[index];
			const data = candlestickData[index];
			const centerY = (data.open + data.close) / 2;
			
			// 位置を更新
			(candlestick as any).targetPosition = new THREE.Vector3(data.x, centerY, 0);
			(candlestick as any).openPrice = data.open;
			(candlestick as any).closePrice = data.close;
			
			// 色を更新
			const isGreenCandle = data.close >= data.open;
			const newColor = isGreenCandle ? colors.green : colors.pink;
			
			candlestick.traverse((child) => {
				if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
					if (child.material.color.getHex() !== newColor) {
						child.material = child.material.clone();
						child.material.color.setHex(newColor);
					}
				}
			});
			
			console.log(`Updated Candle ${index}: open=${data.open.toFixed(3)}, close=${data.close.toFixed(3)}, center=${centerY.toFixed(3)}`);
		}
	}

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		window.removeEventListener('resize', handleResize);
		
		// Three.jsリソースのクリーンアップ
		if (renderer) {
			canvasContainer?.removeChild(renderer.domElement);
			renderer.dispose();
		}
		
		// メモリリークを防ぐためジオメトリとマテリアルを破棄
		candlesticks.forEach(candlestick => {
			candlestick.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (child.material instanceof THREE.Material) {
						child.material.dispose();
					} else if (Array.isArray(child.material)) {
						child.material.forEach(mat => mat.dispose());
					}
				}
			});
		});
	});
</script>

<div 
	bind:this={canvasContainer} 
	class="fixed inset-0 z-0 pointer-events-none"
	style="background: linear-gradient(135deg, #13151b 0%, #0f0f23 50%, #1a1a2e 100%);"
>
</div>

<!-- デバッグGUIパネル -->
{#if isFeatureViewMode}
	<button 
		class="fixed top-4 right-4 z-50 bg-cyber-green text-black px-4 py-2 rounded pointer-events-auto"
		on:click={() => showDebugPanel = !showDebugPanel}
	>
		{showDebugPanel ? 'デバッグを閉じる' : 'デバッグGUI'}
	</button>

	{#if showDebugPanel}
		<div class="fixed top-16 right-4 z-50 bg-cyber-dark-2/90 backdrop-blur-md border border-cyber-green/30 rounded-lg p-4 max-h-96 overflow-y-auto pointer-events-auto">
			<h3 class="text-cyber-green text-lg font-bold mb-4">ローソク足調整</h3>
			
			{#each candlestickData.slice(0, 10) as data, index}
				<div class="mb-4 p-3 bg-cyber-dark-3/50 rounded border border-cyber-green/10">
					<h4 class="text-cyber-green font-semibold mb-2">Candle {index}</h4>
					
					<div class="mb-2">
						<label class="block text-cyber-text-muted text-sm mb-1">始値 (Open)</label>
						<input 
							type="range" 
							min="-3" 
							max="3" 
							step="0.01"
							bind:value={data.open}
							on:input={() => updateCandlestickFromGUI(index)}
							class="w-full h-2 bg-cyber-dark-3 rounded-lg appearance-none cursor-pointer slider-cyber"
						/>
						<span class="text-cyber-text-muted text-xs">{data.open.toFixed(3)}</span>
					</div>
					
					<div class="mb-2">
						<label class="block text-cyber-text-muted text-sm mb-1">終値 (Close)</label>
						<input 
							type="range" 
							min="-3" 
							max="3" 
							step="0.01"
							bind:value={data.close}
							on:input={() => updateCandlestickFromGUI(index)}
							class="w-full h-2 bg-cyber-dark-3 rounded-lg appearance-none cursor-pointer slider-cyber"
						/>
						<span class="text-cyber-text-muted text-xs">{data.close.toFixed(3)}</span>
					</div>
					
					<div class="text-xs text-cyber-text-muted">
						X位置: {data.x.toFixed(3)} | 
						中心Y: {((data.open + data.close) / 2).toFixed(3)} |
						{data.close >= data.open ? '陽線' : '陰線'}
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	/* グローバルなオーバーライドでcanvasのz-indexを制御 */
	:global(canvas) {
		position: fixed !important;
		top: 0;
		left: 0;
		z-index: -1 !important;
		pointer-events: none;
	}

	/* スライダーのサイバー風スタイル */
	.slider-cyber::-webkit-slider-thumb {
		appearance: none;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #00ff88;
		box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
		cursor: pointer;
		border: none;
	}

	.slider-cyber::-moz-range-thumb {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #00ff88;
		box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
		cursor: pointer;
		border: none;
	}

	.slider-cyber:focus::-webkit-slider-thumb {
		box-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
	}
</style>