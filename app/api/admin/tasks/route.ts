import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('role, full_name').eq('id', session.employee_id).single();
  if (employee?.role !== 'admin') return null;

  return { id: session.employee_id, full_name: employee.full_name };
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assigned_to_fkey(id, full_name, employee_code)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('GET Tasks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, assigned_to, priority = 'medium', due_date } = body;

    if (!title || !description || !assigned_to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to,
        assigned_by: admin.id,
        priority,
        due_date: due_date || null,
        status: 'todo'
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Insert activity log
    await supabase.from('task_activity_log').insert({
      task_id: task.id,
      actor_id: admin.id,
      action: 'created',
      details: {
        title,
        priority,
        due_date
      }
    });

    // Insert notification
    await supabase.from('notifications').insert({
      employee_id: assigned_to,
      type: 'task_assigned',
      message: `${admin.full_name} assigned you a new task: ${title}`,
      related_task_id: task.id
    });

    return NextResponse.json({ success: true, task });
  } catch (err) {
    console.error('POST Task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
