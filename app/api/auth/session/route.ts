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

    // Check token and expiry
    const { data: session, error } = await supabase
      .from('sessions')
      .select('employee_id, expires_at, employees ( full_name, role, is_active )')
      .eq('token', token)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Session expired, delete it
      await supabase.from('sessions').delete().eq('token', token);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // @ts-ignore - Supabase join returns an object or array, we expect object
    const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;

    if (!employee || !employee.is_active) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    return NextResponse.json({
      role: employee.role,
      full_name: employee.full_name
    });

  } catch (err) {
    console.error('Session handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
