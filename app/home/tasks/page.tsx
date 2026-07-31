"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Calendar, ChevronDown, CheckCircle, Play, MoreVertical, Plus, X } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  assigned_to: string;
  assigned_by: string;
  assignee?: { id: string; full_name: string; employee_code?: string };
  assigner?: { id: string; full_name: string };
};

type Employee = {
  id: string;
  full_name: string;
};

export default function EmployeeTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Task["status"] | "raised">("todo");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // New Ticket State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const res = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleAuthError(router);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setCurrentEmployeeId(data.currentEmployeeId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out current employee from assigning to themselves
        setEmployees((data.employees || []).filter((e: Employee) => e.id !== currentEmployeeId));
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    if (employees.length === 0) fetchEmployees();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description || !newTicket.assigned_to) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTicket)
      });

      if (res.ok) {
        const data = await res.json();
        // Just refresh the list
        fetchTasks();
        setIsModalOpen(false);
        setNewTicket({ title: "", description: "", assigned_to: "", priority: "medium" });
        setActiveTab("raised");
      } else {
        alert("Failed to create ticket");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (taskId: string, newStatus: Task["status"]) => {
    setUpdatingId(taskId);
    setOpenDropdown(null);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs: { id: Task["status"] | "raised"; label: string }[] = [
    { id: "todo", label: "To Do" },
    { id: "in_progress", label: "In Progress" },
    { id: "done", label: "Done" },
    { id: "blocked", label: "Blocked" },
    { id: "raised", label: "Raised by Me" },
  ];

  const filteredTasks = tasks.filter(t => {
    if (activeTab === "raised") return t.assigned_by === currentEmployeeId;
    return t.status === activeTab && t.assigned_to === currentEmployeeId;
  });

  const isOverdueFn = (t: Task) => t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && t.status !== "done";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 dark:bg-black relative">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-12 pb-4 px-4 sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">My Tasks</h1>
            <p className="text-sm text-foreground/60 font-medium mt-1">Manage your assignments</p>
          </div>
          <button 
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors shadow-sm text-sm"
          >
            <Plus size={16} /> New Ticket
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 mt-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const count = tasks.filter(t => {
              if (tab.id === "raised") return t.assigned_by === currentEmployeeId;
              return t.status === tab.id && t.assigned_to === currentEmployeeId;
            }).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'border-accent text-accent' 
                    : 'border-transparent text-foreground/50 hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-accent/10 text-accent' : 'bg-gray-100 dark:bg-gray-800 text-foreground/50'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Nothing here</h3>
            <p className="text-sm text-foreground/60 font-medium">You're all caught up in this section!</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = isOverdueFn(task);
            const pColor = 
              task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
              task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';

            return (
              <div key={task.id} className="bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div 
                  className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-snug">{task.title}</h3>
                      {activeTab === "raised" ? (
                        <p className="text-xs font-medium text-foreground/50 mt-0.5">Assigned to: <span className="text-foreground/80">{task.assignee?.full_name || 'Unknown'}</span></p>
                      ) : task.assigned_by !== currentEmployeeId && task.assigner ? (
                         <p className="text-xs font-medium text-foreground/50 mt-0.5">From: <span className="text-foreground/80">{task.assigner.full_name}</span></p>
                      ) : null}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ${pColor}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground/60 mt-2 line-clamp-2 font-medium">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4">
                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${isOverdue ? 'text-red-500' : 'text-foreground/50'}`}>
                        <Calendar size={14} />
                        Due {new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isOverdue && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded ml-1 uppercase text-[9px]">Overdue</span>}
                      </div>
                    )}
                    {activeTab === "raised" && (
                       <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/50">
                         Status: <span className="uppercase text-[9px] tracking-widest bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{task.status.replace('_', ' ')}</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer - Only for tasks assigned TO me */}
                {activeTab !== "raised" && task.status !== 'done' && task.status !== 'blocked' && (
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 p-3 flex items-center justify-between">
                    
                    {/* Primary Action */}
                    {task.status === 'todo' ? (
                      <button 
                        onClick={() => updateStatus(task.id, 'in_progress')}
                        disabled={updatingId === task.id}
                        className="flex-1 mr-2 py-2.5 bg-accent text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                      >
                        {updatingId === task.id ? (
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <><Play size={16} fill="currentColor" /> Start Task</>
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateStatus(task.id, 'done')}
                        disabled={updatingId === task.id}
                        className="flex-1 mr-2 py-2.5 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {updatingId === task.id ? (
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <><CheckCircle size={18} /> Mark as Done</>
                        )}
                      </button>
                    )}

                    {/* Secondary Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setOpenDropdown(openDropdown === task.id ? null : task.id)}
                        className="p-2.5 bg-gray-200 dark:bg-gray-800 text-foreground/70 rounded-xl hover:text-foreground transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openDropdown === task.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1 animate-in slide-in-from-bottom-2">
                            {tabs.filter(t => t.id !== task.status && t.id !== "raised").map(t => (
                              <button
                                key={t.id}
                                onClick={() => updateStatus(task.id, t.id as Task["status"])}
                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-foreground/70 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground rounded-lg transition-colors"
                              >
                                Move to {t.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Minimal Footer for Blocked tasks */}
                {activeTab !== "raised" && task.status === 'blocked' && (
                  <div className="bg-red-50/50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/50 p-3 flex justify-end">
                    <button 
                      onClick={() => updateStatus(task.id, 'todo')}
                      className="px-4 py-2 bg-white dark:bg-gray-800 text-sm font-bold text-foreground rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      Unblock (Move to To Do)
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-black text-foreground">Raise a Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-foreground/60 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium"
                  placeholder="E.g., Review the design document"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={3}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium resize-none"
                  placeholder="Provide context and requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1.5">Assign To <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select 
                    required
                    value={newTicket.assigned_to}
                    onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium appearance-none"
                  >
                    <option value="" disabled>Select an employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1.5">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTicket({...newTicket, priority: p})}
                      className={`py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
                        newTicket.priority === p 
                          ? 'bg-accent text-white shadow-sm' 
                          : 'bg-gray-100 dark:bg-gray-800 text-foreground/70 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-accent text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
