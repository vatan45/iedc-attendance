import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcrypt';

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

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, is_active, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Compute next suggested code (e.g. EMP-XXX)
    let nextCode = "EMP-001";
    if (employees && employees.length > 0) {
      const empCodes = employees
        .map(e => e.employee_code)
        .filter(c => c.startsWith('EMP-'))
        .map(c => parseInt(c.split('-')[1] || "0", 10))
        .filter(n => !isNaN(n));
      
      if (empCodes.length > 0) {
        const maxCode = Math.max(...empCodes);
        nextCode = `EMP-${String(maxCode + 1).padStart(3, '0')}`;
      }
    }

    return NextResponse.json({ employees, nextSuggestedCode: nextCode });

  } catch (err) {
    console.error('GET Employees error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { full_name, employee_code, password, role = 'employee' } = body;

    if (!full_name || !employee_code || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const { data: newEmployee, error } = await supabase
      .from('employees')
      .insert({
        full_name,
        employee_code,
        password_hash,
        role,
        is_active: true
      })
      .select('id, employee_code, full_name, is_active, role, created_at')
      .single();

    if (error) {
      // Handle unique constraint error
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee code already exists' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, employee: newEmployee });

  } catch (err) {
    console.error('POST Employee error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
