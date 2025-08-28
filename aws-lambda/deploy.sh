#!/bin/bash

# AWS Lambda デプロイメントスクリプト
set -e

echo "🚀 Divergence Monitor Lambda Function デプロイ開始"

# 環境変数チェック
if [ -z "$LINE_CHANNEL_ACCESS_TOKEN" ]; then
    echo "❌ LINE_CHANNEL_ACCESS_TOKEN環境変数が設定されていません"
    echo "export LINE_CHANNEL_ACCESS_TOKEN='your_channel_access_token_here' を実行してください"
    exit 1
fi

if [ -z "$LINE_USER_ID" ]; then
    echo "❌ LINE_USER_ID環境変数が設定されていません"
    echo "export LINE_USER_ID='your_line_user_id_here' を実行してください"
    exit 1
fi

# AWS CLIの確認
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLIがインストールされていません"
    exit 1
fi

# AWS SAMの確認
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAMがインストールされていません"
    echo "pip install aws-sam-cli または brew install aws-sam-cli でインストールしてください"
    exit 1
fi

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
cd divergence-monitor
npm install
cd ..

# SAMビルド
echo "🔨 SAMビルド中..."
sam build

# デプロイ
echo "🚀 デプロイ中..."
sam deploy \
    --guided \
    --parameter-overrides \
        LineChannelAccessToken="$LINE_CHANNEL_ACCESS_TOKEN" \
        LineUserId="$LINE_USER_ID" \
        ScheduleExpression="cron(0,15,30,45 * ? * 1-5 *)" \
    --capabilities CAPABILITY_IAM \
    --stack-name divergence-monitor-stack

echo "✅ デプロイ完了!"
echo ""
echo "📋 次のステップ:"
echo "1. AWS CloudWatch Logsでログを確認"
echo "2. 必要に応じてスケジュール設定を調整"
echo "3. CloudWatch Alarmsでモニタリング設定"
echo ""
echo "🔧 設定変更が必要な場合:"
echo "sam deploy --parameter-overrides LineChannelAccessToken='新しいトークン' LineUserId='新しいユーザーID' MonitoringSchedule='新しいスケジュール'"