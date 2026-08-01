"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const router = useRouter();

  // Attempt to restore session silently on load
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) {
        setIsRestoringSession(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/home");
          }
        } else {
          localStorage.removeItem("attendance_session_token");
          localStorage.removeItem("attendance_session_role");
          localStorage.removeItem("attendance_full_name");
          document.cookie = "attendance_session_token=; Max-Age=0; path=/;";
          document.cookie = "attendance_session_role=; Max-Age=0; path=/;";
          setIsRestoringSession(false);
        }
      } catch (err) {
        console.error("Failed to restore session", err);
        setIsRestoringSession(false);
      }
    };
    restoreSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_code: employeeCode, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("attendance_session_token", data.token);
      localStorage.setItem("attendance_session_role", data.role);
      localStorage.setItem("attendance_full_name", data.full_name);

      const maxAge = 30 * 24 * 60 * 60;
      const isHttps = window.location.protocol === "https:";
      document.cookie = `attendance_session_token=${data.token}; Max-Age=${maxAge}; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;
      document.cookie = `attendance_session_role=${data.role}; Max-Age=${maxAge}; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRestoringSession) {
    return (
      <main className="relative flex items-center justify-center min-h-screen bg-transparent p-6 overflow-hidden">
        <BackgroundBeams />
        <Card className="relative z-10 w-full max-w-sm border-border/80 shadow-2xl p-8 bg-card/90 backdrop-blur-xl rounded-3xl">
          <div className="flex flex-col items-center gap-6 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#CE1126]" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-3 w-1/2 mx-auto" />
            </div>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-transparent p-6 overflow-hidden">
      {/* Background Decor */}
      <BackgroundBeams />

      <Card className="relative z-10 w-full max-w-sm border-border/80 shadow-2xl bg-card/95 backdrop-blur-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#CE1126] to-transparent" />
        <CardHeader className="pt-8 pb-4 flex flex-col items-center text-center">
          <div className="bg-white p-3 rounded-2xl shadow-sm mb-4 border border-gray-100 w-full max-w-[200px] flex justify-center">
            <Image 
              src="/logo.png" 
              alt="CU Logo" 
              width={170} 
              height={55} 
              style={{ width: "auto", height: "auto" }}
              className="object-contain" 
              priority
              unoptimized
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Welcome Back</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-sm">
            Sign in to your verified employee portal
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 relative">
              <Label htmlFor="employeeCode" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Employee Code
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <User size={18} />
                </div>
                <Input
                  id="employeeCode"
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="pl-11 pr-4 h-12 bg-muted/40 border-border rounded-xl font-medium focus-visible:ring-2 focus-visible:ring-[#CE1126] focus-visible:border-transparent w-full transition-all"
                  placeholder="e.g. EMP-001"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 relative">
              <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Password
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-4 h-12 bg-muted/40 border-border rounded-xl font-medium focus-visible:ring-2 focus-visible:ring-[#CE1126] focus-visible:border-transparent w-full transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl py-3 border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-semibold text-xs ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <ShimmerButton
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-13 bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold text-base rounded-xl shadow-lg shadow-[#CE1126]/20 transition-all flex items-center justify-center gap-2.5"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </ShimmerButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
