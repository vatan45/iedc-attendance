"use server";

import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function saveOfficeSettings(latitude: number, longitude: number, radiusMeters: number) {
  try {
    const supabase = createAdminClient();

    // Fetch existing row
    const { data: existing } = await supabase.from("office_settings").select("id, qr_secret").limit(1).single();

    const payload = {
      office_name: "Headquarters",
      latitude,
      longitude,
      allowed_radius_meters: radiusMeters,
      // Default fallback if creating first time
      qr_secret: existing?.qr_secret || crypto.randomUUID(), 
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from("office_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("office_settings").insert(payload);
      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save office settings:", error);
    return { success: false, error: "Failed to save settings." };
  }
}

export async function getOfficeSettings() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("office_settings").select("*").limit(1).single();
    return data;
  } catch (err) {
    return null;
  }
}
