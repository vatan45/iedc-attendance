"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  CheckSquare
} from "lucide-react";

// Types
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

// --- DND Components ---

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

  // Refined priority styling
  const pStyles = 
    task.priority === 'high' ? 'bg-red-500/10 text-red-600 ring-1 ring-red-500/20 dark:bg-red-500/20 dark:text-red-400' : 
    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' : 
    'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
      className={`relative group bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md ${
        isDragging ? 'border-accent ring-2 ring-accent/20 scale-[1.02]' : 'border-gray-200/50 dark:border-gray-800 hover:border-accent/30 hover:-translate-y-0.5'
      }`}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <h4 className="font-bold text-sm text-foreground/90 line-clamp-2 leading-relaxed">{task.title}</h4>
      </div>
      
      <div className="flex justify-between items-end mt-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 text-accent ring-1 ring-accent/20 flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
            {task.assignee?.full_name?.substring(0, 2) || "??"}
          </div>
          <span className="text-xs font-semibold text-foreground/60 truncate max-w-[100px]">
            {task.assignee?.full_name || "Unassigned"}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${pStyles}`}>
            {task.priority}
          </span>
          {task.due_date && (
            <div className={`flex items-center gap-1 text-[10px] font-bold tracking-wide ${isOverdue ? 'text-red-500' : 'text-foreground/40'}`}>
              <Calendar size={12} />
              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {isOverdue && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded ml-1 uppercase text-[8px]">Overdue</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, title, tasks, onTaskClick, icon }: { status: string; title: string; tasks: Task[]; onTaskClick: (id: string) => void; icon: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col rounded-3xl min-w-0 w-full transition-all duration-300 ${
        isOver ? 'bg-accent/5 ring-2 ring-accent/20' : 'bg-gray-50/50 dark:bg-white/[0.02]'
      }`}
    >
      <div className="sticky top-0 z-10 p-5 flex items-center justify-between border-b border-gray-200/40 dark:border-gray-800/40 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md rounded-t-3xl">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-foreground/80 uppercase text-xs tracking-widest">{title}</h3>
        </div>
        <span className="bg-white dark:bg-black/50 text-foreground/60 text-xs font-black px-2.5 py-1 rounded-full shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto">
        {tasks.map(t => <KanbanCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />)}
        {tasks.length === 0 && (
          <div className="flex-1 min-h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center p-8 opacity-50">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">Empty Status</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);

  // List Sort State
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDesc, setSortDesc] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // DND Sensors
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

  // Drag Handlers
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

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // API Call
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
      fetchData(); // Revert on failure
    }
  };

  // Form Handlers
  const validateForm = () => {
    const newErrors: any = {};
    if (!title.trim()) newErrors.title = "Required";
    if (!description.trim()) newErrors.description = "Required";
    if (!assignedTo) newErrors.assignedTo = "Select an assignee";
    
    if (dueDate) {
      const selected = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        newErrors.dueDate = "Cannot be past";
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

      const emp = employees.find(e => e.id === assignedTo);
      showToastMsg(`Assigned to ${emp?.full_name || 'employee'}`);
      
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
    setAssignedTo("");
    setPriority("medium");
    setDueDate(new Date().toISOString().split("T")[0]);
    setErrors({});
  };

  // Computed data
  const isOverdueFn = (t: Task) => t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && t.status !== "done";

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterAssignee !== "all" && t.assignee?.id !== filterAssignee) return false;
    if (filterOverdue && !isOverdueFn(t)) return false;
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
    <div className="flex flex-col min-h-full bg-[#f8fafc] dark:bg-[#09090b]">
      <main className="p-4 md:p-8 flex-1 w-full max-w-[1600px] mx-auto flex flex-col gap-8 relative">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">Team Tasks</h1>
            <p className="text-sm font-semibold text-foreground/50">Manage assignments and track progress across the organization</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-transform shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={3} /> Create Task
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col shadow-sm">
            <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">Total Tasks</span>
            <span className="text-3xl font-black text-foreground">{stats.total}</span>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col shadow-sm">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">To Do</span>
            <span className="text-3xl font-black text-slate-700 dark:text-slate-300">{stats.todo}</span>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col shadow-sm">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">In Progress</span>
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.inProgress}</span>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col shadow-sm">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Completed</span>
            <span className="text-3xl font-black text-green-600 dark:text-green-400">{stats.done}</span>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col shadow-sm">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Blocked</span>
            <span className="text-3xl font-black text-orange-600 dark:text-orange-400">{stats.blocked}</span>
          </div>
          <div className="bg-red-50/50 dark:bg-red-950/20 backdrop-blur-md p-5 rounded-3xl border border-red-200/50 dark:border-red-900/50 flex flex-col shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-red-500/10"><AlertCircle size={80} /></div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 relative z-10 flex items-center gap-1.5"><AlertCircle size={12}/> Overdue</span>
            <span className="text-3xl font-black text-red-600 dark:text-red-400 relative z-10">{stats.overdue}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-3 rounded-2xl flex flex-wrap items-center gap-3 shadow-sm border border-gray-200/50 dark:border-gray-800/50 relative z-10">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30">
              <Search size={16} strokeWidth={3} />
            </span>
            <input 
              type="text" 
              placeholder="Search assignments..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            />
          </div>
          
          <select 
            value={filterAssignee} 
            onChange={e => setFilterAssignee(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent appearance-none min-w-[160px]"
          >
            <option value="all">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>

          <select 
            value={filterPriority} 
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent appearance-none min-w-[140px]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <label className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} className="rounded text-red-500 focus:ring-red-500 w-4 h-4 border-gray-300" />
            <span className="text-sm font-bold text-foreground/70">Overdue</span>
          </label>

          <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-2 hidden lg:block" />

          <div className="flex bg-gray-100 dark:bg-black/50 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setViewMode("board")}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === "board" ? "bg-white dark:bg-gray-800 shadow-sm text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
            >
              <LayoutGrid size={16} /> Board
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-800 shadow-sm text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
            >
              <List size={16} /> List
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          </div>
        ) : viewMode === "board" ? (
          /* Kanban Board */
          <div className="flex-1 pb-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px] h-full items-start">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <KanbanColumn icon={<CheckSquare size={16} className="text-slate-500"/>} status="todo" title="To Do" tasks={filteredTasks.filter(t => t.status === "todo")} onTaskClick={(id) => router.push(`/tasks/${id}`)} />
                <KanbanColumn icon={<Clock size={16} className="text-blue-500"/>} status="in_progress" title="In Progress" tasks={filteredTasks.filter(t => t.status === "in_progress")} onTaskClick={(id) => router.push(`/tasks/${id}`)} />
                <KanbanColumn icon={<CheckCircle size={16} className="text-green-500"/>} status="done" title="Done" tasks={filteredTasks.filter(t => t.status === "done")} onTaskClick={(id) => router.push(`/tasks/${id}`)} />
                <KanbanColumn icon={<ShieldAlert size={16} className="text-orange-500"/>} status="blocked" title="Blocked" tasks={filteredTasks.filter(t => t.status === "blocked")} onTaskClick={(id) => router.push(`/tasks/${id}`)} />

                <DragOverlay dropAnimation={null}>
                  {activeDragTask ? <KanbanCard task={activeDragTask} onClick={() => {}} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 overflow-hidden flex-1 relative z-10">
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-foreground/40 tracking-widest border-b border-gray-100 dark:border-gray-800">
                    {['Title', 'Assignee', 'Priority', 'Status', 'Due Date', 'Created'].map((col, idx) => {
                      const keyMap: any = { 'Title': 'title', 'Assignee': 'assignee', 'Priority': 'priority', 'Status': 'status', 'Due Date': 'due_date', 'Created': 'created_at' };
                      const colKey = keyMap[col];
                      return (
                        <th 
                          key={col} 
                          onClick={() => { if(sortCol === colKey) setSortDesc(!sortDesc); else { setSortCol(colKey); setSortDesc(true); } }}
                          className={`p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx === 0 ? 'pl-6 rounded-tl-2xl' : ''} ${idx === 5 ? 'rounded-tr-2xl' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            {col}
                            {sortCol === colKey && (
                              <span className="text-accent">{sortDesc ? '↓' : '↑'}</span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {sortedTasks.length === 0 ? (
                    <tr><td colSpan={6} className="p-16 text-center text-foreground/40 font-bold">No tasks match your filters.</td></tr>
                  ) : (
                    sortedTasks.map(task => {
                      const isOverdue = isOverdueFn(task);
                      return (
                        <tr 
                          key={task.id} 
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="p-5 pl-6 font-bold text-sm text-foreground/90 max-w-[300px] truncate">{task.title}</td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-black uppercase ring-1 ring-accent/20">
                                {task.assignee?.full_name?.substring(0, 2) || "??"}
                              </div>
                              <span className="text-sm font-semibold">{task.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              task.priority === 'high' ? 'bg-red-500/10 text-red-600 ring-1 ring-red-500/20' : 
                              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20' : 
                              'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="p-5">
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                              task.status === 'todo' ? 'text-slate-500' :
                              task.status === 'in_progress' ? 'text-blue-500' :
                              task.status === 'done' ? 'text-green-500' : 'text-orange-500'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={`p-5 text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-foreground/60'}`}>
                            <div className="flex items-center gap-2">
                              {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '--'}
                              {isOverdue && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded uppercase text-[8px]">Overdue</span>}
                            </div>
                          </td>
                          <td className="p-5 text-sm font-semibold text-foreground/40">
                            {new Date(task.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle size={20} className="text-green-400" />
          <span className="font-bold text-sm">{toast}</span>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowAdd(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-gray-200/50 dark:border-gray-800/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight text-foreground">Create Task</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground/50 hover:text-foreground transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 overflow-y-auto pr-2 flex-1 scrollbar-hide">
              <div>
                <label className="block text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-2">Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => { setTitle(e.target.value); if(errors.title) setErrors({...errors, title: null}); }} 
                  className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-black/50 border ${errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-800'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent font-semibold transition-all`}
                  placeholder="E.g., Update quarterly report"
                />
                {errors.title && <p className="text-red-500 text-xs mt-2 font-bold">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-2">Description <span className="text-red-500">*</span></label>
                <textarea 
                  value={description} 
                  onChange={e => { setDescription(e.target.value); if(errors.description) setErrors({...errors, description: null}); }} 
                  className={`w-full px-5 py-4 bg-gray-50 dark:bg-black/50 border ${errors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-800'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent min-h-[140px] font-medium resize-none transition-all`}
                  placeholder="Task details and instructions..."
                />
                {errors.description && <p className="text-red-500 text-xs mt-2 font-bold">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-2">Assign To <span className="text-red-500">*</span></label>
                <select 
                  value={assignedTo} 
                  onChange={e => { setAssignedTo(e.target.value); if(errors.assignedTo) setErrors({...errors, assignedTo: null}); }} 
                  className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-black/50 border ${errors.assignedTo ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-800'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent font-semibold appearance-none transition-all`}
                >
                  <option value="" disabled>Select an employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                  ))}
                </select>
                {errors.assignedTo && <p className="text-red-500 text-xs mt-2 font-bold">{errors.assignedTo}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-2">Priority</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent font-semibold appearance-none transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-2">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => { setDueDate(e.target.value); if(errors.dueDate) setErrors({...errors, dueDate: null}); }} 
                    className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-black/50 border ${errors.dueDate ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-800'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent font-semibold transition-all`}
                  />
                  {errors.dueDate && <p className="text-red-500 text-xs mt-2 font-bold">{errors.dueDate}</p>}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowAdd(false); resetForm(); }} 
                  className="px-6 py-4 font-bold text-foreground/60 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-8 py-4 bg-foreground text-background font-black rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg hover:shadow-xl w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-4 border-background/20 border-t-background rounded-full animate-spin"></span>
                      Creating...
                    </>
                  ) : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
