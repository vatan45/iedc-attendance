"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Scanner from "@/components/Scanner";
import Header from "@/components/Header";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GuestScan() {
  const router = useRouter();
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScanSuccess = (qrPayload: string, latitude: number, longitude: number) => {
    let finalPayload = qrPayload;
    if (qrPayload.includes("?q=")) {
      try {
        const url = new URL(qrPayload);
        const qParam = url.searchParams.get("q");
        if (qParam) {
          finalPayload = atob(qParam);
        }
      } catch (e) {
        console.error("Failed to parse URL payload", e);
      }
    }

    // Store temporarily to pass to the next screen
    sessionStorage.setItem("guest_qr_payload", finalPayload);
    sessionStorage.setItem("guest_lat", latitude.toString());
    sessionStorage.setItem("guest_lng", longitude.toString());
    
    // Move to details form
    router.push("/guest/details");
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </Link>
      </div>

      {scanError ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center flex-1">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
            <XCircle size={32} />
          </div>
          <p className="text-red-400 text-lg mb-8">{scanError}</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setScanError(null)} 
              className="px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-100"
            >
              Try Again
            </button>
            <Link 
              href="/"
              className="px-6 py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/10"
            >
              Cancel
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <Scanner 
            onScanSuccess={handleScanSuccess} 
            onScanError={setScanError}
            onCancel={() => router.push("/")} 
          />
        </div>
      )}
    </div>
  );
}
