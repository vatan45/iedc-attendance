"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Scanner from "@/components/Scanner";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

    sessionStorage.setItem("guest_qr_payload", finalPayload);
    sessionStorage.setItem("guest_lat", latitude.toString());
    sessionStorage.setItem("guest_lng", longitude.toString());
    
    router.push("/guest/details");
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute top-6 left-6 z-50">
        <Link href="/" aria-label="Go Back" className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-lg">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {scanError ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center flex-1">
          <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-6 border border-destructive/30 shadow-lg shadow-destructive/10">
            <XCircle size={36} />
          </div>
          <p className="text-destructive text-lg font-bold mb-8 max-w-sm">{scanError}</p>
          <div className="flex gap-4">
            <Button 
              onClick={() => setScanError(null)} 
              className="bg-white hover:bg-gray-100 text-black font-bold h-12 px-6 rounded-xl shadow-lg text-sm"
            >
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/")}
              className="border-white/20 text-white hover:bg-white/10 font-bold h-12 px-6 rounded-xl text-sm"
            >
              Cancel
            </Button>
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
