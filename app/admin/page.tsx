"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Building, CheckCircle, Users, Search, ChevronRight, AlertTriangle, UsersRound } from "lucide-react";
import Header from "@/components/Header";

interface EmployeeStatus {
  id: string;
  employee_code: string;
  full_name: string;
  status: "entry" | "exit" | null;
  last_scanned_at: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const res = await fetch("/api/admin/employees-status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleAuthError(router);
        return;
      }
      if (!res.ok) throw new Error("Failed to load statuses");

      const data = await res.json();
      setEmployees(data.employees || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch live data. Retrying...");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Compute stats
  const totalEmployees = employees.length;
  const currentlyInside = employees.filter(e => e.status === "entry").length;
  const markedToday = employees.filter(e => e.status !== null).length;

  // Filter & Sort
  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    // Sort logic: "Currently Inside" (entry) first, then alphabetical by name
    if (a.status === "entry" && b.status !== "entry") return -1;
    if (a.status !== "entry" && b.status === "entry") return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Admin Portal" />
      <main className="p-4 md:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Overview Dashboard</h1>
        </div>
        
        {/* Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="glass p-6 rounded-3xl shadow-sm flex items-center justify-between group hover:border-accent/30 transition-colors">
            <div>
              <p className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-1">Currently Inside</p>
              <h3 className="text-4xl font-black text-accent">{isLoading ? "-" : currentlyInside}</h3>
            </div>
            <div className="w-14 h-14 bg-accent/10 text-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building size={28} />
            </div>
          </div>
          
          <div className="glass p-6 rounded-3xl shadow-sm flex items-center justify-between group hover:border-green-500/30 transition-colors">
            <div>
              <p className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-1">Marked Today</p>
              <h3 className="text-4xl font-black text-foreground">{isLoading ? "-" : markedToday}</h3>
            </div>
            <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle size={28} />
            </div>
          </div>

          <div className="glass p-6 rounded-3xl shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-colors">
            <div>
              <p className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-1">Total Employees</p>
              <h3 className="text-4xl font-black text-foreground">{isLoading ? "-" : totalEmployees}</h3>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* List Section */}
        <div className="glass rounded-[2rem] shadow-xl overflow-hidden flex flex-col flex-1 mt-4">
          <div className="p-5 md:p-6 border-b border-gray-200/50 dark:border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-black/40">
            <h2 className="text-lg font-bold text-foreground">Live Status</h2>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search name or ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="text-xs uppercase font-bold text-foreground/50 tracking-wider">
                  <th className="p-4 pl-6">Employee</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Current Status</th>
                  <th className="p-4 pr-6">Last Scan</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground/50 font-medium">Loading live data...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-foreground/50">
                        <UsersRound size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-bold text-foreground/70">No employees found</p>
                        <p className="text-sm mt-1 font-medium">Check back later or adjust your search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr 
                      key={emp.id} 
                      className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer rounded-xl"
                      onClick={() => window.location.href = `/admin/employee/${emp.id}`}
                    >
                      <td className="p-4 pl-6">
                        <div className="font-bold text-foreground group-hover:text-accent transition-colors">{emp.full_name}</div>
                      </td>
                      <td className="p-4 text-sm text-foreground/60 font-semibold">
                        {emp.employee_code}
                      </td>
                      <td className="p-4">
                        {emp.status === "entry" ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Inside
                          </span>
                        ) : emp.status === "exit" ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            Outside
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100/50 text-gray-400 dark:bg-gray-800/50">
                            Not marked today
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-foreground/60 font-medium">
                        {emp.last_scanned_at ? new Date(emp.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <ChevronRight size={18} className="text-foreground/30 group-hover:text-accent group-hover:translate-x-1 transition-all inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
