"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { UserCircle2, Lock, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string; employee_code: string; role: string } | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) {
        router.push("/login");
        return;
      }
      
      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("attendance_session_token");
            router.push("/login");
          }
          throw new Error("Failed to load profile");
        }
        
        const data = await res.json();
        setProfile(data.employee);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchProfile();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }
    
    if (newPassword.length < 6) {
      setStatus({ type: "error", msg: "New password must be at least 6 characters long." });
      return;
    }
    
    setIsSubmitting(true);
    const token = localStorage.getItem("attendance_session_token");
    
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Failed to change password." });
      } else {
        setStatus({ type: "success", msg: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setStatus({ type: "error", msg: "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile" />
      
      <main className="p-4 sm:p-6 w-full max-w-lg mx-auto flex flex-col gap-6">
        
        {/* Profile Card */}
        <section className="glass rounded-[2rem] p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[50px]" />
          
          <div className="w-24 h-24 bg-gradient-to-tr from-accent/20 to-accent/5 rounded-full flex items-center justify-center mb-4 border border-accent/20">
            <UserCircle2 size={48} className="text-accent" />
          </div>
          
          {isFetching ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-accent" />
              <p className="text-sm text-foreground/50">Loading profile...</p>
            </div>
          ) : profile ? (
            <>
              <h2 className="text-2xl font-black text-foreground mb-1">{profile.full_name}</h2>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="bg-foreground/5 text-foreground/70 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider">
                  {profile.employee_code}
                </span>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {profile.role}
                </span>
              </div>
            </>
          ) : (
            <p className="text-red-500">Could not load profile details.</p>
          )}
        </section>

        {/* Change Password Form */}
        <section className="glass rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-foreground/5 rounded-xl">
              <Lock size={20} className="text-foreground/70" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Change Password</h3>
          </div>
          
          {status && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-start gap-3 ${
              status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
            }`}>
              {status.type === 'error' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
              <span>{status.msg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Current Password</label>
              <input 
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">New Password</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Confirm New</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full bg-accent hover:bg-accent/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSubmitting ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        </section>

      </main>
    </div>
  );
}
