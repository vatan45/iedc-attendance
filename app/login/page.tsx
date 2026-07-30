"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Attempt to restore session silently on load
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      try {
        const res = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Already have a valid session, redirect
          if (data.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/home");
          }
        } else {
          // Token is invalid/expired, clear it
          localStorage.removeItem("attendance_session_token");
          localStorage.removeItem("attendance_session_role");
          localStorage.removeItem("attendance_full_name");
          document.cookie = "attendance_session_token=; Max-Age=0; path=/;";
          document.cookie = "attendance_session_role=; Max-Age=0; path=/;";
        }
      } catch (err) {
        console.error("Failed to restore session", err);
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

      // Save to localStorage
      localStorage.setItem("attendance_session_token", data.token);
      localStorage.setItem("attendance_session_role", data.role);
      localStorage.setItem("attendance_full_name", data.full_name);

      // Save to lightweight cookie (Max-Age 30 days)
      const maxAge = 30 * 24 * 60 * 60;
      const isHttps = window.location.protocol === "https:";
      document.cookie = `attendance_session_token=${data.token}; Max-Age=${maxAge}; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;
      document.cookie = `attendance_session_role=${data.role}; Max-Age=${maxAge}; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;

      // Redirect based on role
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

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-transparent p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-background to-background pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm glass rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-500">
        
        <div className="bg-white p-3 rounded-2xl shadow-sm mb-6 w-full max-w-[200px] flex justify-center">
          <Image 
            src="/logo.png" 
            alt="CU Logo" 
            width={180} 
            height={60} 
            style={{ width: "auto", height: "auto" }}
            className="object-contain" 
            priority
            unoptimized
          />
        </div>

        <div className="w-full mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Welcome Back</h1>
          <p className="text-foreground/60 text-sm">Sign in to your employee portal</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider pl-1" htmlFor="employeeCode">
              Employee Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/40">
                <User size={18} />
              </div>
              <input
                id="employeeCode"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full transition-all"
                placeholder="Enter your code"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider pl-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/40">
                <Lock size={18} />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 group relative w-full flex items-center justify-center gap-2 bg-accent text-white font-bold py-4 rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 shadow-lg shadow-accent/20"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
