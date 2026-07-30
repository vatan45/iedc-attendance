import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify admin session
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

    // Determine the date bounds
    const queryDate = dateParam ? new Date(dateParam) : new Date();
    const from = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0);
    const to = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

    // Fetch all logs for the date
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('employee_id, type, scanned_at, employees ( full_name )')
      .gte('scanned_at', from.toISOString())
      .lte('scanned_at', to.toISOString())
      .order('scanned_at', { ascending: true });

    if (logsError) {
      console.error('Error fetching analytics logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Group logs by employee
    const employeeData = new Map<string, { name: string; logs: any[] }>();
    
    logs?.forEach(log => {
      if (!employeeData.has(log.employee_id)) {
        employeeData.set(log.employee_id, {
          name: (log.employees as any)?.full_name || 'Unknown',
          logs: []
        });
      }
      employeeData.get(log.employee_id)!.logs.push(log);
    });

    // Calculate hours per employee
    const results: { name: string; hours: number }[] = [];

    employeeData.forEach(({ name, logs: empLogs }) => {
      let dailyMilliseconds = 0;
      let i = 0;
      
      while (i < empLogs.length) {
        if (empLogs[i].type === 'entry') {
          // Look for next exit
          if (i + 1 < empLogs.length && empLogs[i+1].type === 'exit') {
            dailyMilliseconds += new Date(empLogs[i+1].scanned_at).getTime() - new Date(empLogs[i].scanned_at).getTime();
            i += 2;
          } else {
            // Assume currently inside, calculate up to *now* if the query is for today
            if (queryDate.toDateString() === new Date().toDateString()) {
              dailyMilliseconds += new Date().getTime() - new Date(empLogs[i].scanned_at).getTime();
            }
            break;
          }
        } else {
          // Weird case (e.g. exit without entry), just skip it
          i++;
        }
      }
      
      const hours = dailyMilliseconds / (1000 * 60 * 60);
      if (hours > 0) {
        // Round to 2 decimals
        results.push({ name, hours: Math.round(hours * 100) / 100 });
      }
    });

    // Sort by hours descending
    results.sort((a, b) => b.hours - a.hours);

    return NextResponse.json({ date: from.toISOString(), data: results });

  } catch (err) {
    console.error('Analytics api error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
