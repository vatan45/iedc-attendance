import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isWithinOfficeRadius } from '@/lib/geofence';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { qrPayload, latitude, longitude } = body;

    if (!qrPayload || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(qrPayload);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('employee_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session || new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch office settings
    const { data: office, error: officeError } = await supabase
      .from('office_settings')
      .select('id, qr_secret, latitude, longitude, allowed_radius_meters')
      .limit(1)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ error: 'Office settings not configured' }, { status: 500 });
    }

    // Security Check 1: Verify QR Secret
    // We allow matching either the full qr_secret or just the first 8 characters (short format)
    const validSecret = office.qr_secret;
    const shortSecret = validSecret.split('-')[0];
    
    // We ignore officeId for the short format since we only have one office anyway
    const isLegacyMatch = parsedPayload.officeId === office.id && parsedPayload.qrSecret === validSecret;
    const isShortMatch = parsedPayload.qrSecret === shortSecret || parsedPayload.qrSecret === validSecret;

    if (!isLegacyMatch && !isShortMatch) {
      return NextResponse.json({ error: 'This QR code is no longer valid, please rescan the one at reception.' }, { status: 403 });
    }

    // Security Check 2: Geofence Verification
    const verification = isWithinOfficeRadius(
      Number(latitude),
      Number(longitude),
      office.latitude,
      office.longitude,
      office.allowed_radius_meters
    );

    if (!verification.allowed) {
      return NextResponse.json({ 
        error: `You must be inside the office to mark attendance. You appear to be ${Math.round(verification.distance)}m away.` 
      }, { status: 403 });
    }

    // Get start of today (local time assumption)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch latest log to toggle entry/exit and check server-side cooldown
    const { data: latestLog, error: logError } = await supabase
      .from('attendance_logs')
      .select('type, scanned_at')
      .eq('employee_id', session.employee_id)
      .gte('scanned_at', today.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (latestLog) {
      const msSinceLastLog = new Date().getTime() - new Date(latestLog.scanned_at).getTime();
      if (msSinceLastLog < 10000) { // 10 seconds server-side cooldown
        return NextResponse.json({ error: 'Please wait a few seconds before scanning again.' }, { status: 429 });
      }
    }

    let nextType = 'entry';
    if (latestLog && latestLog.type === 'entry') {
      nextType = 'exit';
    }

    // Insert new attendance log
    const { data: newLog, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: session.employee_id,
        type: nextType,
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance_from_office_meters: Math.round(verification.distance)
      })
      .select('type, scanned_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type: newLog.type,
      timestamp: newLog.scanned_at
    });

  } catch (err) {
    console.error('Mark attendance error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
