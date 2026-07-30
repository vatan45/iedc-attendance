import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { employee_code, password } = await request.json();

    if (!employee_code || !password) {
      return NextResponse.json({ error: 'Employee code and password are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up employee by code
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, password_hash, is_active, role, full_name')
      .eq('employee_code', employee_code)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Invalid employee code or password' }, { status: 401 });
    }

    if (!employee.is_active) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact admin.' }, { status: 403 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, employee.password_hash);
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid employee code or password' }, { status: 401 });
    }

    // Generate token: UUID + 32 random hex characters for extra entropy
    const token = `${crypto.randomUUID()}-${crypto.randomBytes(16).toString('hex')}`;
    
    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert session
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        employee_id: employee.id,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      token,
      role: employee.role,
      full_name: employee.full_name
    });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
