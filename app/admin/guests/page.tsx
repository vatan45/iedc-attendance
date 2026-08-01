"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { UsersRound, Phone, Briefcase, MapPin, Clock, Search, AlertTriangle, User, History, Calendar, FileText } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface GuestEntry {
  id: string;
  name: string;
  contact_number: string;
  purpose: string;
  distance_from_office_meters: number | null;
  scanned_at: string;
}

export default function GuestEntriesPage() {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "history" | "all">("today");

  useEffect(() => {
    setIsLoading(true);
    fetchGuests(activeTab);
    const interval = setInterval(() => fetchGuests(activeTab, false), 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchGuests = async (type: string, showLoading = true) => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      if (showLoading) setIsLoading(true);
      const res = await fetch(`/api/admin/guests?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        handleAuthError(router);
        return;
      }
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load guest entries");
      }

      setGuests(data.guests || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch visitor data. Retrying...");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.contact_number.includes(search) ||
    g.purpose.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Guest Entries & Visitor Logs" />
      <main className="p-4 sm:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative pb-16">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#CE1126]/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header Title and Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Reception Visitors</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Real-time registers and historical visitor archives</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
                activeTab === "today"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar size={14} className={activeTab === "today" ? "text-[#CE1126]" : ""} />
              <span>Today's Visitors</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
                activeTab === "history"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History size={14} className={activeTab === "history" ? "text-[#CE1126]" : ""} />
              <span>Old Visitors</span>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
                activeTab === "all"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={14} className={activeTab === "all" ? "text-[#CE1126]" : ""} />
              <span>All Records</span>
            </button>
          </div>
        </div>
        
        {/* Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SpotlightCard className="p-6 rounded-3xl border-border bg-card/90 shadow-sm flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {activeTab === "today" && "Total Guests Today"}
                {activeTab === "history" && "Past Visitor Archive"}
                {activeTab === "all" && "Total Registered Visitors"}
              </p>
              <h3 className="text-4xl font-black text-[#CE1126]">
                {isLoading ? <Skeleton className="h-9 w-16" /> : guests.length}
              </h3>
            </div>
            <div className="w-14 h-14 bg-[#CE1126]/10 text-[#CE1126] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              {activeTab === "history" ? <History size={28} /> : <UsersRound size={28} />}
            </div>
          </SpotlightCard>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* List Section */}
        <Card className="rounded-3xl border-border shadow-md overflow-hidden flex flex-col flex-1 bg-card/90">
          <div className="p-4 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {activeTab === "today" && "Live Today's Entries"}
                {activeTab === "history" && "Past Visitor History (Archive)"}
                {activeTab === "all" && "Complete Visitor Directory"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                {activeTab === "today" ? "Updated automatically every 30 seconds" : "Displaying historical check-in records"}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search size={16} />
              </span>
              <Input 
                type="text" 
                placeholder="Search name, phone, purpose..." 
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
                  <TableHead className="pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Guest Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Contact</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Purpose of Visit</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Location Check</TableHead>
                  <TableHead className="pr-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Entry Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx} className="border-border/40">
                      <TableCell className="pl-6 py-4"><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell className="pr-6"><Skeleton className="h-5 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <UsersRound size={44} className="mb-3 opacity-40" />
                        <p className="text-base font-bold text-foreground">No guests discovered</p>
                        <p className="text-xs mt-1 font-medium">No records match this view or your active filter query.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map(guest => {
                    const dateObj = new Date(guest.scanned_at);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <TableRow key={guest.id} className="group hover:bg-muted/50 transition-colors border-border/50">
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#CE1126]/10 text-[#CE1126] flex items-center justify-center shrink-0 shadow-xs">
                              <User size={15} />
                            </div>
                            <span className="font-bold text-foreground">{guest.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 font-mono font-bold">
                          <span className="flex items-center gap-1.5">
                            <Phone size={13} className="text-muted-foreground" />
                            {guest.contact_number}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground max-w-[220px] truncate">
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} className="text-muted-foreground shrink-0" />
                            <span className="truncate text-foreground/90">{guest.purpose}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold px-2.5 py-0.5 rounded-full gap-1.5 text-[11px]">
                            <MapPin size={11} className="text-muted-foreground" />
                            <span>{guest.distance_from_office_meters != null ? `${guest.distance_from_office_meters}m away` : 'Unknown'}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-xs text-muted-foreground font-bold">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#CE1126]/70" />
                            <span>{timeStr}</span>
                            {!isToday || activeTab !== "today" ? (
                              <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] bg-muted font-black border-border">
                                {dateStr}
                              </Badge>
                            ) : null}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
