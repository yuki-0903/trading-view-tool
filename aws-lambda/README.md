# Divergence Monitor AWS Lambda

AWS Lambdaを使用したダイバージェンス監視システムです。定期的に為替データを取得してダイバージェンスを検出し、LINE通知で結果をお知らせします。

## 🌟 機能

- **自動監視**: 平日1時間毎にダイバージェンスをチェック
- **LINE通知**: 新しいダイバージェンス検出時に自動通知
- **エラー監視**: CloudWatch Alarmsによる障害監視
- **ログ管理**: 30日間のログ保持とデッドレターキュー

## 📋 前提条件

1. **AWS CLI** のインストールと設定
2. **AWS SAM CLI** のインストール
3. **Node.js 18.x** 以上
4. **LINE Bot の設定** と User ID の取得

## 🚀 セットアップ手順

### 1. LINE Bot 設定

既存のアプリケーションでLINE Botが設定済みの場合、同じ設定を使用できます。

**新規設定の場合:**
1. [LINE Developers](https://developers.line.biz/) にアクセス
2. Messaging APIチャネルを作成
3. Channel Access Token を取得
4. LINE User ID を取得（Webhook経由または開発者ツールで確認）

### 2. 環境変数設定

```bash
export LINE_CHANNEL_ACCESS_TOKEN='your_channel_access_token_here'
export LINE_USER_ID='your_line_user_id_here'
```

### 3. デプロイ実行

```bash
cd aws-lambda
./deploy.sh
```

初回デプロイ時は対話形式で設定を行います：

```
Setting default arguments for 'sam deploy'
=========================================
Stack Name [sam-app]: divergence-monitor-stack
AWS Region [us-east-1]: ap-northeast-1
Parameter LineChannelAccessToken []: (自動設定済み)
Parameter LineUserId []: (自動設定済み)
Parameter MonitoringSchedule [cron(0 */1 * * MON-FRI *)]: (Enter)
#Shows you resources changes to be deployed and require a 'Y' to initiate deploy
Confirm changes before deploy [y/N]: y
#SAM needs permission to be able to create roles to connect to the resources in your template
Allow SAM to create IAM roles [Y/n]: Y
```

## ⏰ スケジュール設定

デフォルトスケジュール: **平日1時間毎**
```
cron(0 */1 * * MON-FRI *)
```

### カスタムスケジュール例

```bash
# 平日30分毎
sam deploy --parameter-overrides MonitoringSchedule="cron(0,30 * * * MON-FRI *)"

# 平日の市場時間のみ (9:00-17:00)
sam deploy --parameter-overrides MonitoringSchedule="cron(0 9-17 * * MON-FRI *)"

# 土曜日も含める
sam deploy --parameter-overrides MonitoringSchedule="cron(0 */1 * * MON-SAT *)"
```

## 📊 監視設定

### CloudWatch Logs
- ロググループ: `/aws/lambda/divergence-monitor`
- 保持期間: 30日間

### CloudWatch Alarms
1. **エラーアラーム**: 関数実行エラー時にアラート
2. **実行時間アラーム**: 実行時間が4分を超えた場合にアラート

### 確認方法

```bash
# ログ確認
aws logs tail /aws/lambda/divergence-monitor --follow

# 最新の実行結果確認
aws lambda invoke --function-name divergence-monitor response.json
cat response.json
```

## 🔧 設定パラメータ

Lambda関数内の設定は `index.js` の `MONITORING_CONFIG` で変更できます：

```javascript
const MONITORING_CONFIG = {
    symbol: 'USD_JPY',           // 監視通貨ペア
    interval: '1hour',           // 時間足
    rsiPeriod: 14,              // RSI期間
    divergenceSettings: {
        lookbackLeft: 3,         // ピーク検出：左側期間
        lookbackRight: 3,        // ピーク検出：右側期間
        rangeLower: 3,           // ダイバージェンス：最小距離
        rangeUpper: 25           // ダイバージェンス：最大距離
    }
};
```

## 📱 通知内容

ダイバージェンス検出時の通知例：

```
🎯 ダイバージェンス検出！

📈 強気ダイバージェンス（強）
通貨ペア: USD_JPY
時間足: 1hour
検出時刻: 08/22 14:00

価格: 150.123 → 149.876
RSI: 25.3 → 28.7

⚠️ 投資判断は自己責任でお願いします
```

## 🛠️ トラブルシューティング

### よくあるエラー

1. **LINE通知エラー**
   ```
   LINE Channel Access Token is invalid or expired
   ```
   → Channel Access Tokenを再発行して環境変数を更新
   
   ```
   LINE User ID is invalid or user has blocked the bot
   ```
   → User IDを確認、またはBotのブロックを解除

2. **API取得エラー**
   ```
   KLineデータの取得に失敗しました
   ```
   → GMO APIの稼働状況を確認

3. **権限エラー**
   ```
   User is not authorized to perform: lambda:InvokeFunction
   ```
   → AWS IAMロールの権限を確認

### デバッグ方法

```bash
# LINE接続テスト
cd divergence-monitor
node test-line.js

# ローカルテスト
node test.js

# Lambda関数の手動実行
aws lambda invoke --function-name divergence-monitor output.json
cat output.json
```

## 💰 コスト目安

**月間コスト見積もり（平日1時間毎実行）**:
- Lambda実行: 約140回/月 × 平均3秒 ≈ $0.01
- CloudWatch Logs: 約10MB/月 ≈ $0.01
- **合計: 約$0.02/月**

## 🔄 更新とメンテナンス

### コード更新
```bash
# 関数コードのみ更新
cd divergence-monitor
npm run build
aws lambda update-function-code --function-name divergence-monitor --zip-file fileb://deployment.zip
```

### 設定更新
```bash
# 環境変数更新
aws lambda update-function-configuration --function-name divergence-monitor --environment Variables='{LINE_NOTIFY_TOKEN=new_token}'
```

### スタック削除
```bash
sam delete --stack-name divergence-monitor-stack
```

## 📞 サポート

問題や質問がある場合は、CloudWatch Logsを確認の上、開発チームにお問い合わせください。