"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { ChevronLeft, Calendar as CalendarIcon, Clock, LogIn, LogOut, AlertCircle } from "lucide-react";

interface Log {
  id: string;
  type: "entry" | "exit";
  scanned_at: string;
}

interface DailyGroup {
  dateStr: string;
  dateObj: Date;
  logs: Log[];
  totalHours: number | null; // null means incomplete
  isIncomplete: boolean;
}

export default function MyAttendance() {
  const router = useRouter();
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [groupedLogs, setGroupedLogs] = useState<DailyGroup[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [selectedMonth]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) {
        handleAuthError(router);
        return;
      }

      // Calculate start and end of selected month
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;

      // Use local timezone for query boundaries
      const from = new Date(year, monthIndex, 1);
      const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

      const res = await fetch(`/api/attendance/my-logs?from=${from.toISOString()}&to=${to.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleAuthError(router);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await res.json();
      processLogs(data.logs || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load attendance data.");
    } finally {
      setIsLoading(false);
    }
  };

  const processLogs = (logs: Log[]) => {
    // 1. Group by local date string
    const groupsMap = new Map<string, Log[]>();
    
    logs.forEach(log => {
      const date = new Date(log.scanned_at);
      const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (!groupsMap.has(dateStr)) {
        groupsMap.set(dateStr, []);
      }
      groupsMap.get(dateStr)!.push(log);
    });

    // 2. Process each group
    const processedGroups: DailyGroup[] = [];
    let sumHours = 0;

    groupsMap.forEach((dayLogs, dateStr) => {
      // Sort logs chronologically just in case
      dayLogs.sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());
      
      let dailyMilliseconds = 0;
      let isIncomplete = dayLogs.length % 2 !== 0; // Odd number of logs usually implies incomplete (missing an exit, or current shift active)
      
      // Calculate hours if even
      if (!isIncomplete) {
        for (let i = 0; i < dayLogs.length; i += 2) {
          const entry = dayLogs[i];
          const exit = dayLogs[i + 1];
          // Simple validation: assume i is entry and i+1 is exit. 
          // If the order is messed up, mark incomplete.
          if (entry.type === "entry" && exit.type === "exit") {
            dailyMilliseconds += new Date(exit.scanned_at).getTime() - new Date(entry.scanned_at).getTime();
          } else {
            isIncomplete = true;
            break;
          }
        }
      }

      const dailyHours = isIncomplete ? null : dailyMilliseconds / (1000 * 60 * 60);
      if (dailyHours !== null) {
        sumHours += dailyHours;
      }

      processedGroups.push({
        dateStr,
        dateObj: new Date(dayLogs[0].scanned_at),
        logs: dayLogs,
        totalHours: dailyHours,
        isIncomplete
      });
    });

    // 3. Sort groups descending (newest first)
    processedGroups.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    setGroupedLogs(processedGroups);
    setTotalDays(processedGroups.length);
    setTotalHours(sumHours);
  };

  return (
    <div className="flex flex-col">
      <Header title="My Attendance" />
      
      <main className="p-4 sm:p-6 flex-1 max-w-lg w-full mx-auto flex flex-col gap-6 relative">
        
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between mt-2">
          <Link href="/home" className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-foreground font-semibold rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
            <ChevronLeft size={16} />
            Back
          </Link>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground/40">
              <CalendarIcon size={16} />
            </div>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-foreground text-background rounded-3xl p-6 shadow-xl relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-background/70 font-semibold text-xs uppercase tracking-wider mb-1">Total Present</p>
            <p className="text-4xl font-black">{totalDays} <span className="text-xl font-bold text-background/60">Days</span></p>
          </div>
          <div className="text-right relative z-10">
            <p className="text-background/70 font-semibold text-xs uppercase tracking-wider mb-1">Total Hours</p>
            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent to-red-400">{totalHours.toFixed(1)} <span className="text-xl font-bold text-accent/60">Hrs</span></p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800/50 h-32 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center flex flex-col items-center justify-center mt-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon size={32} className="text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-lg font-bold text-foreground">No records found</p>
            <p className="text-sm text-foreground/50 mt-1 font-medium">You have no scans for this month.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2 pb-10">
            {groupedLogs.map(group => (
              <div key={group.dateStr} className="glass rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Day Header */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-800/50">
                  <h3 className="font-bold text-foreground text-lg">{group.dateStr}</h3>
                  {group.isIncomplete ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded-full">
                      INCOMPLETE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-accent font-bold bg-accent/10 px-3 py-1 rounded-full text-sm">
                      <Clock size={14} />
                      {group.totalHours?.toFixed(2)} hrs
                    </span>
                  )}
                </div>

                {/* Day Logs */}
                <div className="flex flex-col gap-4 pl-1">
                  {group.logs.map((log, i) => (
                    <div key={log.id} className="relative flex items-center gap-4">
                      {/* Timeline line */}
                      {i !== group.logs.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-[-20px] w-0.5 bg-gray-100 dark:bg-gray-800" />
                      )}
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 shadow-sm ${log.type === 'entry' ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                        {log.type === 'entry' ? <LogIn size={18} /> : <LogOut size={18} />}
                      </div>
                      
                      <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        <p className="text-sm font-bold capitalize text-foreground">{log.type}</p>
                        <p className="text-xs font-semibold text-foreground/50 mt-0.5">{new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
