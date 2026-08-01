"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  LineChart, 
  Users, 
  CheckSquare, 
  PieChart, 
  UserCheck, 
  QrCode, 
  MapPin, 
  LogOut,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: <BarChart3 size={20} /> },
    { name: "Analytics", href: "/admin/analytics", icon: <LineChart size={20} /> },
    { name: "Employees", href: "/admin/employees", icon: <Users size={20} /> },
    { name: "Tasks", href: "/admin/tasks", icon: <CheckSquare size={20} /> },
    { name: "Task Analytics", href: "/admin/tasks/analytics", icon: <PieChart size={20} /> },
    { name: "Guest Entries", href: "/admin/guests", icon: <UserCheck size={20} /> },
    { name: "Reception QR", href: "/admin/reception-qr", icon: <QrCode size={20} /> },
    { name: "Office Settings", href: "/admin/office-settings", icon: <MapPin size={20} /> },
  ];

  const handleLogout = async () => {
    const token = localStorage.getItem("attendance_session_token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    }
    localStorage.removeItem("attendance_session_token");
    localStorage.removeItem("attendance_session_role");
    localStorage.removeItem("attendance_full_name");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      {/* Sidebar (Desktop) - removed notification bell per instructions */}
      <aside className="hidden md:flex flex-col w-64 bg-card/90 backdrop-blur-md border-r border-border shadow-sm fixed top-0 bottom-0 z-20 transition-all">
        <div className="p-6 pb-4 border-b border-border/50">
          <h1 className="text-lg font-extrabold tracking-tight text-[#CE1126]">
            IEDC Attendance Portal
          </h1>
          <span className="inline-block px-2 py-0.5 mt-1 rounded-md bg-muted text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Admin Panel
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#CE1126] text-white shadow-md shadow-[#CE1126]/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground transition-colors"}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-white/70" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="flex items-center justify-start gap-3 w-full text-left rounded-xl font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors h-11"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-20">
        <h1 className="text-base font-bold text-[#CE1126] tracking-tight">IEDC Admin</h1>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-muted-foreground hover:text-destructive"
        >
          <LogOut size={14} className="mr-1.5" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 pt-2 md:pt-4 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/80 flex justify-around p-1.5 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 min-w-0 transition-all ${
                isActive ? "text-[#CE1126] scale-105 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] truncate w-full text-center tracking-tight">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
