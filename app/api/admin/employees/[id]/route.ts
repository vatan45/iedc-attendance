import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('role').eq('id', session.employee_id).single();
  if (employee?.role !== 'admin') return null;

  return session.employee_id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { full_name, employee_code, is_active } = body;

    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (employee_code !== undefined) updates.employee_code = employee_code;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', params.id)
      .select('id, employee_code, full_name, is_active, role, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee code already exists' }, { status: 400 });
      }
      throw error;
    }

    // If deactivated, we should ideally wipe their sessions
    if (is_active === false) {
      await supabase.from('sessions').delete().eq('employee_id', params.id);
    }

    return NextResponse.json({ success: true, employee: updatedEmployee });

  } catch (err) {
    console.error('PATCH Employee error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
