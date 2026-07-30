import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from or to parameters' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('employee_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session || new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch logs within date range
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('id, type, scanned_at')
      .eq('employee_id', session.employee_id)
      .gte('scanned_at', from)
      .lte('scanned_at', to)
      .order('scanned_at', { ascending: true }); // chronological

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ logs });

  } catch (err) {
    console.error('My logs api error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
