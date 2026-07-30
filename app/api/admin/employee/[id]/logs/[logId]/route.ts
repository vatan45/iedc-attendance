import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('role').eq('id', session.employee_id).single();
  if (employee?.role !== 'admin') return null;

  return session.employee_id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string, logId: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { scanned_at } = body;

    if (!scanned_at) {
      return NextResponse.json({ error: 'Missing scanned_at' }, { status: 400 });
    }

    // Get old log for audit
    const { data: oldLog } = await supabase.from('attendance_logs').select('*').eq('id', params.logId).single();

    const { data: updatedLog, error } = await supabase
      .from('attendance_logs')
      .update({ scanned_at, added_by_admin: true })
      .eq('id', params.logId)
      .eq('employee_id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action: 'EDIT_LOG',
      target_employee_id: params.id,
      target_log_id: params.logId,
      details: { 
        old_time: oldLog?.scanned_at,
        new_time: scanned_at 
      }
    });

    return NextResponse.json({ success: true, log: updatedLog });
  } catch (err) {
    console.error('PATCH log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string, logId: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get old log for audit
    const { data: oldLog } = await supabase.from('attendance_logs').select('*').eq('id', params.logId).single();

    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', params.logId)
      .eq('employee_id', params.id);

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action: 'DELETE_LOG',
      target_employee_id: params.id,
      target_log_id: params.logId,
      details: { 
        deleted_log: oldLog 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
