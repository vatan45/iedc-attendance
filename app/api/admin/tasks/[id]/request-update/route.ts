import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppTaskUpdateNotification } from '@/lib/whatsapp';

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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await context.params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }
    const { update_message } = (body as any) || {};

    // Fetch existing task along with assignee details
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assigned_to_fkey(id, full_name, employee_code)
      `)
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const messageText = update_message && typeof update_message === 'string' && update_message.trim() !== ''
      ? update_message.trim()
      : 'Progress update requested by admin';

    // Insert activity log entry
    const { error: activityError } = await supabase.from('task_activity_log').insert({
      task_id: taskId,
      actor_id: admin.id,
      action: 'edited',
      details: { update_requested: true, message: messageText }
    });

    if (activityError) throw activityError;

    // Insert notification for the assignee
    await supabase.from('notifications').insert({
      employee_id: task.assigned_to,
      type: 'task_commented',
      message: `${admin.full_name} requested an update on task "${task.title}": ${messageText}`,
      related_task_id: taskId
    });

    // Dispatch WhatsApp Group Alert
    await sendWhatsAppTaskUpdateNotification({
      title: task.title,
      assigneeName: task.assignee?.full_name || 'Team Member',
      adminName: admin.full_name,
      priority: task.priority || 'medium',
      dueDate: task.due_date || null,
      taskId: taskId,
      updateMessage: messageText
    });

    return NextResponse.json({ success: true, message: 'Update request sent and WhatsApp alert dispatched' });
  } catch (err) {
    console.error('POST Request Update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
