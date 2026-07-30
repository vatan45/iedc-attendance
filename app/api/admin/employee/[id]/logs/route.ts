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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Fetch employee details
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, is_active')
      .eq('id', params.id)
      .single();

    if (empError) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Fetch their logs if dates provided
    let logs: any[] = [];
    if (from && to) {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, type, scanned_at, added_by_admin, distance_from_office_meters')
        .eq('employee_id', params.id)
        .gte('scanned_at', from)
        .lte('scanned_at', to)
        .order('scanned_at', { ascending: true });
        
      if (error) {
        console.error("Supabase query error:", error);
      } else if (data) {
        logs = data;
      }
    }

    // Get current status (last log today)
    const today = new Date();
    today.setHours(0,0,0,0);
    const { data: latestLog } = await supabase
      .from('attendance_logs')
      .select('type')
      .eq('employee_id', params.id)
      .gte('scanned_at', today.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ 
      employee: { ...employee, currentStatus: latestLog ? latestLog.type : null }, 
      logs 
    });

  } catch (err) {
    console.error('GET Employee Logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, scanned_at } = body;

    if (!type || !scanned_at) {
      return NextResponse.json({ error: 'Missing type or scanned_at' }, { status: 400 });
    }

    const { data: newLog, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: params.id,
        type,
        scanned_at,
        added_by_admin: true,
        distance_from_office_meters: 0 // Manual logs don't have distance
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Audit log
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action: 'ADD_LOG',
      target_employee_id: params.id,
      target_log_id: newLog.id,
      details: { type, scanned_at }
    });

    return NextResponse.json({ success: true, log: newLog });

  } catch (err) {
    console.error('POST Employee Logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
