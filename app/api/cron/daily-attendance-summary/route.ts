import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppDailyAttendanceSummary, EmployeeDailySummary } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

async function generateAndSendDailySummary(request: Request) {
  try {
    // Optional cron authorization check if set in environment variables
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');

      if (token !== cronSecret && querySecret !== cronSecret) {
        // Also allow authenticated admins to test/invoke manually
        const supabase = createAdminClient();
        let isAdmin = false;

        if (token) {
          const { data: session } = await supabase
            .from('sessions')
            .select('employee_id, expires_at')
            .eq('token', token)
            .single();

          if (session && new Date() <= new Date(session.expires_at)) {
            const { data: emp } = await supabase
              .from('employees')
              .select('role')
              .eq('id', session.employee_id)
              .single();
            if (emp?.role === 'admin') isAdmin = true;
          }
        }

        if (!isAdmin) {
          return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
        }
      }
    }

    const supabase = createAdminClient();

    // Query attendance activity from the last 24 hours up to right now (9 PM)
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = now;

    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('employee_id, type, scanned_at, employees ( employee_code, full_name )')
      .gte('scanned_at', from.toISOString())
      .lte('scanned_at', to.toISOString())
      .order('scanned_at', { ascending: true });

    if (logsError) {
      console.error('[Daily Cron] Failed to query attendance logs:', logsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      console.log('[Daily Cron] No attendance activity recorded today. Skipping message dispatch.');
      return NextResponse.json({ success: true, message: 'No records today, summary skipped.', count: 0 });
    }

    // Group logs by employee
    const employeeData = new Map<string, { employeeCode: string; employeeName: string; logs: any[] }>();

    for (const log of logs) {
      if (!employeeData.has(log.employee_id)) {
        const empInfo = log.employees as any;
        employeeData.set(log.employee_id, {
          employeeCode: empInfo?.employee_code || 'EMP',
          employeeName: empInfo?.full_name || 'Employee',
          logs: [],
        });
      }
      employeeData.get(log.employee_id)!.logs.push(log);
    }

    const summaryList: EmployeeDailySummary[] = [];

    employeeData.forEach(({ employeeCode, employeeName, logs: empLogs }) => {
      let dailyMilliseconds = 0;
      let isStillInside = false;
      let i = 0;

      const formattedLogs = empLogs.map(l => ({
        type: l.type,
        scannedAt: l.scanned_at,
      }));

      while (i < empLogs.length) {
        if (empLogs[i].type === 'entry') {
          if (i + 1 < empLogs.length && empLogs[i + 1].type === 'exit') {
            dailyMilliseconds += new Date(empLogs[i + 1].scanned_at).getTime() - new Date(empLogs[i].scanned_at).getTime();
            i += 2;
          } else {
            // Employee checked in but didn't check out yet (as of 9 PM)
            isStillInside = true;
            dailyMilliseconds += new Date().getTime() - new Date(empLogs[i].scanned_at).getTime();
            i += 1;
          }
        } else {
          // Extra exit or out-of-order log
          i++;
        }
      }

      const totalHours = dailyMilliseconds / (1000 * 60 * 60);

      summaryList.push({
        employeeCode,
        employeeName,
        logs: formattedLogs,
        totalHours: Math.max(0, Math.round(totalHours * 100) / 100),
        isStillInside,
      });
    });

    // Send group report
    await sendWhatsAppDailyAttendanceSummary(summaryList, now.toISOString());

    return NextResponse.json({
      success: true,
      employeesCount: summaryList.length,
      reportDate: now.toISOString(),
    });
  } catch (error) {
    console.error('[Daily Cron Exception]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return generateAndSendDailySummary(request);
}

export async function POST(request: Request) {
  return generateAndSendDailySummary(request);
}
