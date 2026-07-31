"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock } from "lucide-react";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setIsOpen(false);
    
    // Mark as read if unread
    if (!notif.is_read) {
      try {
        const token = localStorage.getItem("attendance_session_token");
        await fetch(`/api/notifications/${notif.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }

    // Navigate to related task
    if (notif.related_task_id) {
      router.push(`/tasks/${notif.related_task_id}`);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = (new Date(dateStr).getTime() - new Date().getTime()) / 1000;
    
    if (Math.abs(diff) < 60) return 'Just now';
    if (Math.abs(diff) < 3600) return rtf.format(Math.floor(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.floor(diff / 3600), 'hour');
    return rtf.format(Math.floor(diff / 86400), 'day');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-gray-100 dark:bg-gray-800 text-foreground rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95 relative"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-foreground/70" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[500px] animate-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-black/50">
            <h3 className="font-bold text-foreground tracking-tight">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-foreground/40 text-sm font-semibold">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/50">
                {notifications.map(notif => (
                  <button 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative flex flex-col gap-1 ${!notif.is_read ? 'bg-accent/5 dark:bg-accent/10' : ''}`}
                  >
                    {!notif.is_read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full"></div>}
                    <p className={`text-sm ${!notif.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/70'} pl-2`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-bold text-foreground/40 pl-2 flex items-center gap-1 mt-1">
                      <Clock size={10} /> {getRelativeTime(notif.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
