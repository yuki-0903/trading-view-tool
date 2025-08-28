import { handler } from './index.js';

/**
 * ローカルテスト用スクリプト
 */
async function test() {
    console.log('🧪 ダイバージェンス監視のローカルテスト開始');
    
    // 環境変数チェック
    if (!process.env.LINE_NOTIFY_TOKEN) {
        console.log('⚠️ LINE_NOTIFY_TOKEN環境変数が設定されていません（通知はスキップされます）');
    }
    
    try {
        const result = await handler({});
        console.log('✅ テスト成功:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ テスト失敗:', error);
        process.exit(1);
    }
}

// テスト実行
test();