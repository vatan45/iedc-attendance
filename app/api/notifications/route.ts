import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyUser(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  return session.employee_id;
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const employeeId = await verifyUser(request, supabase);
    if (!employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('GET Notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createAdminClient();
    const employeeId = await verifyUser(request, supabase);
    if (!employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('employee_id', employeeId)
      .eq('is_read', false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH Notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
