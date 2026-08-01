"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import Image from "next/image";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    // Read user details from local storage so UI can greet the user without extra fetch
    const storedName = localStorage.getItem("attendance_full_name");
    if (storedName) {
      setFullName(storedName);
    }
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("attendance_session_token");
    
    // Attempt to delete session from server
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
      } catch (err) {
        console.error("Logout failed on server", err);
      }
    }

    // Always clear local state
    localStorage.removeItem("attendance_session_token");
    localStorage.removeItem("attendance_session_role");
    localStorage.removeItem("attendance_full_name");
    document.cookie = "attendance_session_token=; Max-Age=0; path=/;";
    document.cookie = "attendance_session_role=; Max-Age=0; path=/;";

    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between p-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 border border-gray-100 dark:border-gray-800">
            <Image 
              src="/logo.png" 
              alt="CU Logo" 
              width={32} 
              height={32} 
              style={{ width: "auto", height: "auto" }}
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">{title}</h1>
            {fullName && (
              <span className="text-xs font-semibold text-[#CE1126] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Hi, {fullName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Tooltip>
            <TooltipTrigger 
              onClick={handleLogout}
              className="h-11 w-11 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer outline-none"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </TooltipTrigger>
            <TooltipContent>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
