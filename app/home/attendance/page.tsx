"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { ChevronLeft, Calendar as CalendarIcon, Clock, LogIn, LogOut, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface Log {
  id: string;
  type: "entry" | "exit";
  scanned_at: string;
}

interface DailyGroup {
  dateStr: string;
  dateObj: Date;
  logs: Log[];
  totalHours: number | null;
  isIncomplete: boolean;
}

const formatHoursToReadable = (decimalHours: number) => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export default function MyAttendance() {
  const router = useRouter();
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

      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;

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
    const groupsMap = new Map<string, Log[]>();
    
    logs.forEach(log => {
      const date = new Date(log.scanned_at);
      const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (!groupsMap.has(dateStr)) {
        groupsMap.set(dateStr, []);
      }
      groupsMap.get(dateStr)!.push(log);
    });

    const processedGroups: DailyGroup[] = [];
    let sumHours = 0;

    groupsMap.forEach((dayLogs, dateStr) => {
      dayLogs.sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());
      
      let dailyMilliseconds = 0;
      let isIncomplete = dayLogs.length % 2 !== 0;
      
      if (!isIncomplete) {
        for (let i = 0; i < dayLogs.length; i += 2) {
          const entry = dayLogs[i];
          const exit = dayLogs[i + 1];
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
          <Link href="/home">
            <Button variant="outline" size="sm" className="rounded-full h-9 font-semibold gap-1.5 text-xs px-4">
              <ChevronLeft size={16} />
              Back
            </Button>
          </Link>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <CalendarIcon size={15} />
            </div>
            <Input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3.5 h-9 bg-card border-border rounded-full text-xs font-bold w-auto shadow-sm"
            />
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-tr from-zinc-900 via-zinc-900 to-black text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-zinc-800">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#CE1126]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-white/60 font-semibold text-xs uppercase tracking-wider mb-1">Total Present</p>
              <p className="text-4xl font-black">{totalDays} <span className="text-lg font-bold text-white/50">Days</span></p>
            </div>
            <div className="text-right">
              <p className="text-white/60 font-semibold text-xs uppercase tracking-wider mb-1">Total Time</p>
              <p className="text-3xl font-black text-[#ff4d6a]">{formatHoursToReadable(totalHours)}</p>
            </div>
          </div>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-36 w-full rounded-3xl" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-semibold ml-2">{error}</AlertDescription>
          </Alert>
        ) : groupedLogs.length === 0 ? (
          <Card className="rounded-3xl p-12 text-center flex flex-col items-center justify-center mt-4 bg-card/60">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <CalendarIcon size={30} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">No records found</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">You have no recorded logs for this month.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 mt-2 pb-12">
            {groupedLogs.map(group => (
              <Card key={group.dateStr} className="rounded-3xl p-5 shadow-sm border-border bg-card/90 hover:shadow-md transition-shadow">
                
                {/* Day Header */}
                <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-border/60">
                  <h3 className="font-bold text-foreground text-base">{group.dateStr}</h3>
                  {group.isIncomplete ? (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20 text-[11px]">
                      INCOMPLETE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-[#CE1126]/10 text-[#CE1126] font-bold px-2.5 py-0.5 rounded-full border border-[#CE1126]/20 gap-1 text-[11px]">
                      <Clock size={12} />
                      <span>{group.totalHours ? formatHoursToReadable(group.totalHours) : "0m"}</span>
                    </Badge>
                  )}
                </div>

                {/* Day Logs */}
                <div className="flex flex-col gap-3 pl-1">
                  {group.logs.map((log, i) => (
                    <div key={log.id} className="relative flex items-center gap-3.5">
                      {i !== group.logs.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-16px] w-0.5 bg-border" />
                      )}
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 shadow-sm border ${
                        log.type === 'entry' 
                          ? 'bg-green-500/15 text-green-600 border-green-500/20 dark:text-green-400' 
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {log.type === 'entry' ? <LogIn size={18} /> : <LogOut size={18} />}
                      </div>
                      
                      <div className="flex-1 bg-muted/40 p-3 rounded-xl border border-border/50">
                        <p className="text-sm font-bold capitalize text-foreground">{log.type}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                          {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </Card>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
