"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Building, CheckCircle, Users, Search, ChevronRight, AlertTriangle, UsersRound } from "lucide-react";
import Header from "@/components/Header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

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
    
    fetch('/api/admin/tasks/check-overdue', { method: 'POST' }).catch(console.error);

    const interval = setInterval(() => {
      fetchStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const totalEmployees = employees.length;
  const currentlyInside = employees.filter(e => e.status === "entry").length;
  const markedToday = employees.filter(e => e.status !== null).length;

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (a.status === "entry" && b.status !== "entry") return -1;
    if (a.status !== "entry" && b.status === "entry") return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Admin Dashboard" />
      <main className="p-4 sm:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative pb-12">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#CE1126]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Overview Dashboard</h1>
        </div>
        
        {/* Summary Strip with Aceternity Spotlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <SpotlightCard className="p-6 rounded-3xl border-border bg-card/90 shadow-sm flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Currently Inside</p>
              <h3 className="text-4xl font-black text-[#CE1126]">
                {isLoading ? <Skeleton className="h-9 w-16" /> : currentlyInside}
              </h3>
            </div>
            <div className="w-14 h-14 bg-[#CE1126]/10 text-[#CE1126] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <Building size={28} />
            </div>
          </SpotlightCard>
          
          <SpotlightCard className="p-6 rounded-3xl border-border bg-card/90 shadow-sm flex items-center justify-between group" spotlightColor="rgba(34, 197, 94, 0.1)">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Marked Today</p>
              <h3 className="text-4xl font-black text-foreground">
                {isLoading ? <Skeleton className="h-9 w-16" /> : markedToday}
              </h3>
            </div>
            <div className="w-14 h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <CheckCircle size={28} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-6 rounded-3xl border-border bg-card/90 shadow-sm flex items-center justify-between group" spotlightColor="rgba(59, 130, 246, 0.1)">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Total Employees</p>
              <h3 className="text-4xl font-black text-foreground">
                {isLoading ? <Skeleton className="h-9 w-16" /> : totalEmployees}
              </h3>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <Users size={28} />
            </div>
          </SpotlightCard>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-bold text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* List Section */}
        <Card className="rounded-3xl border-border shadow-md overflow-hidden flex flex-col flex-1 bg-card/90">
          <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
            <div>
              <h2 className="text-lg font-bold text-foreground">Live Employee Status</h2>
              <p className="text-xs text-muted-foreground font-medium">Real-time attendance tracking across the campus</p>
            </div>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search size={16} />
              </span>
              <Input 
                type="text" 
                placeholder="Search name or ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 h-10 bg-card border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#CE1126] shadow-sm w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 p-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Current Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Last Scan</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className="border-border/40">
                      <TableCell className="pl-6 py-4"><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <UsersRound size={44} className="mb-3 opacity-40" />
                        <p className="text-base font-bold text-foreground">No employees found</p>
                        <p className="text-xs mt-1 font-medium">Check back later or adjust your search term.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow 
                      key={emp.id} 
                      className="group hover:bg-muted/50 transition-colors cursor-pointer border-border/50"
                      onClick={() => window.location.href = `/admin/employee/${emp.id}`}
                    >
                      <TableCell className="pl-6 py-3.5 font-bold text-foreground group-hover:text-[#CE1126] transition-colors">
                        {emp.full_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-muted-foreground">
                        {emp.employee_code}
                      </TableCell>
                      <TableCell>
                        {emp.status === "entry" ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 hover:bg-green-500/15 gap-1.5 px-2.5 py-0.5 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Inside
                          </Badge>
                        ) : emp.status === "exit" ? (
                          <Badge variant="secondary" className="font-bold px-2.5 py-0.5 rounded-full">
                            Outside
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground/70 font-semibold px-2.5 py-0.5 rounded-full">
                            Not marked today
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground">
                        {emp.last_scanned_at ? new Date(emp.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-[#CE1126] group-hover:translate-x-1 transition-all inline-block" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
