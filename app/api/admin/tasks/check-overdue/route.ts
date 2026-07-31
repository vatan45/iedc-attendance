import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();

    // Find all tasks that are overdue
    // Overdue = due_date < today AND status != 'done'
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, due_date')
      .not('status', 'eq', 'done')
      .not('due_date', 'is', null)
      .lt('due_date', todayStr);

    if (fetchError) throw fetchError;
    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // To prevent duplicate daily notifications, we will check existing notifications
    // created today of type 'task_overdue'
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingNotifs, error: notifError } = await supabase
      .from('notifications')
      .select('related_task_id')
      .eq('type', 'task_overdue')
      .gte('created_at', todayStart.toISOString());

    if (notifError) throw notifError;

    const existingSet = new Set(existingNotifs.map(n => n.related_task_id));
    const newNotifications = [];

    for (const task of overdueTasks) {
      if (!existingSet.has(task.id)) {
        newNotifications.push({
          employee_id: task.assigned_to,
          type: 'task_overdue',
          message: `OVERDUE: "${task.title}" was due on ${new Date(task.due_date).toLocaleDateString()}`,
          related_task_id: task.id
        });
      }
    }

    if (newNotifications.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(newNotifications);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, count: newNotifications.length });
  } catch (err) {
    console.error('Check Overdue error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
