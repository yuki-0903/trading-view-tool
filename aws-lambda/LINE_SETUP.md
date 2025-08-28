# LINE Bot セットアップガイド

AWS Lambda でダイバージェンス監視を行うために必要な LINE Bot の設定手順です。

## 🤖 既存のLINE Botを使用する場合

既存のアプリケーションでLINE Botが設定済みの場合、同じ設定を再利用できます。

### 必要な情報

1. **LINE Channel Access Token** (`LINE_CHANNEL_ACCESS_TOKEN`)
2. **LINE User ID** (`LINE_USER_ID`)

### 既存設定の確認方法

1. **Channel Access Token の確認**
   ```bash
   # 既存アプリの環境変数から確認
   cat .env.local | grep LINE_CHANNEL_ACCESS_TOKEN
   ```

2. **User ID の確認**
   - LINE Developerコンソール → Your Channel → Messaging API → User ID
   - または既存アプリのユーザー管理画面から確認

## 🆕 新規LINE Botを作成する場合

### 1. LINE Developers プロバイダー作成

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 「プロバイダー作成」をクリック
4. プロバイダー名を入力（例：`Trading Monitor Bot`）

### 2. Messaging API チャネル作成

1. 作成したプロバイダーを選択
2. 「新規チャネル作成」→「Messaging API」を選択
3. 必要情報を入力：
   - **チャネル名**: `Divergence Monitor Bot`
   - **チャネル説明**: `ダイバージェンス検出通知Bot`
   - **大業種**: `個人`
   - **小業種**: `個人（その他）`

### 3. Channel Access Token 取得

1. 作成したチャネルの「Messaging API設定」タブへ
2. 「Channel access token」の「発行」ボタンをクリック
3. 生成されたトークンをコピー（これが`LINE_CHANNEL_ACCESS_TOKEN`）

```bash
export LINE_CHANNEL_ACCESS_TOKEN="YOUR_CHANNEL_ACCESS_TOKEN_HERE"
```

### 4. Webhook 設定（User ID取得用）

User IDを取得するため、一時的にWebhookを設定します。

1. **Webhook URL 設定**
   - 「Webhook設定」で「Webhookの利用」をON
   - Webhook URLは一時的に `https://httpbin.org/post` などを設定

2. **応答メッセージ設定**
   - 「応答メッセージ」をOFF
   - 「Greeting message」もOFF

### 5. LINE User ID 取得

#### 方法1: 友達追加して取得

1. **QRコード取得**
   - チャネル設定の「Messaging API設定」タブ
   - 「QRコード」をスマートフォンで読み取り
   - LINE Botを友達追加

2. **テストメッセージ送信**
   ```bash
   # 一時的なWebhookでUser IDを確認
   curl -X POST https://api.line.me/v2/bot/message/push \
     -H "Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "USER_ID_WILL_BE_SHOWN_IN_WEBHOOK",
       "messages": [{"type": "text", "text": "テスト"}]
     }'
   ```

#### 方法2: LINE Official Account Manager から取得

1. [LINE Official Account Manager](https://manager.line.biz/) にアクセス
2. 作成したアカウントを選択
3. 「設定」→「応答設定」→「詳細設定」
4. ユーザー情報から User ID を確認

#### 方法3: Webhook ログから取得

1. 一時的なWebhook URLを設定（`https://webhook.site/` など）
2. BOTに何かメッセージを送信
3. Webhookログから `source.userId` を確認

### 6. 環境変数設定

取得した情報を環境変数に設定：

```bash
# Channel Access Token
export LINE_CHANNEL_ACCESS_TOKEN="YOUR_CHANNEL_ACCESS_TOKEN_HERE"

# User ID
export LINE_USER_ID="YOUR_USER_ID_HERE"

# 確認
echo "Channel Access Token: ${LINE_CHANNEL_ACCESS_TOKEN:0:20}..."
echo "User ID: $LINE_USER_ID"
```

## ✅ 設定確認

### テスト用スクリプト

```bash
# divergence-monitor/test-line.js
import { sendLineNotification } from './lineNotificationService.js';

async function testLineNotification() {
    try {
        await sendLineNotification('🧪 Lambda監視テスト\n\nLINE Messaging API 接続確認');
        console.log('✅ LINE通知テスト成功');
    } catch (error) {
        console.error('❌ LINE通知テスト失敗:', error.message);
    }
}

testLineNotification();
```

```bash
cd divergence-monitor
node test-line.js
```

## 🔒 セキュリティ設定

### Channel Access Token の管理

1. **定期的なトークン再発行**
   - 3-6ヶ月毎にトークンを再発行
   - 旧トークンの無効化を確認

2. **環境変数の暗号化**
   ```bash
   # AWS Systems Manager Parameter Store（推奨）
   aws ssm put-parameter \
     --name "/divergence-monitor/line-channel-access-token" \
     --value "YOUR_TOKEN" \
     --type "SecureString"
   ```

### User ID の保護

- User IDは個人情報のため適切に管理
- ログには表示させない（マスキング処理）

## 🚨 トラブルシューティング

### よくあるエラー

1. **`Channel Access Token is invalid`**
   - トークンの有効期限切れ
   - 間違ったトークンを設定

2. **`User ID is invalid or user has blocked the bot`**
   - User IDが間違っている
   - ユーザーがBotをブロックしている

3. **`Rate limit exceeded`**
   - 送信頻度が高すぎる
   - 時間を空けて再実行

### デバッグ用コマンド

```bash
# LINE API接続テスト
curl -X GET https://api.line.me/v2/bot/info \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"

# User IDの確認（プロフィール取得）
curl -X GET "https://api.line.me/v2/bot/profile/$LINE_USER_ID" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"
```

## 📞 サポート

設定でお困りの場合は、以下の情報を含めてお問い合わせください：

- エラーメッセージの詳細
- 設定手順のどの段階で問題が発生したか
- LINE Developers コンソールのスクリーンショット（Token部分は隠して）