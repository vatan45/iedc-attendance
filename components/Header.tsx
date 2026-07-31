"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import Image from "next/image";

interface HeaderProps {
  title: string;
}

import NotificationBell from "@/components/NotificationBell";

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
    <header className="sticky top-0 z-40 w-full glass border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between p-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1">
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
            <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
            {fullName && <span className="text-xs font-medium text-accent">Hi, {fullName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-gray-100 dark:bg-gray-800 text-foreground rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
            aria-label="Logout"
          >
            <LogOut size={18} className="text-accent" />
          </button>
        </div>
      </div>
    </header>
  );
}
