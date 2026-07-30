"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Employees", href: "/admin/employees", icon: "👥" },
    { name: "Reception QR", href: "/admin/reception-qr", icon: "🖨️" },
    { name: "Office Settings", href: "/admin/office-settings", icon: "📍" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-sm fixed top-0 bottom-0 z-20">
        <div className="p-6">
          <h1 className="text-xl font-bold text-accent">IEDC Attendance Portal</h1>
          <p className="text-xs text-foreground/50 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 px-4 py-4 flex flex-col gap-2">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-foreground/70 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={async () => {
              const token = localStorage.getItem('attendance_session_token');
              if (token) {
                await fetch('/api/auth/logout', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                });
              }
              localStorage.removeItem('attendance_session_token');
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl font-medium text-foreground/70 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span className="text-lg">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20">
        <h1 className="text-lg font-bold text-accent">IEDC Attendance Portal</h1>
        <button 
          onClick={async () => {
            const token = localStorage.getItem('attendance_session_token');
            if (token) {
              await fetch('/api/auth/logout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
              });
            }
            localStorage.removeItem('attendance_session_token');
            window.location.href = '/login';
          }}
          className="text-sm font-medium text-foreground/70"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 pt-4 md:pt-6">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-around p-2 z-20 pb-safe">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 min-w-0 ${isActive ? 'text-accent' : 'text-foreground/50 hover:text-foreground'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  );
}
