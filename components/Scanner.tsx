"use client";

import { useState, useEffect } from "react";
import { Scanner as QRScanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { X, Loader2, MapPin } from "lucide-react";

interface ScannerProps {
  onScanSuccess: (payload: string, latitude: number, longitude: number) => void;
  onCancel: () => void;
  onScanError: (error: string) => void;
}

export default function Scanner({ onScanSuccess, onCancel, onScanError }: ScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Scan the QR Code");
  
  // Pre-fetch location to make scanning lightning fast
  const [cachedLocation, setCachedLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCachedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* ignore error, we'll try again on scan if needed */ },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    }
  }, []);

  const handleScan = (result: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    if (cachedLocation) {
      onScanSuccess(result, cachedLocation.lat, cachedLocation.lng);
      return;
    }

    setLoadingMsg("Checking your location...");

    if (!navigator.geolocation) {
      onScanError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onScanSuccess(result, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onScanError("Location access is required to mark attendance. Please enable location permissions.");
        } else {
          onScanError("Failed to fetch location. Ensure GPS is enabled.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      {/* Header / Cancel Button */}
      <div className="flex items-center justify-between p-4 sm:p-6 absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md border border-white/10">
          <MapPin size={14} className="text-[#CE1126] animate-pulse" />
          <span>{cachedLocation ? "GPS Active" : "Locating..."}</span>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={onCancel}
          className="h-10 w-10 rounded-full border-white/20 bg-black/50 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
        >
          <X size={18} />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center text-white z-10 p-6 text-center animate-in zoom-in-95 duration-300">
            <Loader2 className="h-12 w-12 animate-spin text-[#CE1126] mb-4" />
            <p className="text-xl font-semibold tracking-tight">{loadingMsg}</p>
            <p className="text-xs text-white/60 mt-2 max-w-xs">Please hold still while we verify your coordinates and token.</p>
          </div>
        ) : (
          <div className="w-full h-full max-w-md mx-auto relative flex flex-col justify-center">
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
              {/* Scan target visual overlay */}
              <div className="w-64 h-64 border-2 border-dashed border-[#CE1126]/60 rounded-3xl animate-[pulse_2s_infinite] relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#CE1126] rounded-tl-xl -translate-x-1 -translate-y-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#CE1126] rounded-tr-xl translate-x-1 -translate-y-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#CE1126] rounded-bl-xl -translate-x-1 translate-y-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#CE1126] rounded-br-xl translate-x-1 translate-y-1" />
              </div>
              <p className="text-sm font-medium text-white/80 mt-6 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                Align QR inside the frame
              </p>
            </div>
            <QRScanner
              onScan={(result) => handleScan(result[0].rawValue)}
              formats={["qr_code"]}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
