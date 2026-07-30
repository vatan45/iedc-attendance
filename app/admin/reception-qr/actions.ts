"use server";

import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

/* 
 * SECURITY NOTE for IEDC Attendance Portal
 * 
 * The QR code generated here encodes a fixed payload ({ officeId, qrSecret }) and is printed statically. 
 * This means the QR code alone does NOT grant attendance security. Anyone could theoretically photograph 
 * the QR code and scan it elsewhere.
 * 
 * True security is enforced by combining this static QR check with the dynamic GPS Geofencing check 
 * (implemented in Prompt 3 / office-settings). When an employee scans the QR, the API route MUST 
 * verify both:
 *   1. The scanned qrSecret matches the one stored in office_settings.
 *   2. The user's device GPS coordinates are physically within the allowed radius of the office at the 
 *      exact moment of scanning.
 * 
 * Because the printed QR never changes, the geofence check is the primary mechanism that prevents remote scans.
 * Do not weaken the geofence check.
 */

export async function getOfficeQRData() {
  try {
    const supabase = createAdminClient();
    let { data: office, error } = await supabase
      .from("office_settings")
      .select("id, office_name, qr_secret")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") { // Ignore no-rows error if it doesn't exist yet
      throw error;
    }

    if (!office) {
      // If no office settings exist, create a default one to allow QR generation
      const newSecret = crypto.randomUUID();
      const { data: newOffice, error: insertError } = await supabase
        .from("office_settings")
        .insert({
          office_name: "Headquarters",
          latitude: 0,
          longitude: 0,
          qr_secret: newSecret
        })
        .select("id, office_name, qr_secret")
        .single();
        
      if (insertError) throw insertError;
      office = newOffice;
    } else if (!office.qr_secret) {
      // Fallback if qr_secret is null
      const newSecret = crypto.randomUUID();
      const { data: updatedOffice, error: updateError } = await supabase
        .from("office_settings")
        .update({ qr_secret: newSecret })
        .eq("id", office.id)
        .select("id, office_name, qr_secret")
        .single();
      
      if (updateError) throw updateError;
      office = updatedOffice;
    }

    return { success: true, data: office };
  } catch (error) {
    console.error("Failed to fetch office QR data:", error);
    return { success: false, error: "Failed to load QR data." };
  }
}

export async function regenerateQRSecret() {
  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("office_settings")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return { success: false, error: "Office settings not found." };
    }

    const newSecret = crypto.randomUUID();
    const { data: updated, error } = await supabase
      .from("office_settings")
      .update({ qr_secret: newSecret, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, office_name, qr_secret")
      .single();

    if (error) throw error;
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to regenerate QR secret:", error);
    return { success: false, error: "Failed to regenerate QR secret." };
  }
}
