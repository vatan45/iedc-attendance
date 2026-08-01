"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="relative h-11 w-11 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer outline-none" aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#CE1126] px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl border-border shadow-xl overflow-hidden bg-popover/95 backdrop-blur-md">
        <div className="p-4 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground tracking-tight text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-[#CE1126]/10 text-[#CE1126] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-[#CE1126] hover:text-[#CE1126]/80 hover:bg-transparent p-0 h-auto flex items-center gap-1"
            >
              <Check size={13} /> Mark all read
            </Button>
          )}
        </div>
        
        <Separator />

        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium flex flex-col items-center gap-2">
              <Bell size={24} className="opacity-20 mb-1" />
              <span>No notifications yet.</span>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/50">
              {notifications.map(notif => (
                <button 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-all duration-200 relative flex flex-col gap-1.5 ${
                    !notif.is_read ? 'bg-[#CE1126]/[0.03] font-medium' : 'opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs sm:text-sm leading-snug ${!notif.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#CE1126] shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {getRelativeTime(notif.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
