import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyUser(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('id, role, full_name, employee_code').eq('id', session.employee_id).single();
  
  return employee;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const user = await verifyUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assigned_to_fkey(id, full_name, employee_code),
        assigner:employees!tasks_assigned_by_fkey(id, full_name)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Note: We removed the strict assignee check here so that if an admin 
    // shares the task link in a WhatsApp group, any authenticated employee can view it.
    // Commenting and Editing are still strictly protected in their respective API routes.

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('task_comments')
      .select(`
        id,
        comment_text,
        created_at,
        employee_id,
        employee:employees(id, full_name)
      `)
      .eq('task_id', taskId);

    if (commentsError) throw commentsError;

    // Fetch activity log
    const { data: activityLogs, error: activityError } = await supabase
      .from('task_activity_log')
      .select(`
        id,
        action,
        details,
        created_at,
        actor_id,
        actor:employees(id, full_name)
      `)
      .eq('task_id', taskId);

    if (activityError) throw activityError;

    return NextResponse.json({ 
      task, 
      comments, 
      activityLogs, 
      currentUser: { id: user.id, role: user.role } 
    });
  } catch (err) {
    console.error('GET Task Details error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
