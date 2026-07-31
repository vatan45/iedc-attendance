import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyUser(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('id, role, full_name').eq('id', session.employee_id).single();
  
  return employee;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const user = await verifyUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;
    const body = await request.json();
    const { comment_text } = body;

    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    // Fetch the task to verify ownership/access and determine notification target
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, assigned_by, title')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Access control
    if (user.role !== 'admin' && task.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Insert comment
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        employee_id: user.id,
        comment_text: comment_text.trim()
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // Determine notification recipient ("the other side")
    let notifyEmployeeId = null;
    if (user.id === task.assigned_to && task.assigned_to !== task.assigned_by) {
      // Employee commented, notify admin
      notifyEmployeeId = task.assigned_by;
    } else if (user.role === 'admin' && user.id !== task.assigned_to) {
      // Admin commented, notify employee
      notifyEmployeeId = task.assigned_to;
    }

    if (notifyEmployeeId) {
      await supabase.from('notifications').insert({
        employee_id: notifyEmployeeId,
        type: 'task_commented',
        message: `${user.full_name} commented on "${task.title}"`,
        related_task_id: taskId
      });
    }

    return NextResponse.json({ success: true, comment });
  } catch (err) {
    console.error('POST Comment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
