import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('employee_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, role, is_active')
      .eq('id', session.employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        role: employee.role,
        is_active: employee.is_active
      }
    });

  } catch (err) {
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
