import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const resolvedParams = await params;
  // Redirect the guest scanner to the actual guest details page with the short secret parameter
  const url = new URL(`/guest/details?s=${resolvedParams.secret}`, request.url);
  return NextResponse.redirect(url);
}
