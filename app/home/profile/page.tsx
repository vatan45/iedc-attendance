"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { UserCircle2, Lock, Save, Loader2, AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

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
      
      <main className="p-4 sm:p-6 w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
        
        {/* Profile Card */}
        <Card className="rounded-3xl p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden border-border bg-card/90">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#CE1126]/10 rounded-full blur-[50px] pointer-events-none" />
          
          <div className="w-24 h-24 bg-[#CE1126]/10 rounded-3xl flex items-center justify-center mb-4 border border-[#CE1126]/20 shadow-inner">
            <UserCircle2 size={54} className="text-[#CE1126]" />
          </div>
          
          {isFetching ? (
            <div className="space-y-3 w-48">
              <Skeleton className="h-6 w-full mx-auto" />
              <div className="flex gap-2 justify-center">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ) : profile ? (
            <>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">{profile.full_name}</h2>
              <div className="flex items-center justify-center gap-2.5">
                <Badge variant="secondary" className="font-mono text-xs font-bold tracking-wider px-3 py-1">
                  {profile.employee_code}
                </Badge>
                <Badge className="bg-[#CE1126] text-white hover:bg-[#CE1126] uppercase font-bold text-[10px] tracking-wider px-3 py-1">
                  {profile.role}
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-destructive font-medium text-sm">Could not load profile details.</p>
          )}
        </Card>

        {/* Change Password Form */}
        <Card className="rounded-3xl p-6 shadow-md relative overflow-hidden border-border bg-card/90">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#CE1126]/10 text-[#CE1126] rounded-2xl">
              <KeyRound size={20} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Change Password</h3>
          </div>
          
          {status && (
            <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className={`mb-6 rounded-2xl border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : ''}`}>
              {status.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
              <AlertDescription className="font-semibold text-xs ml-2">
                {status.msg}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPass" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Current Password
              </Label>
              <Input 
                id="currentPass"
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="rounded-xl h-12 bg-muted/40 font-medium"
                placeholder="••••••••"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPass" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                  New Password
                </Label>
                <Input 
                  id="newPass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="rounded-xl h-12 bg-muted/40 font-medium"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPass" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                  Confirm New
                </Label>
                <Input 
                  id="confirmPass"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="rounded-xl h-12 bg-muted/40 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="mt-3 w-full bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold h-12 rounded-xl shadow-lg shadow-[#CE1126]/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
            </Button>
          </form>
        </Card>

      </main>
    </div>
  );
}
