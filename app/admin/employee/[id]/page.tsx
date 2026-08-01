"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { ArrowLeft, Download, Plus, Clock, Calendar, UserCheck, UserX, AlertTriangle, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Log {
  id: string;
  type: "entry" | "exit";
  scanned_at: string;
  added_by_admin: boolean;
  distance_from_office_meters: number;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  is_active: boolean;
  currentStatus: "entry" | "exit" | null;
}

interface DailyGroup {
  dateStr: string;
  dateObj: Date;
  logs: Log[];
  totalHours: number | null;
  isIncomplete: boolean;
}

export default function AdminEmployeeDetail(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const params = use(props.params);
  const employeeId = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [groupedLogs, setGroupedLogs] = useState<DailyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Modals state
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editTimeStr, setEditTimeStr] = useState("");
  
  const [addLogDate, setAddLogDate] = useState<string | null>(null);
  const [addLogTime, setAddLogTime] = useState("");
  const [addLogType, setAddLogType] = useState<"entry"|"exit">("entry");

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, employeeId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
      const toIso = new Date(`${toDate}T23:59:59`).toISOString();

      const res = await fetch(`/api/admin/employee/${employeeId}/logs?from=${fromIso}&to=${toIso}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleAuthError(router);
        return;
      }
      if (!res.ok) throw new Error("Failed to load employee logs");

      const data = await res.json();
      setEmployee(data.employee);
      processLogs(data.logs || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employee attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  const processLogs = (logs: Log[]) => {
    const groupsMap = new Map<string, Log[]>();
    logs.forEach(log => {
      const date = new Date(log.scanned_at);
      const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (!groupsMap.has(dateStr)) groupsMap.set(dateStr, []);
      groupsMap.get(dateStr)!.push(log);
    });

    const processedGroups: DailyGroup[] = [];
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

      processedGroups.push({
        dateStr,
        dateObj: new Date(dayLogs[0].scanned_at),
        logs: dayLogs,
        totalHours: isIncomplete ? null : dailyMilliseconds / (1000 * 60 * 60),
        isIncomplete
      });
    });

    processedGroups.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    setGroupedLogs(processedGroups);
  };

  const handleEdit = async () => {
    if (!editLogId || !editTimeStr) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const log = groupedLogs.flatMap(g => g.logs).find(l => l.id === editLogId);
      if (!log) return;
      
      const datePart = new Date(log.scanned_at).toISOString().split('T')[0];
      const newIso = new Date(`${datePart}T${editTimeStr}:00`).toISOString();

      const res = await fetch(`/api/admin/employee/${employeeId}/logs/${editLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scanned_at: newIso })
      });

      if (!res.ok) throw new Error();
      setEditLogId(null);
      fetchData();
    } catch {
      alert("Failed to modify log time.");
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm("Are you certain you wish to delete this attendance log?")) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/employee/${employeeId}/logs/${logId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      fetchData();
    } catch {
      alert("Failed to remove log.");
    }
  };

  const handleAddLog = async () => {
    if (!addLogDate || !addLogTime) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const dateObj = new Date(addLogDate);
      const datePart = dateObj.toISOString().split('T')[0];
      const newIso = new Date(`${datePart}T${addLogTime}:00`).toISOString();

      const res = await fetch(`/api/admin/employee/${employeeId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: addLogType, scanned_at: newIso })
      });

      if (!res.ok) throw new Error();
      setAddLogDate(null);
      fetchData();
    } catch {
      alert("Failed to insert log.");
    }
  };

  const downloadCSV = () => {
    const headers = ["Date", "Type", "Time", "Added By Admin", "Distance (m)"];
    const rows = groupedLogs.flatMap(g => 
      g.logs.map(l => [
        new Date(l.scanned_at).toLocaleDateString(),
        l.type,
        new Date(l.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        l.added_by_admin ? "Yes" : "No",
        l.added_by_admin ? "N/A" : l.distance_from_office_meters
      ])
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${employee?.full_name?.replace(' ', '_')}_attendance_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header title="Employee Records" />
      
      <main className="p-4 sm:p-6 flex-1 max-w-5xl mx-auto w-full flex flex-col gap-6 pb-16">
        
        {/* Navigation & Employee Profile Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between bg-card p-5 rounded-3xl border border-border shadow-xs">
          <div className="flex items-center gap-3.5">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground border border-border/50">
              <ArrowLeft size={18} />
            </Button>
            {isLoading && !employee ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ) : employee ? (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{employee.full_name}</h1>
                  {employee.is_active ? (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 uppercase font-black">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/20 uppercase font-black">Deactivated</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">Code: {employee.employee_code}</p>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-foreground">Employee Record Not Found</h1>
            )}
          </div>

          {employee ? (
            <div className="flex items-center gap-2.5 sm:self-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Status:</span>
              {employee.currentStatus === "entry" ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1.5 px-3 py-1 text-xs font-extrabold rounded-full">
                  <UserCheck size={14} /> <span>Checked In</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1.5 px-3 py-1 text-xs font-extrabold rounded-full">
                  <UserX size={14} /> <span>Checked Out</span>
                </Badge>
              )}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="bg-destructive/15 text-destructive border border-destructive/30 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> <span>{error}</span>
          </div>
        ) : null}

        {/* Date Filter & CSV Export */}
        <Card className="rounded-2xl p-3.5 border-border bg-card/90 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Calendar size={14} className="text-[#CE1126]" /> <span>Range:</span>
            </span>
            <Input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36 h-9 rounded-xl bg-muted/40 text-xs font-bold"
            />
            <span className="text-xs text-muted-foreground font-bold">to</span>
            <Input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36 h-9 rounded-xl bg-muted/40 text-xs font-bold"
            />
          </div>
          <Button 
            onClick={downloadCSV}
            variant="outline"
            size="sm"
            disabled={groupedLogs.length === 0}
            className="w-full sm:w-auto font-bold text-xs rounded-xl h-9 gap-1.5 border-border"
          >
            <Download size={14} /> <span>Export Attendance CSV</span>
          </Button>
        </Card>

        {/* Daily Logs Timeline */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-36 w-full rounded-3xl" />
              <Skeleton className="h-36 w-full rounded-3xl" />
            </div>
          ) : groupedLogs.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-border bg-card/90 text-muted-foreground">
              <Clock size={32} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-bold">No activity logs discovered in this date window.</p>
            </Card>
          ) : (
            groupedLogs.map(group => (
              <Card key={group.dateStr} className="rounded-3xl border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-foreground text-base">{group.dateStr}</h3>
                    {group.isIncomplete ? (
                      <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">Incomplete Cycle</Badge>
                    ) : (
                      <Badge className="bg-[#CE1126]/15 text-[#CE1126] border border-[#CE1126]/20 text-xs font-black px-2.5 py-0.5 rounded-full hover:bg-[#CE1126]/15">
                        {group.totalHours?.toFixed(2)} hrs total
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAddLogDate(group.dateObj.toISOString())}
                    className="text-xs font-bold text-[#CE1126] hover:bg-[#CE1126]/10 h-8 gap-1 px-2.5 rounded-xl"
                  >
                    <Plus size={14} strokeWidth={3} /> <span>Add Manual Log</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {group.logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between group/row p-2.5 -mx-2 rounded-2xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${log.type === 'entry' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                          <Clock size={16} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">{log.type} Log</span>
                            {log.added_by_admin ? (
                              <Badge variant="secondary" className="text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black uppercase px-1.5 py-0">Manual Admin</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                            {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            {!log.added_by_admin && log.distance_from_office_meters !== undefined ? (
                              <span className="text-[11px] text-muted-foreground/80 ml-2">({Math.round(log.distance_from_office_meters)}m from facility)</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Tools */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Button 
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditLogId(log.id);
                            const d = new Date(log.scanned_at);
                            setEditTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg" title="Edit Timestamp"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(log.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" title="Delete Log"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Edit Timestamp Dialog */}
      <Dialog open={!!editLogId} onOpenChange={(open) => { if (!open) setEditLogId(null); }}>
        <DialogContent className="sm:max-w-xs rounded-3xl p-6 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Modify Log Timestamp</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Adjust the specific hour and minute of this scan record</DialogDescription>
          </DialogHeader>
          <div className="my-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time (HH:MM)</Label>
            <Input 
              type="time" 
              value={editTimeStr}
              onChange={(e) => setEditTimeStr(e.target.value)}
              className="h-11 rounded-xl bg-muted/40 font-bold text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditLogId(null)} className="rounded-xl font-semibold text-xs">Cancel</Button>
            <Button onClick={handleEdit} className="bg-[#CE1126] hover:bg-[#b30f21] text-white rounded-xl font-bold text-xs px-5 shadow-md">Update Timestamp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Insert Log Dialog */}
      <Dialog open={!!addLogDate} onOpenChange={(open) => { if (!open) setAddLogDate(null); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Insert Manual Log</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Adding entry for date: <span className="font-bold text-foreground">{addLogDate ? new Date(addLogDate).toLocaleDateString() : ""}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Scan Type</Label>
              <select 
                value={addLogType} 
                onChange={(e) => setAddLogType(e.target.value as "entry"|"exit")}
                className="w-full h-11 px-3 bg-muted/40 border border-border rounded-xl font-bold text-sm text-foreground focus:ring-2 focus:ring-[#CE1126] outline-none"
              >
                <option value="entry">Entry Scan</option>
                <option value="exit">Exit Scan</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time (HH:MM)</Label>
              <Input 
                type="time" 
                value={addLogTime}
                onChange={(e) => setAddLogTime(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 font-bold text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setAddLogDate(null)} className="rounded-xl font-semibold text-xs">Cancel</Button>
            <Button onClick={handleAddLog} disabled={!addLogTime} className="bg-[#CE1126] hover:bg-[#b30f21] text-white rounded-xl font-bold text-xs px-6 shadow-md disabled:opacity-50">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
