"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Scanner from "@/components/Scanner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Clock, Calendar, CheckCircle2, XCircle, QrCode, ArrowRight, Activity, MapPin, Sparkles } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EmployeeHome() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [status, setStatus] = useState<"entry" | "exit" | null>(null);
  const [lastLogTime, setLastLogTime] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<{ text: string; type: "entry" | "exit" } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setFullName(localStorage.getItem("attendance_full_name") || "");
    fetchStatus();
    
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const fetchStatus = async () => {
    const token = localStorage.getItem("attendance_session_token");
    if (!token) return;
    try {
      const res = await fetch("/api/attendance/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleAuthError(router);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.timestamp) {
          setLastLogTime(new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch status");
    }
  };

  const handleScanSuccess = async (qrPayload: string, latitude: number, longitude: number) => {
    const token = localStorage.getItem("attendance_session_token");
    if (!token) {
      setScanError("Authentication required.");
      return;
    }

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
    } else if (qrPayload.includes("/q/")) {
      try {
        const url = new URL(qrPayload.startsWith('http') ? qrPayload : `https://${qrPayload}`);
        const secret = url.pathname.split('/').pop();
        if (secret) {
          finalPayload = JSON.stringify({ qrSecret: secret });
        }
      } catch (e) {
        console.error("Failed to parse compact URL payload", e);
      }
    }

    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ qrPayload: finalPayload, latitude, longitude })
      });

      const data = await res.json();

      if (res.status === 401) {
        setScanError("Your session expired or account was deactivated.");
        setTimeout(() => handleAuthError(router), 2000);
        return;
      }

      if (!res.ok) {
        setScanError(data.error || "Failed to mark attendance.");
        return;
      }

      setSuccessMsg({ 
        text: `${data.type === 'entry' ? 'Entry' : 'Exit'} marked at ${new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 
        type: data.type 
      });
      
      setStatus(data.type);
      setLastLogTime(new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      setTimeout(() => {
        setSuccessMsg(null);
        setIsScanning(false);
        setCooldown(10);
      }, 2000);

    } catch (err) {
      setScanError("Network error. Please try again.");
    }
  };

  const timeStr = currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--";
  const dateStr = currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : "";

  if (successMsg) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e8345] text-white flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-white/10 animate-bounce">
          <CheckCircle2 size={52} className="text-white" />
        </div>
        <Badge className="bg-white/20 text-white mb-3 text-sm px-4 py-1 rounded-full border border-white/20 uppercase font-bold tracking-widest">
          {successMsg.type === "entry" ? "Checked In" : "Checked Out"}
        </Badge>
        <h2 className="text-4xl font-extrabold mb-2 tracking-tight">Success!</h2>
        <p className="text-lg opacity-90 font-medium max-w-sm">{successMsg.text}</p>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {scanError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
              <XCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
            <p className="text-red-400 text-sm mb-8 max-w-xs">{scanError}</p>
            <div className="flex gap-3 w-full max-w-xs">
              <Button 
                onClick={() => setScanError(null)} 
                className="flex-1 h-12 bg-white hover:bg-gray-100 text-black font-bold rounded-xl"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => { setIsScanning(false); setScanError(null); }} 
                className="flex-1 h-12 border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Scanner 
            onScanSuccess={handleScanSuccess} 
            onScanError={setScanError}
            onCancel={() => setIsScanning(false)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="IEDC ATTENDANCE PORTAL" />
      <main className="p-4 sm:p-6 flex-1 flex flex-col items-center w-full mx-auto relative pb-32 max-w-lg">
        
        {/* Top: Aceternity Spotlight Card for Clock */}
        <div className="w-full mb-6">
          <SpotlightCard 
            className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black text-white rounded-3xl p-8 border border-zinc-800 shadow-2xl relative overflow-hidden"
            spotlightColor="rgba(206, 17, 38, 0.15)"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#CE1126]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-semibold uppercase tracking-wider mb-4">
                <Calendar size={13} className="text-[#CE1126]" />
                <span>{dateStr || "Loading date..."}</span>
              </div>
              <p className="text-5xl sm:text-6xl font-black tracking-tighter mb-2 font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-zinc-400 drop-shadow-md">
                {timeStr}
              </p>
              <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1 mt-1">
                <Sparkles size={12} className="text-[#CE1126]" /> GPS & Geofence Verification Enabled
              </span>
            </div>
          </SpotlightCard>
        </div>

        {/* Center: Status Badge */}
        <div className="w-full flex justify-center mb-6">
          {status === "entry" ? (
            <Card className="w-full border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-400 rounded-3xl shadow-sm backdrop-blur-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3.5 bg-green-500/20 rounded-2xl ring-1 ring-green-500/30 shrink-0">
                  <Activity size={26} className="text-green-600 dark:text-green-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">You are INSIDE</h3>
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] uppercase font-bold px-2 py-0">Active</Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-medium opacity-85 mt-1 flex items-center gap-1.5">
                    <Clock size={14} /> Last entry at <strong className="font-semibold">{lastLogTime}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : status === "exit" ? (
            <Card className="w-full border-muted-foreground/20 bg-muted/60 text-foreground rounded-3xl shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3.5 bg-muted rounded-2xl border border-border shrink-0">
                  <MapPin size={26} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">You are OUTSIDE</h3>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0">Away</Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock size={14} /> Last exit at <strong className="text-foreground font-semibold">{lastLogTime}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full border-border bg-card/60 rounded-3xl p-6 text-center">
              <CardContent className="p-2 flex flex-col items-center gap-2">
                <Clock size={28} className="text-muted-foreground/40 mb-1" />
                <h3 className="font-bold text-base">Not Checked In Today</h3>
                <p className="text-xs text-muted-foreground max-w-[240px]">Scan the reception office QR code to log your attendance.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Links */}
        <div className="w-full grid grid-cols-1 gap-4 mb-6">
          <Link href="/home/attendance" className="group block w-full">
            <Card className="rounded-2xl border border-border bg-card/80 hover:bg-muted/50 hover:border-[#CE1126]/30 transition-all duration-200 shadow-sm hover:shadow">
              <CardContent className="p-4.5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#CE1126]/10 text-[#CE1126] rounded-xl group-hover:scale-105 transition-transform">
                    <Clock size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground">View My Attendance Logs</span>
                    <span className="text-xs text-muted-foreground">Check daily hours and time records</span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted-foreground group-hover:text-[#CE1126] group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Bottom Fixed Action with Aceternity Shimmer Button */}
        <div className="fixed bottom-[72px] left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center pointer-events-none pb-4 z-30">
          <div className="w-full max-w-sm pointer-events-auto">
            <ShimmerButton
              onClick={() => setIsScanning(true)}
              disabled={cooldown > 0}
              className="w-full h-[68px] bg-[#CE1126] hover:bg-[#b30f21] text-white text-lg font-extrabold rounded-2xl shadow-xl shadow-[#CE1126]/30 hover:shadow-[#CE1126]/40 transition-all duration-300 flex items-center justify-center gap-3"
            >
              {cooldown > 0 ? `Please Wait ${cooldown}s...` : (
                <>
                  <QrCode size={24} className="animate-pulse" />
                  <span className="tracking-wide">Scan to Mark</span>
                </>
              )}
            </ShimmerButton>
          </div>
        </div>

      </main>
    </div>
  );
}
