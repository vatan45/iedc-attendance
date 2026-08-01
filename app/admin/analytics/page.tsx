"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar as CalendarIcon, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  name: string;
  hours: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData[]>([]);
  
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
        <div className="bg-card p-3.5 rounded-2xl shadow-xl border border-border">
          <p className="font-bold text-foreground text-xs mb-1">{label}</p>
          <p className="text-[#CE1126] font-extrabold text-sm flex items-center gap-1.5">
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
      <main className="p-4 md:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 relative pb-16">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#CE1126]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-0.5">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Time Spent Dashboard</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Daily operational and attendance distribution analysis</p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <CalendarIcon size={15} />
            </div>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 h-10 bg-card border-border rounded-xl text-xs font-bold shadow-sm w-full sm:w-auto"
            />
          </div>
        </div>
        
        {/* Analytics Card */}
        <Card className="rounded-3xl border-border shadow-md overflow-hidden flex flex-col flex-1 p-6 sm:p-8 bg-card/90">
          <div className="mb-6 border-b border-border/60 pb-4 flex justify-between items-end">
            <div>
              <h2 className="text-lg font-bold text-foreground">Office Time Comparison</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{formattedDate}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-4">
              <Skeleton className="w-full h-80 rounded-2xl" />
              <div className="flex gap-4 justify-between w-full px-8">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-24 h-4" />
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
              <Alert variant="destructive" className="max-w-md rounded-2xl">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-bold text-xs ml-2">{error}</AlertDescription>
              </Alert>
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[380px] text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-3">
                <Clock size={32} className="text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">No data for this date</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">No recorded check-ins or completed durations yet.</p>
            </div>
          ) : (
            <div className="w-full h-[500px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 11, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 11, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val}h`}
                  />
                  <Tooltip cursor={{ fill: '#88888810' }} content={<CustomTooltip />} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={50}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#CE1126' : '#555555'} opacity={index === 0 ? 1 : 0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
