"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { CheckCircle2, User, Phone, Briefcase, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

export default function GuestDetails() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [purpose, setPurpose] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const qParam = searchParams.get("q");

    if (qParam) {
      try {
        const decodedPayload = atob(qParam);
        sessionStorage.setItem("guest_qr_payload", decodedPayload);
      } catch (e) {
        setError("Invalid QR code link.");
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sessionStorage.setItem("guest_lat", pos.coords.latitude.toString());
            sessionStorage.setItem("guest_lng", pos.coords.longitude.toString());
          },
          (err) => {
            setError("Location access is required to mark entry.");
          },
          { enableHighAccuracy: true }
        );
      } else {
        setError("Geolocation is not supported by your browser.");
      }
      
      window.history.replaceState(null, "", "/guest/details");
    }

    // After attempting to parse URL, check if payload exists
    const payload = sessionStorage.getItem("guest_qr_payload");
    if (!payload && !qParam) {
      // If they navigated here directly without scanning and no q param
      router.replace("/guest/scan");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !purpose) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const qrPayload = sessionStorage.getItem("guest_qr_payload");
    const latitude = sessionStorage.getItem("guest_lat");
    const longitude = sessionStorage.getItem("guest_lng");

    try {
      const res = await fetch("/api/guest/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrPayload,
          latitude: Number(latitude),
          longitude: Number(longitude),
          name,
          contact_number: contact,
          purpose
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit entry");
      }

      // Success
      setSuccess(true);
      sessionStorage.removeItem("guest_qr_payload");
      sessionStorage.removeItem("guest_lat");
      sessionStorage.removeItem("guest_lng");

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} className="text-white drop-shadow-md" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">Entry Approved</h2>
        <p className="text-xl opacity-90 font-medium max-w-sm mb-10">
          Welcome to the office, {name}! Your visit has been recorded.
        </p>
        <button 
          onClick={() => router.push("/")}
          className="px-8 py-4 bg-white text-green-600 font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-lg flex items-center gap-2"
        >
          Return Home <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Guest Entry" />
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative w-full max-w-md mx-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-foreground mb-2">Visitor Details</h1>
            <p className="text-foreground/60 font-medium">Please provide your details to complete your entry.</p>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-6 shadow-xl flex flex-col gap-5 border border-gray-100 dark:border-gray-800">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground/80 pl-2">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                  <User size={20} />
                </span>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl font-semibold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground/80 pl-2">Contact Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                  <Phone size={20} />
                </span>
                <input 
                  type="tel" 
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="+91 9876543210"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl font-semibold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground/80 pl-2">Purpose of Visit</label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-foreground/40">
                  <Briefcase size={20} />
                </span>
                <textarea 
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Meeting with HR..."
                  required
                  rows={3}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl font-semibold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="mt-4 w-full py-4 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-accent/30"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : "Submit & Mark Entry"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
