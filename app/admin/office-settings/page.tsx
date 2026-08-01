"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import { saveOfficeSettings, getOfficeSettings } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MapComponent = dynamic(() => import("@/components/Map"), { 
  ssr: false, 
  loading: () => <Skeleton className="h-72 w-full rounded-2xl" /> 
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
          setMessage({ text: "Location access is required to set coordinates. Please enable location permissions in your browser.", type: "error" });
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
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Office Settings" />
      
      <main className="p-4 sm:p-6 flex-1 max-w-4xl w-full mx-auto flex flex-col gap-6 pb-16">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Office Geofencing & Location</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Configure campus attendance perimeters and coordinate boundaries</p>
        </div>
        
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`rounded-2xl border ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 
            message.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : ''
          }`}>
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription className="font-semibold text-xs ml-2 flex items-center justify-between w-full">
              <span>{message.text}</span>
              {message.text.includes("permission") && (
                <Button variant="link" size="sm" onClick={handleGetCurrentLocation} className="text-xs font-extrabold h-auto p-0 ml-4 underline">Retry</Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="rounded-3xl border-border shadow-md p-6 sm:p-8 bg-card/90">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-border/60">
            <div>
              <h2 className="text-lg font-bold text-foreground">Geofence Boundary</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Employees must be physically positioned inside this circular zone to mark attendance.
              </p>
            </div>
            
            <Button 
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              disabled={isLoading}
              className="rounded-xl font-bold text-xs h-10 px-4 gap-2 bg-card border-border hover:bg-muted shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#CE1126]" /> : <MapPin size={16} className="text-[#CE1126]" />}
              <span>{isLoading ? "Fetching GPS..." : "Set Current Location"}</span>
            </Button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-12 rounded-xl bg-muted/40 font-mono font-bold text-base"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-12 rounded-xl bg-muted/40 font-mono font-bold text-base"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Allowed Radius (meters)</Label>
              <Input
                type="number"
                min="10"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-12 rounded-xl bg-muted/40 font-mono font-bold text-base max-w-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Recommended between 100m to 250m to accommodate building GPS drift.
              </p>
            </div>

            {lat !== "" && lon !== "" && (
              <div className="mt-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Coverage Map Preview</Label>
                <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                  <MapComponent latitude={Number(lat)} longitude={Number(lon)} radius={radius} />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSaving || lat === "" || lon === ""}
              className="mt-4 bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold h-12 rounded-xl shadow-lg shadow-[#CE1126]/20 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSaving ? "Saving Configuration..." : "Save Configuration"}</span>
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
