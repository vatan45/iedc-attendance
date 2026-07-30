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

    // Verify session & admin role
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('employee_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session || new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('role')
      .eq('id', session.employee_id)
      .single();

    if (empError || employee?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get start of today (local time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active employees and their latest log for today
    // PostgREST allows embedding and ordering/limiting the nested resource
    const { data: employeesData, error: dataError } = await supabase
      .from('employees')
      .select(`
        id, 
        employee_code, 
        full_name,
        attendance_logs (
          type, scanned_at
        )
      `)
      .eq('is_active', true)
      .gte('attendance_logs.scanned_at', today.toISOString())
      .order('scanned_at', { foreignTable: 'attendance_logs', ascending: false })
      .limit(1, { foreignTable: 'attendance_logs' });

    if (dataError) {
      console.error("Failed to fetch employees status:", dataError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Flatten data
    const results = (employeesData || []).map(emp => {
      // Because of the outer join, sometimes attendance_logs can be an empty array if no logs exist
      const logs = (emp.attendance_logs as any[]) || [];
      const latestLog = logs.length > 0 ? logs[0] : null;

      return {
        id: emp.id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        status: latestLog ? latestLog.type : null,
        last_scanned_at: latestLog ? latestLog.scanned_at : null
      };
    });

    return NextResponse.json({ employees: results });

  } catch (err) {
    console.error('Employees status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
