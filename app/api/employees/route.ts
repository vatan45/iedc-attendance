import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;

    return NextResponse.json({ employees });
  } catch (err) {
    console.error('GET Employees error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
