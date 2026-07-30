import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
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

    // Get start of today (local time assumption)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch latest log for today
    const { data: latestLog, error: logError } = await supabase
      .from('attendance_logs')
      .select('type, scanned_at')
      .eq('employee_id', session.employee_id)
      .gte('scanned_at', today.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== 'PGRST116') {
      console.error('Error fetching status:', logError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!latestLog) {
      return NextResponse.json({ status: null, timestamp: null });
    }

    return NextResponse.json({
      status: latestLog.type,
      timestamp: latestLog.scanned_at
    });

  } catch (err) {
    console.error('Status check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
