import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin(request: Request, supabase: any) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { data: session } = await supabase.from('sessions').select('employee_id, expires_at').eq('token', token).single();
  if (!session || new Date() > new Date(session.expires_at)) return null;

  const { data: employee } = await supabase.from('employees').select('id, role').eq('id', session.employee_id).single();
  if (!employee || employee.role !== 'admin') return null;
  
  return employee;
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const admin = await verifyAdmin(request, supabase);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    let monthStart, monthEnd;
    if (month) {
      const [year, m] = month.split('-');
      monthStart = new Date(parseInt(year), parseInt(m) - 1, 1).toISOString();
      monthEnd = new Date(parseInt(year), parseInt(m), 1).toISOString();
    } else {
      const now = new Date();
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const { data, error } = await supabase.rpc('get_task_analytics', {
      month_start: monthStart,
      month_end: monthEnd
    });

    if (error) throw error;

    return NextResponse.json({ success: true, analytics: data });
  } catch (err) {
    console.error('Analytics GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
