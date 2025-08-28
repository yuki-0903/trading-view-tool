import { sendLineNotification } from './lineNotificationService.js';

/**
 * LINE Messaging API 接続テスト
 */
async function testLineNotification() {
    console.log('🧪 LINE Messaging API 接続テスト開始');
    
    // 環境変数チェック
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ LINE_CHANNEL_ACCESS_TOKEN環境変数が設定されていません');
        process.exit(1);
    }
    
    if (!process.env.LINE_USER_ID) {
        console.error('❌ LINE_USER_ID環境変数が設定されていません');
        process.exit(1);
    }
    
    console.log('✅ 環境変数設定確認完了');
    console.log(`📱 Channel Access Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log(`👤 User ID: ${process.env.LINE_USER_ID}`);
    
    try {
        const testMessage = `🧪 Lambda監視テスト

📊 LINE Messaging API 接続確認
⏰ テスト実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

✅ このメッセージが表示されれば設定は正常です！

🚀 AWS Lambda デプロイの準備が完了しました。`;

        console.log('📤 テストメッセージ送信中...');
        await sendLineNotification(testMessage);
        
        console.log('✅ LINE通知テスト成功！');
        console.log('📱 LINEアプリでメッセージを確認してください');
        
    } catch (error) {
        console.error('❌ LINE通知テスト失敗:', error.message);
        
        // エラー詳細の表示
        if (error.message.includes('Channel Access Token')) {
            console.error('💡 Channel Access Tokenが無効です。LINE Developers コンソールで確認してください。');
        } else if (error.message.includes('User ID')) {
            console.error('💡 User IDが無効か、ユーザーがBotをブロックしています。');
        } else if (error.message.includes('rate limit')) {
            console.error('💡 レート制限に引っかかりました。しばらく待ってから再実行してください。');
        }
        
        process.exit(1);
    }
}

// テスト実行
testLineNotification();