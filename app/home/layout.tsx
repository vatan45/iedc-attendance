"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, UserCircle2, CheckSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingTasks, setPendingTasks] = useState(0);

  useEffect(() => {
    const fetchPendingTasks = async () => {
      try {
        const token = localStorage.getItem("attendance_session_token");
        if (!token) return;
        const res = await fetch("/api/tasks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPendingTasks(data.pendingCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch tasks count", err);
      }
    };
    fetchPendingTasks();
    const interval = setInterval(fetchPendingTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Dashboard", href: "/home", icon: <Home size={22} /> },
    { name: "Attendance", href: "/home/attendance", icon: <List size={22} /> },
    { name: "Tasks", href: "/home/tasks", icon: <CheckSquare size={22} />, badge: pendingTasks },
    { name: "Profile", href: "/home/profile", icon: <UserCircle2 size={22} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative">
      {/* Main Content */}
      <div className="flex-1 pb-[72px]">
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border/70 flex justify-around p-2 z-40 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`group relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl flex-1 min-w-0 max-w-[100px] transition-all duration-200 ${
                isActive 
                ? 'text-[#CE1126] font-bold scale-105' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {item.badge && item.badge > 0 ? (
                <div className="relative">
                  {item.icon}
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#CE1126] px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-card">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                </div>
              ) : (
                <div className={isActive ? "text-[#CE1126]" : "text-muted-foreground group-hover:text-foreground transition-colors"}>
                  {item.icon}
                </div>
              )}
              <span className={`text-[10px] tracking-tight w-full text-center ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-1 bg-[#CE1126] rounded-t-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  );
}
