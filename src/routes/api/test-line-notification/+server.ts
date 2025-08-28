import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { channelAccessToken, userId, message } = await request.json();

		if (!channelAccessToken || !userId || !message) {
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}

		// LINE Messaging API にテスト通知を送信
		const response = await fetch('https://api.line.me/v2/bot/message/push', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${channelAccessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				to: userId,
				messages: [
					{
						type: 'text',
						text: message
					}
				]
			})
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('LINE API Error:', error);
			return json({ error: `LINE API Error: ${error}` }, { status: response.status });
		}

		return json({ success: true, message: 'テスト通知が正常に送信されました' });

	} catch (error) {
		console.error('Test notification error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};