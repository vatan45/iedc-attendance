"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import { Calendar, CheckCircle, Play, MoreVertical, Plus, AlertCircle, Clock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex flex-col min-h-screen bg-transparent relative">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-md border-b border-border pt-8 pb-4 px-4 sm:px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">My Tasks</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Manage and track your assigned tickets</p>
          </div>
          
          <Button 
            onClick={handleOpenModal}
            className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl h-10 px-4 gap-1.5 shadow-md shadow-[#CE1126]/20 text-xs"
          >
            <Plus size={16} />
            <span>New Ticket</span>
          </Button>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl border-border p-6 bg-card">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Raise a Ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTicket} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title <span className="text-destructive">*</span></Label>
                  <Input 
                    type="text"
                    required
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    className="h-11 rounded-xl bg-muted/40 font-medium"
                    placeholder="E.g., Review the design document"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assign To <span className="text-destructive">*</span></Label>
                  <select 
                    required
                    value={newTicket.assigned_to}
                    onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                    className="h-11 px-3 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-[#CE1126] outline-none font-medium text-sm text-foreground"
                  >
                    <option value="" disabled>Select an employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</Label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="h-11 px-3 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-[#CE1126] outline-none font-medium text-sm text-foreground capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description <span className="text-destructive">*</span></Label>
                  <textarea 
                    required
                    rows={3}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    className="w-full p-3 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-[#CE1126] outline-none font-medium resize-none text-sm text-foreground"
                    placeholder="Provide context and requirements..."
                  />
                </div>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl px-6 shadow-md shadow-[#CE1126]/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    <span>Submit Ticket</span>
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs / Quick Overview */}
      <div className="p-4 sm:p-6 pb-20 sm:pb-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex bg-muted/50 p-1.5 rounded-2xl overflow-x-auto border border-border/50 gap-1 scrollbar-hide">
          {tabs.map((tab) => {
            const count = tasks.filter(t => {
              if (tab.id === "raised") return t.assigned_by === currentEmployeeId;
              return t.status === tab.id && t.assigned_to === currentEmployeeId;
            }).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
                  isActive
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span>{tab.label}</span>
                <Badge variant={isActive ? "default" : "secondary"} className={`text-[10px] px-2 py-0 h-5 font-black rounded-full ${isActive ? "bg-[#CE1126] text-white" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-3.5">
          {isLoading ? (
            <div className="space-y-3.5">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-border text-muted-foreground bg-card/50">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground/60">
                <CheckCircle size={24} />
              </div>
              <p className="font-bold text-sm text-foreground">No tickets in this section.</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">You are currently all caught up with your assignments.</p>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const isOverdue = isOverdueFn(task);
              const priorityStyles = 
                task.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/20' :
                task.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                'bg-muted text-muted-foreground border-border';

              const statusStyles = 
                task.status === 'todo' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' :
                task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                task.status === 'done' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
              
              return (
                <Card
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="rounded-3xl border-border bg-card hover:border-[#CE1126]/40 transition-all cursor-pointer shadow-sm overflow-hidden group"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${priorityStyles}`}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${statusStyles}`}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {activeTab === "raised" ? (
                          <span className="text-xs font-bold text-muted-foreground/80">
                            Assigned to: <span className="text-foreground font-extrabold">{task.assignee?.full_name || "Unassigned"}</span>
                          </span>
                        ) : task.assigned_by !== currentEmployeeId && task.assigner ? (
                          <span className="text-xs font-bold text-muted-foreground/80">
                            From: <span className="text-foreground font-extrabold">{task.assigner.full_name}</span>
                          </span>
                        ) : null}
                      </div>

                      {task.due_date ? (
                        <span className={`text-[11px] font-bold flex items-center gap-1 shrink-0 ${isOverdue ? "text-destructive" : "text-muted-foreground/70"}`}>
                          <Calendar size={13} /> <span>Due {new Date(task.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                          {isOverdue ? <Badge variant="destructive" className="ml-1 text-[8px] px-1 py-0 uppercase">Overdue</Badge> : null}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-extrabold text-base sm:text-lg text-foreground mb-1.5 group-hover:text-[#CE1126] transition-colors line-clamp-1">{task.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 font-medium leading-relaxed">{task.description}</p>
                  </div>

                  {/* Actions Footer */}
                  {activeTab !== "raised" && task.status !== 'done' && task.status !== 'blocked' ? (
                    <div className="bg-muted/30 border-t border-border/60 px-5 py-3 flex items-center justify-between gap-2">
                      {task.status === 'todo' ? (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'in_progress'); }}
                          disabled={updatingId === task.id}
                          className="flex-1 bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl h-10 text-xs gap-1.5 shadow-sm shadow-[#CE1126]/20"
                        >
                          {updatingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={14} fill="currentColor" />}
                          <span>Start Task Work</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'done'); }}
                          disabled={updatingId === task.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-10 text-xs gap-1.5 shadow-sm"
                        >
                          {updatingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={15} />}
                          <span>Mark as Done</span>
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="h-10 w-10 rounded-xl inline-flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl border-border p-1.5">
                          {tabs.filter(t => t.id !== task.status && t.id !== "raised").map(t => (
                            <DropdownMenuItem
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); updateStatus(task.id, t.id as Task["status"]); }}
                              className="font-bold text-xs py-2 rounded-xl cursor-pointer"
                            >
                              Move to {t.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}

                  {activeTab !== "raised" && task.status === 'blocked' ? (
                    <div className="bg-destructive/10 border-t border-destructive/20 px-5 py-3 flex justify-end">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'todo'); }}
                        className="rounded-xl font-bold text-xs bg-card hover:bg-muted border-border"
                      >
                        Unblock Ticket (Return to To Do)
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
