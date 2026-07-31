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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;
    const body = await request.json();
    const { status, priority, due_date, title, description, assigned_to } = body;

    // Fetch existing task to check what changed and get assignee
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updates: any = {};
    if (status && status !== existingTask.status) updates.status = status;
    if (priority && priority !== existingTask.priority) updates.priority = priority;
    if (due_date !== undefined && due_date !== existingTask.due_date) updates.due_date = due_date;
    if (title && title !== existingTask.title) updates.title = title;
    if (description !== undefined && description !== existingTask.description) updates.description = description;
    if (assigned_to && assigned_to !== existingTask.assigned_to) updates.assigned_to = assigned_to;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, task: existingTask });
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log activities and notify
    if (updates.title || updates.description) {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        actor_id: admin.id,
        action: 'edited',
        details: { fields: Object.keys(updates).filter(k => k === 'title' || k === 'description') }
      });
    }

    if (updates.status) {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        actor_id: admin.id,
        action: 'status_changed',
        details: { from: existingTask.status, to: updates.status }
      });

      if (admin.id !== existingTask.assigned_to) {
        await supabase.from('notifications').insert({
          employee_id: existingTask.assigned_to,
          type: 'task_status_changed',
          message: `${admin.full_name} moved task "${existingTask.title}" to ${updates.status.replace('_', ' ')}`,
          related_task_id: taskId
        });
      }
    }

    if (updates.priority) {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        actor_id: admin.id,
        action: 'priority_changed',
        details: { from: existingTask.priority, to: updates.priority }
      });
    }

    if (updates.due_date !== undefined) {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        actor_id: admin.id,
        action: 'due_date_changed',
        details: { from: existingTask.due_date, to: updates.due_date }
      });
    }

    if (updates.assigned_to) {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        actor_id: admin.id,
        action: 'reassigned',
        details: { from: existingTask.assigned_to, to: updates.assigned_to }
      });

      // Notify the new assignee
      await supabase.from('notifications').insert({
        employee_id: updates.assigned_to,
        type: 'task_assigned',
        message: `${admin.full_name} reassigned task "${updates.title || existingTask.title}" to you`,
        related_task_id: taskId
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err) {
    console.error('PATCH Task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE Task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
