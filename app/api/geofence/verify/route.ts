import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isWithinOfficeRadius } from '@/lib/geofence';

export async function POST(request: Request) {
  try {
    const { latitude, longitude } = await request.json();

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Verify session
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const supabase = createAdminClient();

    if (token) {
      // Validate token exists and hasn't expired. 
      // If we really want to enforce it strictly at the API layer.
      const { data: session } = await supabase
        .from('sessions')
        .select('employee_id, expires_at')
        .eq('token', token)
        .single();
        
      if (!session || new Date() > new Date(session.expires_at)) {
         return NextResponse.json({ error: 'Unauthorized or session expired' }, { status: 401 });
      }
    }

    // Fetch office settings
    const { data: office, error } = await supabase
      .from('office_settings')
      .select('latitude, longitude, allowed_radius_meters')
      .limit(1)
      .single();

    if (error || !office) {
      return NextResponse.json({ error: 'Office settings not configured' }, { status: 500 });
    }

    const verification = isWithinOfficeRadius(
      Number(latitude),
      Number(longitude),
      office.latitude,
      office.longitude,
      office.allowed_radius_meters
    );

    return NextResponse.json({
      allowed: verification.allowed,
      distance: Math.round(verification.distance),
      radius: office.allowed_radius_meters
    });

  } catch (err) {
    console.error('Geofence verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
