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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const employeeId = await verifyUser(request, supabase);
    if (!employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: notificationId } = await context.params;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('employee_id', employeeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH Notification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
