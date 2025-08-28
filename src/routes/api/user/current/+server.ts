import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// 現在のユーザー情報を取得（クライアントサイドから送信）
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (body.user && body.user.id) {
      return json({
        success: true,
        supabaseUserId: body.user.id,
        email: body.user.email,
        message: 'User ID retrieved successfully'
      });
    }
    
    return json({ 
      error: 'User information not found in request'
    }, { status: 400 });
    
  } catch (error) {
    return json({ 
      error: 'Invalid request'
    }, { status: 400 });
  }
};

export const GET: RequestHandler = async () => {
  return json({ 
    message: 'Send POST with user object to get Supabase User ID'
  });
};