# AWS Lambda ダイバージェンス検知 デプロイメントガイド

## 概要
このガイドでは、AWS Lambda + EventBridge を使用してダイバージェンス検知とLINE通知の自動化を設定する方法を説明します。

## 必要なAWSサービス
- **AWS Lambda**: ダイバージェンス検知コードの実行
- **EventBridge**: cron式によるスケジュール実行
- **IAM**: Lambda実行権限の管理

## 1. IAMロール・ポリシー設定

### Lambda実行ロールの作成
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### AWS Console での手順
1. IAMサービスに移動
2. 「ロール」→「ロールを作成」
3. 信頼されたエンティティ: 「AWS サービス」→「Lambda」
4. ポリシー: `AWSLambdaBasicExecutionRole` をアタッチ
5. ロール名: `divergence-checker-lambda-role`

## 2. Lambda関数の作成

### AWS Console での手順
1. Lambda サービスに移動
2. 「関数の作成」
3. 設定:
   - 関数名: `divergence-checker`
   - ランタイム: `Node.js 18.x` または `Node.js 20.x`
   - 実行ロール: 先ほど作成した `divergence-checker-lambda-role`

### ソースコードのデプロイ
以下のファイルをZIPにまとめてアップロード:

#### package.json
```json
{
  "name": "divergence-checker",
  "version": "1.0.0",
  "description": "GMO API divergence detection with LINE notifications",
  "main": "index.js",
  "dependencies": {},
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### index.js
```javascript
// aws-lambda/divergence-checker.js の内容をコピー
// exports.handler 関数がエントリーポイント
```

### デプロイ方法

#### 方法1: Console Upload
1. Lambda関数の「コード」タブ
2. 「アップロード元」→「.zipファイル」
3. divergence-checker.zip をアップロード

#### 方法2: AWS CLI
```bash
# ZIPファイル作成
zip -r divergence-checker.zip index.js package.json

# デプロイ
aws lambda update-function-code \
    --function-name divergence-checker \
    --zip-file fileb://divergence-checker.zip
```

## 3. 環境変数の設定

Lambda関数の「設定」→「環境変数」で以下を設定:

```
API_ENDPOINT=https://your-app.com/api/line/notify
USERS_TO_CHECK=71a99d2c-b6bf-4cbd-9a82-f736905a0926
```

**重要**: `API_ENDPOINT` には実際のアプリのURLを設定してください。

## 4. Lambda設定の調整

### タイムアウト設定
- デフォルト: 3秒
- 推奨: 30秒（市場データ取得とAPI呼び出しを考慮）

### メモリ設定
- デフォルト: 128MB
- 推奨: 256MB

### 設定方法
1. Lambda関数の「設定」→「一般設定」
2. 「編集」ボタンクリック
3. タイムアウト: 30秒、メモリ: 256MB に変更

## 5. EventBridge スケジュール設定

### EventBridge Rule作成
1. EventBridge サービスに移動
2. 「ルール」→「ルールの作成」
3. 設定:
   - 名前: `divergence-checker-schedule`
   - イベントバス: `default`
   - ルールタイプ: `スケジュール`

### Cron式の例

#### 市場開放中の1時間毎実行
```
cron(0 9-21 * * MON-FRI)
```
- 月〜金曜日の9時〜21時に毎時実行

#### 4時間毎実行
```
cron(0 */4 * * *)
```
- 毎日4時間毎に実行

#### 営業日の朝・昼・夕実行
```
cron(0 9,12,18 * * MON-FRI)
```
- 月〜金曜日の9時、12時、18時に実行

### ターゲット設定
1. ターゲット選択: 「AWS サービス」→「Lambda function」
2. 関数選択: `divergence-checker`
3. 追加設定は不要

## 6. テスト実行

### 手動テスト
1. Lambda関数の「テスト」タブ
2. 「新しいテストイベント」
3. テンプレート: `hello-world`
4. テストイベント名: `manual-test`
5. 「テスト」ボタンクリック

### 実行結果の確認
- CloudWatch Logs で実行ログを確認
- LINE通知が送信されることを確認

## 7. 監視とデバッグ

### CloudWatch Logs
- ログストリーム: `/aws/lambda/divergence-checker`
- 実行ログ、エラーログを確認

### 一般的な問題と解決策

#### 1. API_ENDPOINT接続エラー
```
Error: getaddrinfo ENOTFOUND your-app.com
```
**解決策**: 正しいドメインとHTTPS URLを確認

#### 2. GMO API レート制限
```
429 Too Many Requests
```
**解決策**: 実行頻度を下げる、リクエスト間隔を追加

#### 3. LINE API認証エラー
```
401 Unauthorized
```
**解決策**: アプリケーション側の環境変数とLINE設定を確認

## 8. 本番環境での推奨設定

### セキュリティ
- Lambda関数は最小権限の原則に従う
- 機密情報は環境変数またはAWS Systems Manager Parameter Storeを使用

### 監視
- CloudWatch Alarms でエラー率を監視
- SNSトピック設定でアラート通知

### コスト最適化
- 実行頻度を市場時間に制限
- メモリとタイムアウトを適切に設定

## 使用例

### デプロイ後のログ例
```
2024-01-20T09:00:00.000Z	🚀 Lambda divergence checker started
2024-01-20T09:00:01.000Z	📊 Checking USD_JPY 1hour...
2024-01-20T09:00:02.000Z	✅ No divergences found for USD_JPY 1hour
2024-01-20T09:00:03.000Z	📊 Checking USD_JPY 4hour...
2024-01-20T09:00:05.000Z	🔍 Found 1 divergence(s) for USD_JPY 4hour
2024-01-20T09:00:06.000Z	📱 Sending notification to user 71a99d2c...
2024-01-20T09:00:07.000Z	✅ Notification sent: {"status":200,"result":{"success":true}}
```

## まとめ
この設定により、GMO APIからの市場データを定期的に監視し、ダイバージェンス検出時に自動でLINE通知が送信される仕組みが完成します。