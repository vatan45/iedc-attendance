"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Scanner from "@/components/Scanner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Clock, Calendar, CheckCircle2, XCircle, QrCode, ArrowRight, Activity, MapPin } from "lucide-react";

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

  // Load profile and status on mount
  useEffect(() => {
    setFullName(localStorage.getItem("attendance_full_name") || "");
    fetchStatus();
    
    // Live clock
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Cooldown countdown
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

    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ qrPayload, latitude, longitude })
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

      // Success!
      setSuccessMsg({ 
        text: `${data.type === 'entry' ? 'Entry' : 'Exit'} marked at ${new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 
        type: data.type 
      });
      
      // Update local state
      setStatus(data.type);
      setLastLogTime(new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      // Close success screen after 2s
      setTimeout(() => {
        setSuccessMsg(null);
        setIsScanning(false);
        setCooldown(10); // 10 second cooldown
      }, 2000);

    } catch (err) {
      setScanError("Network error. Please try again.");
    }
  };

  // Format clock
  const timeStr = currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--";
  const dateStr = currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : "";

  // Render Full-Screen Success
  if (successMsg) {
    return (
      <div className="fixed inset-0 z-50 bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Success!</h2>
        <p className="text-xl opacity-90">{successMsg.text}</p>
      </div>
    );
  }

  // Render Full-Screen Scanner
  if (isScanning) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {scanError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
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
              <button 
                onClick={() => { setIsScanning(false); setScanError(null); }} 
                className="px-6 py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/10"
              >
                Cancel
              </button>
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
        
        {/* Top: Clock Card */}
        <div className="w-full mb-6">
          <div className="bg-gradient-to-br from-gray-900 to-black dark:from-gray-800 dark:to-gray-900 text-white shadow-xl rounded-[2rem] p-8 relative overflow-hidden border border-gray-800">
            {/* abstract shapes */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 text-white/70 mb-2 font-medium">
                <Calendar size={16} />
                <span>{dateStr || "Loading..."}</span>
              </div>
              <p className="text-5xl sm:text-6xl font-black tracking-tighter mb-1 drop-shadow-md">{timeStr}</p>
            </div>
          </div>
        </div>

        {/* Center: Status Badge */}
        <div className="w-full flex justify-center mb-8">
          {status === "entry" ? (
            <div className="glass w-full bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Activity size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">You are INSIDE</h3>
                <p className="text-sm opacity-80 mt-1 flex items-center gap-1"><Clock size={14}/> Last entry at {lastLogTime}</p>
              </div>
            </div>
          ) : status === "exit" ? (
            <div className="glass w-full bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
              <div className="p-3 bg-gray-500/20 rounded-full">
                <MapPin size={24} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">You are OUTSIDE</h3>
                <p className="text-sm opacity-80 mt-1 flex items-center gap-1"><Clock size={14}/> Last exit at {lastLogTime}</p>
              </div>
            </div>
          ) : (
            <div className="glass w-full bg-gray-500/5 border-gray-500/10 text-gray-600 dark:text-gray-400 p-6 rounded-[2rem] text-center">
              <p className="font-medium">No attendance marked today yet</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="w-full grid grid-cols-1 gap-4 mb-6">
          <Link href="/home/attendance" className="glass p-5 rounded-[2rem] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                <Clock size={20} />
              </div>
              <span className="font-semibold">View My Attendance</span>
            </div>
            <ArrowRight size={18} className="text-foreground/40 group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Bottom Fixed Action */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center pointer-events-none pb-8">
          <button
            onClick={() => setIsScanning(true)}
            disabled={cooldown > 0}
            className="w-full max-w-[320px] h-[72px] bg-accent text-white text-lg font-bold rounded-[2rem] shadow-[0_8px_30px_rgb(206,17,38,0.3)] hover:bg-accent-hover hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:scale-100 flex items-center justify-center gap-3 pointer-events-auto"
          >
            {cooldown > 0 ? `Wait ${cooldown}s` : (
              <>
                <QrCode size={24} />
                <span>Scan to Mark</span>
              </>
            )}
          </button>
        </div>

      </main>
    </div>
  );
}
