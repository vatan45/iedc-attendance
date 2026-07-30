"use client";

import { useState, useEffect } from "react";
import { Scanner as QRScanner } from "@yudiel/react-qr-scanner";

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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header / Cancel Button */}
      <div className="flex justify-end p-4 absolute top-0 left-0 right-0 z-10">
        <button 
          onClick={onCancel}
          className="bg-black/50 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center hover:bg-black/70"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center text-white z-10 p-6 text-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-xl font-medium">{loadingMsg}</p>
          </div>
        ) : (
          <div className="w-full h-full max-w-md mx-auto relative flex flex-col justify-center">
            <QRScanner
              onScan={(result) => handleScan(result[0].rawValue)}
              formats={["qr_code"]}
              options={{ delayBetweenScanAttempts: 100 }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
