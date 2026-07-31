import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyEmployee(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('full_name').eq('id', session.employee_id).single();

  return { id: session.employee_id, full_name: employee?.full_name };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const employee = await verifyEmployee(request, supabase);
    if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) return NextResponse.json({ error: 'Status is required' }, { status: 400 });

    // Fetch existing task to check ownership
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existingTask.assigned_to !== employee.id) {
      return NextResponse.json({ error: 'Forbidden: You can only update your own tasks' }, { status: 403 });
    }

    if (status === existingTask.status) {
      return NextResponse.json({ success: true, task: existingTask });
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log activity
    await supabase.from('task_activity_log').insert({
      task_id: taskId,
      actor_id: employee.id,
      action: 'status_changed',
      details: { from: existingTask.status, to: status }
    });

    // Notify the admin who assigned it
    await supabase.from('notifications').insert({
      employee_id: existingTask.assigned_by,
      type: 'task_status_changed',
      message: `${employee.full_name} moved task "${existingTask.title}" to ${status.replace('_', ' ')}`,
      related_task_id: taskId
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err) {
    console.error('PATCH Task Status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
