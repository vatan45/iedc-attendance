"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { UsersRound, Phone, Briefcase, MapPin, Clock, Search, AlertTriangle, User } from "lucide-react";

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

  useEffect(() => {
    fetchGuests();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGuests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchGuests = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const res = await fetch("/api/admin/guests", {
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
      setError(err.message || "Failed to fetch live data. Retrying...");
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
      <Header title="Guest Entries" />
      <main className="p-4 md:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Today's Visitors</h1>
        </div>
        
        {/* Summary Strip */}
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <div className="glass p-6 rounded-3xl shadow-sm flex items-center justify-between group border border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-1">Total Guests Today</p>
              <h3 className="text-4xl font-black text-accent">{isLoading ? "-" : guests.length}</h3>
            </div>
            <div className="w-14 h-14 bg-accent/10 text-accent rounded-full flex items-center justify-center">
              <UsersRound size={28} />
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
            <h2 className="text-lg font-bold text-foreground">Live Entries</h2>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search name, phone, purpose..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="text-xs uppercase font-bold text-foreground/50 tracking-wider">
                  <th className="p-4 pl-6">Guest Name</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Purpose of Visit</th>
                  <th className="p-4">Location Check</th>
                  <th className="p-4 pr-6">Entry Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground/50 font-medium">Loading live data...</td>
                  </tr>
                ) : filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-foreground/50">
                        <UsersRound size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-bold text-foreground/70">No guests found</p>
                        <p className="text-sm mt-1 font-medium">No one has checked in yet, or your search didn't match.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map(guest => (
                    <tr 
                      key={guest.id} 
                      className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-xl"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                            <User size={16} />
                          </div>
                          <div className="font-bold text-foreground">{guest.name}</div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground/60 font-semibold flex items-center gap-2">
                        <Phone size={14} className="opacity-50" />
                        {guest.contact_number}
                      </td>
                      <td className="p-4 text-sm text-foreground/70 font-medium max-w-[200px] truncate">
                        <span className="flex items-center gap-2">
                          <Briefcase size={14} className="opacity-50 shrink-0" />
                          <span className="truncate">{guest.purpose}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <MapPin size={12} />
                          {guest.distance_from_office_meters != null ? `${guest.distance_from_office_meters}m away` : 'Unknown'}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-sm text-foreground/60 font-medium">
                        <span className="flex items-center gap-2">
                          <Clock size={14} className="opacity-50" />
                          {new Date(guest.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
