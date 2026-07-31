"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle, AlertTriangle, Clock, ListTodo, Download, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header"; // Wait, it's admin so the header is in layout, but maybe mobile header

export default function TaskAnalyticsPage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'completion_rate', direction: 'asc' });

  useEffect(() => {
    fetchData();
  }, [month]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return router.push("/login");

      const res = await fetch(`/api/admin/tasks/analytics?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem("attendance_session_token");
    if (!token) return;

    fetch(`/api/admin/tasks/analytics/export?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task_analytics_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBreakdown = useMemo(() => {
    if (!data?.employeeBreakdown) return [];
    const arr = [...data.employeeBreakdown];
    arr.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sortConfig]);

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 relative gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Task Analytics</h1>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-semibold focus:ring-2 focus:ring-accent outline-none shadow-sm cursor-pointer"
          />
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            <Download size={16} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-foreground/50">
                <span className="text-xs font-bold uppercase tracking-wider">Total Tasks</span>
                <ListTodo size={18} />
              </div>
              <h3 className="text-3xl font-black">{data.totalTasks}</h3>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-green-500/70">
                <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                <CheckCircle size={18} />
              </div>
              <h3 className="text-3xl font-black text-green-500">{data.completedTasks}</h3>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between text-red-500/70 relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider">Currently Overdue</span>
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-3xl font-black text-red-500 relative z-10">{data.overdueTasks}</h3>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-blue-500/70">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Completion</span>
                <Clock size={18} />
              </div>
              <h3 className="text-3xl font-black text-blue-500">
                {data.avgCompletionHours > 24 
                  ? `${(data.avgCompletionHours / 24).toFixed(1)} d` 
                  : `${data.avgCompletionHours} hr`}
              </h3>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-[350px]">
              <h3 className="font-bold mb-6">Tasks Completed by Employee</h3>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12, fontWeight: 600 }} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'currentColor', opacity: 0.05 }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                      {sortedBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} className="fill-accent dark:fill-accent" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-1 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase font-black tracking-wider text-foreground/40 bg-gray-50 dark:bg-gray-800/30">
                      <th className="p-4 rounded-tl-2xl">Employee</th>
                      <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('assigned')}>
                        Assigned <ArrowUpDown size={10} className="inline ml-0.5" />
                      </th>
                      <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('completed')}>
                        Done <ArrowUpDown size={10} className="inline ml-0.5" />
                      </th>
                      <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('completion_rate')}>
                        Rate <ArrowUpDown size={10} className="inline ml-0.5" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                    {sortedBreakdown.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-sm font-semibold text-foreground/80">
                        <td className="p-4">{emp.name}</td>
                        <td className="p-4">{emp.assigned}</td>
                        <td className="p-4 text-green-600 dark:text-green-500">{emp.completed}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                            emp.completion_rate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            emp.completion_rate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {emp.completion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
