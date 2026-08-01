"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { CheckCircle2, User, Phone, Briefcase, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

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
    const sParam = searchParams.get("s");

    if (qParam) {
      try {
        const decodedPayload = atob(qParam);
        sessionStorage.setItem("guest_qr_payload", decodedPayload);
      } catch {
        setError("Invalid QR code link.");
      }
    } else if (sParam) {
      if (sParam) {
        sessionStorage.setItem("guest_qr_payload", JSON.stringify({ qrSecret: sParam }));
      } else {
        setError("Invalid QR code link.");
      }
    }

    if (qParam || sParam) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sessionStorage.setItem("guest_lat", pos.coords.latitude.toString());
            sessionStorage.setItem("guest_lng", pos.coords.longitude.toString());
          },
          () => {
            setError("Location access is required to mark entry.");
          },
          { enableHighAccuracy: true }
        );
      } else {
        setError("Geolocation is not supported by your browser.");
      }
      
      window.history.replaceState(null, "", "/guest/details");
    }

    const payload = sessionStorage.getItem("guest_qr_payload");
    if (!payload && !qParam && !sParam) {
      router.replace("/guest/scan");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !purpose) {
      setError("Please fill in all required fields.");
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
      <div className="fixed inset-0 z-50 bg-[#CE1126] text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/20">
          <CheckCircle2 size={44} className="text-white drop-shadow-md" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight drop-shadow-md">Entry Recorded</h2>
        <p className="text-base sm:text-lg opacity-90 font-medium max-w-sm mb-10 leading-relaxed">
          Welcome to the facility, <span className="font-bold underline">{name}</span>! Your visit log has been successfully captured.
        </p>
        <Button 
          onClick={() => router.push("/")}
          className="h-12 px-8 bg-white text-[#CE1126] hover:bg-zinc-100 font-bold rounded-2xl shadow-2xl text-base flex items-center gap-2 transition-transform active:scale-95"
        >
          <span>Return Home</span> <ArrowRight size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Guest Entry" />
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative w-full max-w-lg mx-auto">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#CE1126]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 my-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-1.5">Visitor Registration</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Please verify your details to obtain access clearance.</p>
          </div>

          <Card className="rounded-3xl p-6 sm:p-8 shadow-xl border-border bg-card/90 backdrop-blur-md flex flex-col gap-5">
            
            {error ? (
              <Alert variant="destructive" className="rounded-2xl border border-destructive/30 bg-destructive/10">
                <AlertTriangle size={18} className="text-destructive shrink-0" />
                <AlertDescription className="text-xs font-bold text-destructive ml-2">{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User size={18} />
                  </span>
                  <Input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="E.g. Jane Doe"
                    required
                    className="pl-10 h-11 bg-muted/40 border-border rounded-xl font-semibold text-sm focus:ring-2 focus:ring-[#CE1126]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Contact Number <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Phone size={18} />
                  </span>
                  <Input 
                    type="tel" 
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    className="pl-10 h-11 bg-muted/40 border-border rounded-xl font-semibold text-sm focus:ring-2 focus:ring-[#CE1126]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Purpose of Visit <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-muted-foreground">
                    <Briefcase size={18} />
                  </span>
                  <textarea 
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="E.g. Scheduled discussion with HR team..."
                    required
                    rows={3}
                    className="w-full pl-10 pr-3.5 py-3 bg-muted/40 border border-border rounded-xl font-medium text-sm text-foreground focus:ring-2 focus:ring-[#CE1126] outline-none resize-none"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 w-full h-12 bg-[#CE1126] hover:bg-[#b30f21] text-white rounded-xl font-bold text-sm shadow-md shadow-[#CE1126]/25 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                <span>{isSubmitting ? "Processing Entry..." : "Submit & Mark Entry"}</span>
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
