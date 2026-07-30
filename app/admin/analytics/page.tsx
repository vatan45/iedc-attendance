"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar as CalendarIcon, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface AnalyticsData {
  name: string;
  hours: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData[]>([]);
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDate]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) {
        handleAuthError(router);
        return;
      }

      const res = await fetch(`/api/admin/analytics/daily?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        handleAuthError(router);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const resData = await res.json();
      setData(resData.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatHoursToReadable = (decimalHours: number) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
          <p className="font-bold text-foreground mb-1">{label}</p>
          <p className="text-accent font-semibold flex items-center gap-1.5">
            <Clock size={14} />
            {formatHoursToReadable(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Analytics" />
      <main className="p-4 md:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Time Spent Dashboard</h1>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground/40">
              <CalendarIcon size={16} />
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-sm w-full sm:w-auto"
            />
          </div>
        </div>
        
        {/* Analytics Card */}
        <div className="glass rounded-[2rem] shadow-xl overflow-hidden flex flex-col flex-1 p-6 relative">
          <div className="mb-6 border-b border-gray-200/50 dark:border-gray-800/50 pb-4">
            <h2 className="text-lg font-bold text-foreground mb-1">Office Time Comparison</h2>
            <p className="text-sm text-foreground/60 font-medium">{formattedDate}</p>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 size={32} className="animate-spin text-accent mb-4" />
              <p className="text-foreground/50 font-medium">Crunching the numbers...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={18} />
                {error}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Clock size={32} className="text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-lg font-bold text-foreground">No data for this date</p>
              <p className="text-sm text-foreground/50 mt-1 font-medium">Employees haven't marked attendance yet.</p>
            </div>
          ) : (
            <div className="w-full h-[500px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888830" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val}h`}
                  />
                  <Tooltip cursor={{ fill: '#88888810' }} content={<CustomTooltip />} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--color-accent)' : 'var(--color-foreground)'} opacity={index === 0 ? 1 : 0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
