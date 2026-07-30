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

    // Verify employee is admin
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('role')
      .eq('id', session.employee_id)
      .single();

    if (empError || employee?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch today's guests
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: guests, error: guestsError } = await supabase
      .from('guest_entries')
      .select('*')
      .gte('scanned_at', today.toISOString())
      .order('scanned_at', { ascending: false });

    if (guestsError) {
      console.error('Error fetching guests:', guestsError);
      return NextResponse.json({ error: 'Failed to fetch guest entries. Have you created the table?' }, { status: 500 });
    }

    return NextResponse.json({ guests: guests || [] });

  } catch (err) {
    console.error('Guest fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
