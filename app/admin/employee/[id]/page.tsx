"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";

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

import { use } from "react";

export default function AdminEmployeeDetail(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const params = use(props.params);
  const employeeId = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [groupedLogs, setGroupedLogs] = useState<DailyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range defaults to current month
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
      if (!res.ok) throw new Error("Failed to load employee data");

      const data = await res.json();
      setEmployee(data.employee);
      processLogs(data.logs || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
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
      
      // Need to construct full ISO string from the selected date and time
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
      alert("Failed to update log.");
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/employee/${employeeId}/logs/${logId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      fetchData();
    } catch {
      alert("Failed to delete log.");
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
      alert("Failed to add log.");
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
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${employee?.full_name?.replace(' ', '_')}_attendance_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 pb-6 pt-2 flex-1 max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-foreground/50 hover:text-foreground bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          {isLoading && !employee ? (
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          ) : employee ? (
            <div className="flex-1 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  {employee.full_name}
                  {employee.is_active ? (
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">ACTIVE</span>
                  ) : (
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">DEACTIVATED</span>
                  )}
                </h1>
                <p className="text-sm text-foreground/60">{employee.employee_code}</p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-foreground/50 uppercase font-semibold mb-1">Live Status</p>
                {employee.currentStatus === "entry" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                    Inside
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-500">
                    Outside
                  </span>
                )}
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-foreground">Employee Not Found</h1>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}

        {/* Date Filter & Export */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
            <span className="text-foreground/50">to</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
          </div>
          <button 
            onClick={downloadCSV}
            disabled={groupedLogs.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 dark:bg-gray-800 text-foreground font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm flex items-center gap-2 justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>

        {/* Logs */}
        <div className="flex flex-col gap-6">
          {isLoading ? (
             <div className="h-32 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse"></div>
          ) : groupedLogs.length === 0 ? (
             <div className="bg-white dark:bg-gray-900 p-10 text-center rounded-2xl border border-gray-100 dark:border-gray-800">
               <p className="text-foreground/50">No logs found for this date range.</p>
             </div>
          ) : (
            groupedLogs.map(group => (
              <div key={group.dateStr} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="font-semibold text-foreground text-lg">{group.dateStr}</h3>
                  <div className="flex items-center gap-4">
                    {group.isIncomplete ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">INCOMPLETE</span>
                    ) : (
                      <span className="text-accent font-bold">{group.totalHours?.toFixed(2)} hrs</span>
                    )}
                    <button 
                      onClick={() => setAddLogDate(group.dateObj.toISOString())}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      + Add Log
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {group.logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between group/row p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.type === 'entry' ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {log.type === 'entry' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold uppercase tracking-wider">{log.type}</p>
                            {log.added_by_admin && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">MANUAL</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/70">
                            {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditLogId(log.id);
                            const d = new Date(log.scanned_at);
                            setEditTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                          }}
                          className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-md transition-colors" title="Edit Time"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Log"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editLogId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Edit Log Time</h3>
            <input 
              type="time" 
              value={editTimeStr}
              onChange={(e) => setEditTimeStr(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditLogId(null)} className="px-4 py-2 font-medium text-foreground/60">Cancel</button>
              <button onClick={handleEdit} className="px-4 py-2 bg-accent text-white font-medium rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Log Modal */}
      {addLogDate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Manually Add Log</h3>
            <p className="text-sm text-foreground/60 mb-4">Date: {new Date(addLogDate).toLocaleDateString()}</p>
            
            <label className="block text-sm font-medium mb-1">Type</label>
            <select 
              value={addLogType} 
              onChange={(e) => setAddLogType(e.target.value as "entry"|"exit")}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4"
            >
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
            </select>

            <label className="block text-sm font-medium mb-1">Time</label>
            <input 
              type="time" 
              value={addLogTime}
              onChange={(e) => setAddLogTime(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAddLogDate(null)} className="px-4 py-2 font-medium text-foreground/60">Cancel</button>
              <button onClick={handleAddLog} disabled={!addLogTime} className="px-4 py-2 bg-accent text-white font-medium rounded-lg disabled:opacity-50">Add Log</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
