"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { saveOfficeSettings, getOfficeSettings } from "./actions";

// Dynamically load the Leaflet Map to avoid SSR issues with 'window'
const MapComponent = dynamic(() => import("@/components/Map"), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> 
});

export default function OfficeSettingsPage() {
  const [lat, setLat] = useState<number | "">("");
  const [lon, setLon] = useState<number | "">("");
  const [radius, setRadius] = useState<number>(150);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "warning" } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getOfficeSettings();
      if (settings) {
        setLat(settings.latitude);
        setLon(settings.longitude);
        setRadius(settings.allowed_radius_meters);
      }
    }
    loadSettings();
  }, []);

  const handleGetCurrentLocation = () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ text: "Geolocation is not supported by your browser.", type: "error" });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLon(position.coords.longitude);
        
        if (position.coords.accuracy > 50) {
          setMessage({ text: `Warning: GPS accuracy is poor (${Math.round(position.coords.accuracy)}m). Ensure you are outside or near a window.`, type: "warning" });
        } else {
          setMessage({ text: "Location captured successfully.", type: "success" });
        }
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setMessage({ text: "Location access is required to mark attendance. Please enable location permissions for this site in your browser settings.", type: "error" });
        } else {
          setMessage({ text: "Failed to fetch location. Please try again or enter manually.", type: "error" });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lat === "" || lon === "") {
      setMessage({ text: "Latitude and Longitude are required.", type: "error" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const res = await saveOfficeSettings(Number(lat), Number(lon), Number(radius));
    if (res.success) {
      setMessage({ text: "Settings saved successfully.", type: "success" });
    } else {
      setMessage({ text: res.error || "Failed to save.", type: "error" });
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="px-6 pb-6 flex-1 max-w-4xl w-full mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Office Settings</h1>
        
        {message && message.type === 'error' && (
           <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex justify-between items-start">
             <p className="text-sm font-medium">{message.text}</p>
             {message.text.includes("permission") && (
               <button onClick={handleGetCurrentLocation} className="text-sm underline ml-4 font-semibold shrink-0">Retry</button>
             )}
           </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-1 text-accent">Geofencing</h2>
          <p className="text-foreground/70 mb-6 text-sm">
            Set the geographical boundary for the office. Employees must be inside this circle to check in or out.
          </p>

          <button 
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-800 text-foreground font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-8 disabled:opacity-50"
          >
            {isLoading ? "Fetching GPS..." : "📍 Set Current Location as Office"}
          </button>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground/80">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none w-full"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground/80">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(e.target.value === "" ? "" : Number(e.target.value))}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none w-full"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground/80">Allowed Radius (meters)</label>
              <input
                type="number"
                min="10"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none w-full"
                required
              />
              <p className="text-xs text-foreground/50 mt-1">
                Employees must be within this distance of the office to scan.
              </p>
            </div>

            {lat !== "" && lon !== "" && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground/80 mb-2">Coverage Preview</p>
                <MapComponent latitude={Number(lat)} longitude={Number(lon)} radius={radius} />
              </div>
            )}

            {message && message.type !== 'error' && (
              <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-accent' : 'text-amber-600'}`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || lat === "" || lon === ""}
              className="mt-2 w-full bg-accent text-white font-medium py-3 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
