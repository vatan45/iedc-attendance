import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('id, role').eq('id', session.employee_id).single();
  if (!employee || employee.role !== 'admin') return null;
  
  return employee;
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    let monthStart, monthEnd;
    if (month) {
      const [year, m] = month.split('-');
      monthStart = new Date(parseInt(year), parseInt(m) - 1, 1).toISOString();
      monthEnd = new Date(parseInt(year), parseInt(m), 1).toISOString();
    } else {
      const now = new Date();
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('title, priority, status, created_at, completed_at, assignee:employees!tasks_assigned_to_fkey(full_name)')
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert to CSV
    let csvStr = "Title,Assignee,Priority,Status,Created Date,Completed Date,Days to Complete\n";
    
    tasks.forEach((rawTask: any) => {
      const task = rawTask;
      const title = `"${task.title.replace(/"/g, '""')}"`;
      const assigneeObj = task.assignee;
      const fullName = Array.isArray(assigneeObj) ? assigneeObj[0]?.full_name : assigneeObj?.full_name;
      const assignee = `"${fullName || 'Unassigned'}"`;
      const priority = task.priority;
      const status = task.status;
      const createdStr = new Date(task.created_at).toISOString().split('T')[0];
      const completedStr = task.completed_at ? new Date(task.completed_at).toISOString().split('T')[0] : "";
      
      let daysToComplete = "";
      if (task.completed_at) {
        const msDiff = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
        daysToComplete = (msDiff / (1000 * 60 * 60 * 24)).toFixed(1);
      }

      csvStr += `${title},${assignee},${priority},${status},${createdStr},${completedStr},${daysToComplete}\n`;
    });

    return new NextResponse(csvStr, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tasks_export_${month || 'current'}.csv"`
      }
    });

  } catch (err) {
    console.error('Export Tasks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
