import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppTaskNotification } from '@/lib/whatsapp';

async function verifyEmployee(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  return session.employee_id;
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const employeeId = await verifyEmployee(request, supabase);
    if (!employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assigned_to_fkey(id, full_name, employee_code),
        assigner:employees!tasks_assigned_by_fkey(id, full_name)
      `)
      .or(`assigned_to.eq.${employeeId},assigned_by.eq.${employeeId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // pendingCount should only count tasks assigned TO the employee
    const pendingCount = tasks.filter(t => t.assigned_to === employeeId && (t.status === 'todo' || t.status === 'in_progress')).length;

    return NextResponse.json({ tasks, pendingCount, currentEmployeeId: employeeId });
  } catch (err) {
    console.error('GET Employee Tasks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const employeeId = await verifyEmployee(request, supabase);
    if (!employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, assigned_to, priority = 'medium', due_date } = body;

    const assigneeIds: string[] = Array.isArray(assigned_to) ? assigned_to : [assigned_to].filter(Boolean);

    if (!title || !description || assigneeIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or assignees' }, { status: 400 });
    }

    // Fetch the assigner details for the notification
    const { data: assigner } = await supabase.from('employees').select('full_name').eq('id', employeeId).single();

    const createdTasks = [];
    const assigneeNames: string[] = [];

    for (const empId of assigneeIds) {
      // Insert task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          assigned_to: empId,
          assigned_by: employeeId,
          priority,
          due_date: due_date || null,
          status: 'todo'
        })
        .select()
        .single();

      if (taskError) throw taskError;
      createdTasks.push(task);

      // Insert activity log
      await supabase.from('task_activity_log').insert({
        task_id: task.id,
        actor_id: employeeId,
        action: 'created',
        details: { title, priority, due_date }
      });

      // Insert notification for the assignee
      if (assigner) {
        await supabase.from('notifications').insert({
          employee_id: empId,
          type: 'task_assigned',
          message: `${assigner.full_name} raised a new ticket for you: ${title}`,
          related_task_id: task.id
        });
      }

      // Fetch assignee name for summary report
      const { data: assignee } = await supabase.from('employees').select('full_name').eq('id', empId).single();
      if (assignee?.full_name) assigneeNames.push(assignee.full_name);
    }

    // Format consolidated names list for WhatsApp broadcast
    const combinedAssignees = assigneeNames.length > 3
      ? `${assigneeNames.slice(0, 3).join(', ')} (+${assigneeNames.length - 3} others)`
      : assigneeNames.join(', ') || 'Team Members';

    if (createdTasks.length > 0) {
      await sendWhatsAppTaskNotification({
        title,
        description,
        assigneeName: combinedAssignees,
        assignerName: assigner?.full_name || 'Team Colleague',
        priority,
        dueDate: due_date || null,
        taskId: createdTasks[0].id
      });
    }

    return NextResponse.json({ success: true, tasks: createdTasks, task: createdTasks[0] });
  } catch (err) {
    console.error('POST Task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
