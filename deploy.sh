#!/bin/bash
# AWS Lambda デプロイメントスクリプト

set -e

echo "🚀 AWS Lambda ダイバージェンス検知デプロイメント開始..."

# 設定変数
FUNCTION_NAME="divergence-checker"
REGION="ap-northeast-1"  # 東京リージョン
ROLE_NAME="divergence-checker-lambda-role"

# 必要なファイルの存在確認
if [ ! -f "aws-lambda/divergence-checker.js" ]; then
    echo "❌ aws-lambda/divergence-checker.js が見つかりません"
    exit 1
fi

# デプロイ用ディレクトリを作成
echo "📦 デプロイパッケージを準備中..."
mkdir -p deploy
cp aws-lambda/divergence-checker.js deploy/index.js

# package.json作成
cat > deploy/package.json << EOF
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
EOF

# ZIPファイル作成
cd deploy
zip -r ../divergence-checker.zip . -q
cd ..

echo "✅ ZIPファイル作成完了: divergence-checker.zip"

# AWS CLI の存在確認
if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI が見つかりません。手動でアップロードしてください："
    echo "   1. AWS Lambda Console で '$FUNCTION_NAME' 関数を開く"
    echo "   2. 「アップロード元」→「.zipファイル」"
    echo "   3. divergence-checker.zip をアップロード"
    echo ""
    echo "📋 環境変数も忘れずに設定してください："
    echo "   API_ENDPOINT=https://your-app.com/api/line/notify"
    echo "   USERS_TO_CHECK=71a99d2c-b6bf-4cbd-9a82-f736905a0926"
    exit 0
fi

# AWS Lambda関数の存在確認
echo "🔍 Lambda関数の存在確認..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
    echo "🔄 既存のLambda関数を更新中..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://divergence-checker.zip \
        --region $REGION \
        --no-cli-pager
else
    echo "❌ Lambda関数 '$FUNCTION_NAME' が見つかりません"
    echo "AWS Consoleで以下の手順で関数を作成してください："
    echo "1. Lambda サービスに移動"
    echo "2. 「関数の作成」をクリック"
    echo "3. 関数名: $FUNCTION_NAME"
    echo "4. ランタイム: Node.js 18.x"
    echo "5. 作成後、このスクリプトを再実行してください"
    exit 1
fi

# 環境変数設定
echo "🔧 環境変数を設定中..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables='{
        "API_ENDPOINT":"https://your-app.com/api/line/notify",
        "USERS_TO_CHECK":"71a99d2c-b6bf-4cbd-9a82-f736905a0926"
    }' \
    --timeout 30 \
    --memory-size 256 \
    --region $REGION \
    --no-cli-pager

echo "✅ デプロイ完了！"
echo ""
echo "📋 次の手順："
echo "1. 環境変数 API_ENDPOINT を実際のアプリURLに変更"
echo "2. EventBridge でスケジュール設定"
echo "3. テスト実行で動作確認"
echo ""
echo "🔗 EventBridge スケジュール例："
echo "   名前: divergence-checker-schedule"
echo "   Cron式（3つのルールが必要）:"
echo "     1. cron(*/15 22 * * 0)     # 日曜22時〜（月曜7時JST〜）"
echo "     2. cron(*/15 * * * 1-5)    # 月〜金曜日終日"
echo "     3. cron(*/15 0-21 * * 6)   # 土曜0-21時（〜土曜6時JST）"
echo "   ターゲット: Lambda function → $FUNCTION_NAME"

# 一時ファイルクリーンアップ
rm -rf deploy
echo "🧹 一時ファイルを削除しました"