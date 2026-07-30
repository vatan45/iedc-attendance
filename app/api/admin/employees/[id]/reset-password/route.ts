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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = createAdminClient();
    const adminId = await verifyAdmin(request, supabase);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from('employees')
      .update({ password_hash })
      .eq('id', params.id);

    if (error) throw error;

    // Delete existing sessions to force them to log in with new password
    await supabase.from('sessions').delete().eq('employee_id', params.id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Reset Password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
