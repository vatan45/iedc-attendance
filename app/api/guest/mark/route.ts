import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isWithinOfficeRadius } from '@/lib/geofence';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrPayload, latitude, longitude, name, contact_number, purpose } = body;

    if (!qrPayload || latitude == null || longitude == null || !name || !contact_number || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(qrPayload);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 });
    }

    const supabase = createAdminClient();

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
        error: `You must be inside the office to mark entry. You appear to be ${Math.round(verification.distance)}m away.` 
      }, { status: 403 });
    }

    // Insert new guest entry
    const { error: insertError } = await supabase
      .from('guest_entries')
      .insert({
        name,
        contact_number,
        purpose,
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance_from_office_meters: Math.round(verification.distance)
      });

    if (insertError) {
      console.error('Guest insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record guest entry. Please ensure the database table is created.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Mark guest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
