"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, UserCircle2 } from "lucide-react";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/home", icon: <Home size={22} /> },
    { name: "Attendance", href: "/home/attendance", icon: <List size={22} /> },
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
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl flex-1 min-w-0 transition-all ${
                isActive 
                ? 'text-accent scale-110' 
                : 'text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {item.icon}
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
