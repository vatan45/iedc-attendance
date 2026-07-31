"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, UserCircle2, CheckSquare } from "lucide-react";
import { useEffect, useState } from "react";

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
    // Poll every 60s for new tasks
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
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-gray-200/50 dark:border-gray-800/50 flex justify-around p-2 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl flex-1 min-w-0 transition-all ${
                isActive 
                ? 'text-accent scale-110' 
                : 'text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {item.badge ? (
                <div className="relative">
                  {item.icon}
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-900">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                </div>
              ) : (
                item.icon
              )}
              <span className={`text-[10px] font-bold tracking-wide w-full text-center ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  );
}
