"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { handleAuthError } from "@/lib/clientAuth";
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay, 
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { 
  CheckCircle, 
  LayoutGrid, 
  List, 
  Search, 
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  ShieldAlert,
  CheckSquare,
  Loader2
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  assignee?: { id: string; full_name: string; employee_code: string };
};

function KanbanCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && task.status !== "done";

  const pStyles = 
    task.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/20' : 
    task.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' : 
    'bg-muted text-muted-foreground border-border';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => {
        if (!isDragging) onClick();
      }}
      className={`relative group bg-card p-4 rounded-2xl shadow-sm border transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md ${
        isDragging ? 'border-[#CE1126] ring-2 ring-[#CE1126]/20 scale-[1.02]' : 'border-border hover:border-[#CE1126]/40 hover:-translate-y-0.5'
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-relaxed">{task.title}</h4>
      </div>
      
      <div className="flex justify-between items-end mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#CE1126]/10 text-[#CE1126] flex items-center justify-center text-[9px] font-black uppercase ring-1 ring-[#CE1126]/20 shrink-0">
            {task.assignee?.full_name?.substring(0, 2) || "??"}
          </div>
          <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[90px]">
            {task.assignee?.full_name || "Unassigned"}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className={`text-[9px] font-black uppercase px-1.5 py-0 rounded-md border ${pStyles}`}>
            {task.priority}
          </Badge>
          {task.due_date && (
            <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Calendar size={11} />
              <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              {isOverdue && <span className="bg-destructive/15 text-destructive px-1 py-0 rounded text-[8px] uppercase font-black ml-0.5">Overdue</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, title, tasks, onTaskClick, icon, onSeeAll }: { status: string; title: string; tasks: Task[]; onTaskClick: (id: string) => void; icon: React.ReactNode; onSeeAll?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const displayedTasks = tasks.slice(0, 5);
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col rounded-3xl border transition-all duration-300 min-h-[450px] ${
        isOver ? 'bg-[#CE1126]/5 border-[#CE1126]/40 ring-2 ring-[#CE1126]/10' : 'bg-muted/30 border-border/60'
      }`}
    >
      <div className="sticky top-0 z-10 p-4 flex items-center justify-between border-b border-border/60 bg-card/90 backdrop-blur-md rounded-t-3xl">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-extrabold text-foreground uppercase text-xs tracking-wider">{title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs font-black px-2.5 py-0.5 rounded-full bg-muted text-foreground">
          {tasks.length}
        </Badge>
      </div>
      
      <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
        {displayedTasks.map(t => <KanbanCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />)}
        {tasks.length === 0 && (
          <div className="flex-1 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center p-8 text-muted-foreground/60">
            <span className="text-xs font-bold uppercase tracking-wider">No Tasks</span>
          </div>
        )}
        {tasks.length > 5 && onSeeAll && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onSeeAll}
              className="w-full py-2.5 px-4 bg-card hover:bg-[#CE1126]/10 text-foreground hover:text-[#CE1126] border border-border/80 hover:border-[#CE1126]/40 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>See All ({tasks.length}) Tasks</span>
              <span>➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"recent" | "history" | "all">("recent");
  const [fullViewStatus, setFullViewStatus] = useState<string | null>(null);

  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDesc, setSortDesc] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const [tasksRes, empRes] = await Promise.all([
        fetch("/api/admin/tasks", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/employees", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (tasksRes.status === 401 || empRes.status === 401) {
        handleAuthError(router);
        return;
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees?.filter((e: any) => e.is_active) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task["status"];
    
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      showToastMsg(`Moved to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!title.trim()) newErrors.title = "Required";
    if (!description.trim()) newErrors.description = "Required";
    if (!assignedTo || assignedTo.length === 0) newErrors.assignedTo = "Select at least one assignee";
    
    if (dueDate) {
      const selected = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        newErrors.dueDate = "Cannot be past date";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assigned_to: assignedTo,
          priority,
          due_date: dueDate || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      const count = assignedTo.length;
      showToastMsg(count > 1 ? `Task assigned to ${count} team members` : `Task assigned successfully`);
      
      setShowAdd(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo([]);
    setPriority("medium");
    setDueDate(new Date().toISOString().split("T")[0]);
    setErrors({});
  };

  const isOverdueFn = (t: Task) => t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && t.status !== "done";

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterAssignee !== "all" && t.assignee?.id !== filterAssignee) return false;
    if (filterOverdue && !isOverdueFn(t)) return false;

    if (timeFilter === "recent") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      if (new Date(t.created_at) < threeDaysAgo) return false;
    } else if (timeFilter === "history") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      if (new Date(t.created_at) >= threeDaysAgo) return false;
    }

    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aVal: any = a[sortCol as keyof Task];
    let bVal: any = b[sortCol as keyof Task];
    if (sortCol === 'assignee') {
      aVal = a.assignee?.full_name || '';
      bVal = b.assignee?.full_name || '';
    }
    if (aVal < bVal) return sortDesc ? 1 : -1;
    if (aVal > bVal) return sortDesc ? -1 : 1;
    return 0;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    overdue: tasks.filter(t => isOverdueFn(t)).length,
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header title="Team Tasks" />
      
      <main className="p-4 sm:p-6 flex-1 w-full max-w-7xl mx-auto flex flex-col gap-6 relative pb-16">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#CE1126]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Team Tasks & Workflows</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Assign tickets, monitor bottlenecks, and track organizational progress</p>
          </div>
          <Button 
            onClick={() => setShowAdd(true)}
            className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl h-11 px-5 gap-2 shadow-md shadow-[#CE1126]/20 text-xs"
          >
            <Plus size={16} strokeWidth={2.5} /> 
            <span>Create Task</span>
          </Button>
        </div>

        {/* Stats Strip with Spotlight Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
          <Card className="p-4 rounded-2xl border-border bg-card/90 flex flex-col shadow-xs">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Total Tasks</span>
            <span className="text-2xl font-black text-foreground">{isLoading ? "-" : stats.total}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-border bg-card/90 flex flex-col shadow-xs">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">To Do</span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{isLoading ? "-" : stats.todo}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-border bg-card/90 flex flex-col shadow-xs">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">In Progress</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{isLoading ? "-" : stats.inProgress}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-border bg-card/90 flex flex-col shadow-xs">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1.5">Completed</span>
            <span className="text-2xl font-black text-green-600 dark:text-green-400">{isLoading ? "-" : stats.done}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-border bg-card/90 flex flex-col shadow-xs">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5">Blocked</span>
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{isLoading ? "-" : stats.blocked}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-destructive/20 bg-destructive/5 flex flex-col shadow-xs relative overflow-hidden">
            <span className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <AlertCircle size={11} /> Overdue
            </span>
            <span className="text-2xl font-black text-destructive">{isLoading ? "-" : stats.overdue}</span>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="bg-card/90 p-3 rounded-2xl flex flex-wrap items-center gap-3 shadow-sm border border-border relative z-10">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={15} />
            </span>
            <Input 
              type="text" 
              placeholder="Search assignments..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-10 bg-muted/40 border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#CE1126]"
            />
          </div>
          
          <select 
            value={filterAssignee} 
            onChange={e => setFilterAssignee(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#CE1126] outline-none text-foreground"
          >
            <option value="all">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>

          <select 
            value={filterPriority} 
            onChange={e => setFilterPriority(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#CE1126] outline-none text-foreground"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <label className="flex items-center gap-2 px-3 h-10 bg-muted/40 border border-border rounded-xl cursor-pointer hover:bg-muted text-xs font-bold text-foreground">
            <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} className="rounded text-[#CE1126] focus:ring-[#CE1126] w-4 h-4 border-border" />
            <span>Overdue Only</span>
          </label>

          <div className="flex bg-muted/60 p-1 rounded-xl shrink-0 border border-border/40">
            <button 
              type="button"
              onClick={() => setTimeFilter("recent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "recent" ? "bg-[#CE1126] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              🔥 Last 3 Days
            </button>
            <button 
              type="button"
              onClick={() => setTimeFilter("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "history" ? "bg-[#CE1126] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              🕰️ History (&gt;3 Days)
            </button>
            <button 
              type="button"
              onClick={() => setTimeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "all" ? "bg-[#CE1126] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              🌐 All Tasks
            </button>
          </div>

          <div className="w-px h-7 bg-border mx-1 hidden lg:block" />

          <div className="flex bg-muted/60 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === "board" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === "list" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List size={14} /> List
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[500px]">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[450px] w-full rounded-3xl" />
            ))}
          </div>
        ) : fullViewStatus !== null ? (
          /* Full Page View of All Tasks in Selected Status */
          <div className="flex flex-col gap-6 relative z-10 animate-fade-in pb-12">
            <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFullViewStatus(null)}
                  className="h-10 px-4 bg-[#CE1126]/10 text-[#CE1126] hover:bg-[#CE1126] hover:text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
                >
                  <span>← Back to Board</span>
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                    <span>{fullViewStatus.replace('_', ' ')} Directory</span>
                    <Badge className="bg-[#CE1126] text-white font-black px-3 py-0.5 rounded-full text-xs">
                      {filteredTasks.filter(t => t.status === fullViewStatus).length} Total Tasks
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Showing complete unpaginated directory of all tasks assigned to this column.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTasks.filter(t => t.status === fullViewStatus).map(task => (
                <div key={task.id} className="cursor-pointer">
                  <KanbanCard task={task} onClick={() => router.push(`/tasks/${task.id}`)} />
                </div>
              ))}
            </div>
            {filteredTasks.filter(t => t.status === fullViewStatus).length === 0 && (
              <div className="border-2 border-dashed border-border/60 rounded-3xl p-12 text-center text-muted-foreground font-bold text-sm">
                No tasks currently present in this column.
              </div>
            )}
          </div>
        ) : viewMode === "board" ? (
          /* Kanban Board */
          <div className="flex-1 pb-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 min-h-[550px] items-start">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <KanbanColumn icon={<CheckSquare size={16} className="text-slate-500"/>} status="todo" title="To Do" tasks={filteredTasks.filter(t => t.status === "todo")} onTaskClick={(id) => router.push(`/tasks/${id}`)} onSeeAll={() => setFullViewStatus("todo")} />
                <KanbanColumn icon={<Clock size={16} className="text-blue-500"/>} status="in_progress" title="In Progress" tasks={filteredTasks.filter(t => t.status === "in_progress")} onTaskClick={(id) => router.push(`/tasks/${id}`)} onSeeAll={() => setFullViewStatus("in_progress")} />
                <KanbanColumn icon={<CheckCircle size={16} className="text-green-500"/>} status="done" title="Done" tasks={filteredTasks.filter(t => t.status === "done")} onTaskClick={(id) => router.push(`/tasks/${id}`)} onSeeAll={() => setFullViewStatus("done")} />
                <KanbanColumn icon={<ShieldAlert size={16} className="text-orange-500"/>} status="blocked" title="Blocked" tasks={filteredTasks.filter(t => t.status === "blocked")} onTaskClick={(id) => router.push(`/tasks/${id}`)} onSeeAll={() => setFullViewStatus("blocked")} />

                <DragOverlay dropAnimation={null}>
                  {activeDragTask ? <KanbanCard task={activeDragTask} onClick={() => {}} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        ) : (
          /* List View */
          <Card className="rounded-3xl border-border shadow-md overflow-hidden flex-1 bg-card/90 relative z-10">
            <div className="overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent text-xs uppercase font-bold text-muted-foreground">
                    {['Title', 'Assignee', 'Priority', 'Status', 'Due Date', 'Created'].map((col, idx) => {
                      const keyMap: any = { 'Title': 'title', 'Assignee': 'assignee', 'Priority': 'priority', 'Status': 'status', 'Due Date': 'due_date', 'Created': 'created_at' };
                      const colKey = keyMap[col];
                      return (
                        <TableHead 
                          key={col} 
                          onClick={() => { if(sortCol === colKey) setSortDesc(!sortDesc); else { setSortCol(colKey); setSortDesc(true); } }}
                          className={`cursor-pointer hover:text-foreground transition-colors py-3 font-bold ${idx === 0 ? 'pl-6' : ''}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            {sortCol === colKey && (
                              <span className="text-[#CE1126]">{sortDesc ? '↓' : '↑'}</span>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-16 text-center text-muted-foreground font-medium text-sm">No tasks match your filter criteria.</TableCell></TableRow>
                  ) : (
                    sortedTasks.map(task => {
                      const isOverdue = isOverdueFn(task);
                      return (
                        <TableRow 
                          key={task.id} 
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className="group hover:bg-muted/50 transition-colors cursor-pointer border-border/50"
                        >
                          <TableCell className="pl-6 py-3.5 font-bold text-sm text-foreground max-w-[280px] truncate group-hover:text-[#CE1126] transition-colors">{task.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-[#CE1126]/10 text-[#CE1126] flex items-center justify-center text-[9px] font-black uppercase ring-1 ring-[#CE1126]/20 shrink-0">
                                {task.assignee?.full_name?.substring(0, 2) || "??"}
                              </div>
                              <span className="text-xs font-bold text-foreground">{task.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              task.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/20' : 
                              task.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' : 
                              'bg-muted text-muted-foreground border-border'
                            }`}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                              task.status === 'todo' ? 'text-slate-500' :
                              task.status === 'in_progress' ? 'text-blue-500' :
                              task.status === 'done' ? 'text-green-600 dark:text-green-400' : 'text-orange-500'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{task.status.replace('_', ' ')}</span>
                            </span>
                          </TableCell>
                          <TableCell className={`text-xs font-bold ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <div className="flex items-center gap-1.5">
                              <span>{task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '--'}</span>
                              {isOverdue && <span className="bg-destructive/15 text-destructive px-1 py-0 rounded uppercase text-[8px] font-black">Overdue</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-zinc-800 z-50 flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <CheckCircle size={18} className="text-green-400 shrink-0" />
          <span className="font-bold text-xs">{toast}</span>
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if(!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-border p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Create Task Assignment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Assign a new task ticket with deadline and priority to an employee</DialogDescription>
          </DialogHeader>
            
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title <span className="text-destructive">*</span></Label>
              <Input 
                type="text" 
                value={title} 
                onChange={e => { setTitle(e.target.value); if(errors.title) setErrors({...errors, title: null}); }} 
                className="h-11 rounded-xl bg-muted/40 font-medium text-sm"
                placeholder="E.g., Complete hardware inventory check"
              />
              {errors.title && <p className="text-destructive text-xs font-bold">{errors.title}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description <span className="text-destructive">*</span></Label>
              <textarea 
                value={description} 
                onChange={e => { setDescription(e.target.value); if(errors.description) setErrors({...errors, description: null}); }} 
                className="w-full p-3 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-[#CE1126] outline-none min-h-[100px] font-medium text-sm text-foreground resize-none"
                placeholder="Provide comprehensive details and acceptance criteria..."
              />
              {errors.description && <p className="text-destructive text-xs font-bold">{errors.description}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Assign To ({assignedTo.length} selected) <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (assignedTo.length === employees.length) {
                      setAssignedTo([]);
                    } else {
                      setAssignedTo(employees.map(e => e.id));
                    }
                    if (errors.assignedTo) setErrors({ ...errors, assignedTo: null });
                  }}
                  className="text-[11px] font-extrabold text-[#CE1126] hover:underline cursor-pointer"
                >
                  {assignedTo.length === employees.length && employees.length > 0 ? "Clear All" : "Select All"}
                </button>
              </div>
              
              <div className="max-h-40 overflow-y-auto p-2 bg-muted/40 border border-border rounded-xl flex flex-col gap-1.5 shadow-inner">
                {employees.map(emp => {
                  const isSelected = assignedTo.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        const next = isSelected 
                          ? assignedTo.filter(id => id !== emp.id)
                          : [...assignedTo, emp.id];
                        setAssignedTo(next);
                        if (errors.assignedTo) setErrors({ ...errors, assignedTo: null });
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? "bg-[#CE1126]/10 border-[#CE1126]/40 text-foreground font-bold" 
                          : "hover:bg-muted/60 border-transparent text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isSelected ? "bg-[#CE1126] border-[#CE1126] text-white font-black" : "border-border bg-card"
                        }`}>
                          {isSelected && <span className="text-[10px]">✓</span>}
                        </div>
                        <span>{emp.full_name}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-70">{emp.employee_code}</span>
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2 text-center font-medium">No employees found.</p>
                )}
              </div>
              {errors.assignedTo && <p className="text-destructive text-xs font-bold">{errors.assignedTo}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</Label>
                <select 
                  value={priority} 
                  onChange={e => setPriority(e.target.value)}
                  className="h-11 px-3 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-[#CE1126] outline-none font-medium text-sm text-foreground capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={e => { setDueDate(e.target.value); if(errors.dueDate) setErrors({...errors, dueDate: null}); }} 
                  className="h-11 rounded-xl bg-muted/40 font-semibold text-sm"
                />
                {errors.dueDate && <p className="text-destructive text-xs font-bold">{errors.dueDate}</p>}
              </div>
            </div>
            
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => { setShowAdd(false); resetForm(); }} 
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl px-6 shadow-md shadow-[#CE1126]/20"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                <span>{isSubmitting ? "Creating..." : "Create Assignment"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
