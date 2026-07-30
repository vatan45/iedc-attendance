import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Delete the session based on token
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Logout handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
