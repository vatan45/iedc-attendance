"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, MessageSquare, Trash2, Calendar, User, AlignLeft, Send, CheckCircle, Save, X, Edit2, Share2 } from "lucide-react";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState<string | null>(null);
  
  const [task, setTask] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    // Unwrap params in Next.js 15
    Promise.resolve(params).then(p => {
      setTaskId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (taskId) fetchData();
  }, [taskId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return router.push("/");

      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        return router.back();
      }

      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
        setCurrentUser(data.currentUser);
        setEditTitle(data.task.title);
        setEditDesc(data.task.description || "");

        // Merge feed
        const merged = [
          ...data.comments.map((c: any) => ({ ...c, _type: 'comment' })),
          ...data.activityLogs.map((a: any) => ({ ...a, _type: 'activity' }))
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        setFeed(merged);

        // If admin, fetch employees for reassignment
        if (data.currentUser.role === 'admin') {
          fetchEmployees(token);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async (token: string) => {
    const res = await fetch("/api/admin/employees", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees?.filter((e:any) => e.is_active) || []);
    }
  };

  const handleAdminPatch = async (updates: any) => {
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchData(); // Reload to get new activity logs
      } else {
        alert("Failed to update task");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("This will permanently delete the task and its comments. Continue?")) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        router.back();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsPosting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment_text: commentText })
      });
      if (res.ok) {
        setCommentText("");
        await fetchData();
        setTimeout(() => feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!task) return;
    const url = window.location.href;
    const text = `*New Task Assigned* 📋\n*Task:* ${task.title}\n*Assignee:* ${task.assignee?.full_name || 'Unassigned'}\n*Priority:* ${task.priority.toUpperCase()}\n*Due:* ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}\n\nView details: ${url}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#09090b]">
        <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const pColor = 
    task.priority === 'high' ? 'bg-red-500/10 text-red-600 ring-1 ring-red-500/20' : 
    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20' : 
    'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20';

  const sColor = 
    task.status === 'todo' ? 'text-slate-500' :
    task.status === 'in_progress' ? 'text-blue-500' :
    task.status === 'done' ? 'text-green-500' : 'text-orange-500';

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#09090b] relative">
      
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={handleWhatsAppShare} className="p-2 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-bold">
                <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
              </button>
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col md:flex-row pb-24 md:pb-8 relative">
        
        {/* Main Content (Header + Feed) */}
        <div className="flex-1 flex flex-col">
          
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-900 md:rounded-b-3xl md:mx-4 border-b md:border border-gray-200/50 dark:border-gray-800/50 p-6 md:p-8 md:mt-4 shadow-sm relative z-10">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${sColor} bg-current/10 px-3 py-1 rounded-full ring-1 ring-current/20`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {task.status.replace('_', ' ')}
              </span>
              
              {isAdmin ? (
                <select 
                  value={task.priority} 
                  onChange={(e) => handleAdminPatch({ priority: e.target.value })}
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md appearance-none cursor-pointer ${pColor}`}
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              ) : (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${pColor}`}>
                  {task.priority}
                </span>
              )}

              <span className="text-xs font-bold text-foreground/40 ml-auto">
                Created {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Title */}
            <div className="mb-6 group">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 text-2xl font-black bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
                  />
                  <button onClick={() => { handleAdminPatch({ title: editTitle }); setIsEditingTitle(false); }} className="p-2.5 bg-green-500 text-white rounded-xl"><Save size={18} /></button>
                  <button onClick={() => { setEditTitle(task.title); setIsEditingTitle(false); }} className="p-2.5 bg-gray-200 dark:bg-gray-800 rounded-xl"><X size={18} /></button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{task.title}</h1>
                  {isAdmin && (
                    <button onClick={() => setIsEditingTitle(true)} className="p-2 text-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                <User size={18} className="text-foreground/40" />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black uppercase text-foreground/40 tracking-wider">Assignee</span>
                  {isAdmin ? (
                    <select 
                      value={task.assigned_to} 
                      onChange={(e) => handleAdminPatch({ assigned_to: e.target.value })}
                      className="text-xl font-black bg-transparent outline-none cursor-pointer text-accent -ml-1 appearance-none"
                    >
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xl font-black text-accent">{task.assignee?.full_name}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                <Calendar size={18} className="text-foreground/40" />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black uppercase text-foreground/40 tracking-wider">Due Date</span>
                  {isAdmin ? (
                    <input 
                      type="date" 
                      value={task.due_date || ""} 
                      onChange={(e) => handleAdminPatch({ due_date: e.target.value || null })}
                      className="text-sm font-bold bg-transparent outline-none cursor-pointer text-accent -ml-1"
                    />
                  ) : (
                    <span className="text-sm font-bold text-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="group relative">
              <div className="flex items-center gap-2 mb-3">
                <AlignLeft size={16} className="text-foreground/40" />
                <h3 className="font-bold text-foreground/80">Description</h3>
              </div>
              
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea 
                    autoFocus
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full min-h-[120px] font-medium bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-y"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditDesc(task.description || ""); setIsEditingDesc(false); }} className="px-4 py-2 text-sm font-bold bg-gray-200 dark:bg-gray-800 rounded-lg">Cancel</button>
                    <button onClick={() => { handleAdminPatch({ description: editDesc }); setIsEditingDesc(false); }} className="px-4 py-2 text-sm font-bold bg-accent text-white rounded-lg">Save</button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm font-medium text-foreground/70 whitespace-pre-wrap leading-relaxed">
                    {task.description || <span className="italic text-foreground/30">No description provided.</span>}
                  </p>
                  {isAdmin && (
                    <button onClick={() => setIsEditingDesc(true)} className="absolute top-0 right-0 p-2 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 rounded-lg text-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Status Change (Employee Only) */}
            {!isAdmin && task.status !== 'done' && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black uppercase text-foreground/40 tracking-wider mb-4">Quick Actions</h4>
                <div className="flex gap-3">
                  {task.status === 'todo' && (
                    <button onClick={() => handleAdminPatch({ status: 'in_progress' })} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl shadow-md hover:scale-[1.02] transition-transform">
                      Start Task
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button onClick={() => handleAdminPatch({ status: 'done' })} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl shadow-md hover:scale-[1.02] transition-transform">
                      Mark as Done
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Unified Feed */}
          <div className="px-4 py-8 md:px-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Clock size={18} className="text-foreground/40" /> Activity Feed
            </h3>
            
            <div className="flex flex-col gap-6 relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-800 z-0"></div>

              {feed.map((item, idx) => {
                if (item._type === 'activity') {
                  // Render Activity Log
                  let msg = `${item.actor?.full_name} updated the task`;
                  if (item.action === 'status_changed') msg = `${item.actor?.full_name} moved task to ${item.details.to.replace('_', ' ')}`;
                  if (item.action === 'priority_changed') msg = `${item.actor?.full_name} changed priority to ${item.details.to}`;
                  if (item.action === 'due_date_changed') msg = `${item.actor?.full_name} changed due date to ${item.details.to ? new Date(item.details.to).toLocaleDateString() : 'None'}`;
                  if (item.action === 'edited') msg = `${item.actor?.full_name} edited the ${item.details.fields.join(' and ')}`;
                  if (item.action === 'reassigned') msg = `${item.actor?.full_name} reassigned the task`;
                  
                  return (
                    <div key={`act-${item.id}`} className="flex items-start gap-4 relative z-10 pl-[23px]">
                      <div className="absolute left-[13px] top-1.5 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-[#f8fafc] dark:ring-[#09090b]"></div>
                      <p className="text-xs font-semibold text-foreground/50">{msg} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  );
                } else {
                  // Render Comment
                  const isMe = item.employee_id === currentUser.id;
                  return (
                    <div key={`com-${item.id}`} className="flex items-start gap-4 relative z-10 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 ml-6">
                      <div className="absolute -left-[27px] top-4 w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 text-accent font-black text-xs flex items-center justify-center ring-4 ring-[#f8fafc] dark:ring-[#09090b]">
                        {item.employee?.full_name?.substring(0,2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-bold text-sm">{item.employee?.full_name}</span>
                          <span className="text-[10px] font-bold text-foreground/40">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground/80 whitespace-pre-wrap">{item.comment_text}</p>
                      </div>
                    </div>
                  );
                }
              })}
              
              {feed.length === 0 && (
                <div className="pl-8 text-sm font-semibold text-foreground/40">No activity yet.</div>
              )}
              <div ref={feedEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Comment Box (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 p-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:static md:bg-transparent md:border-none md:shadow-none md:p-8 md:pt-0 max-w-4xl mx-auto w-full">
        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-accent transition-all">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] text-sm font-medium p-2 scrollbar-hide"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostComment();
              }
            }}
          />
          <button 
            onClick={handlePostComment}
            disabled={!commentText.trim() || isPosting}
            className="p-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0"
          >
            {isPosting ? <span className="w-5 h-5 block border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Send size={18} />}
          </button>
        </div>
      </div>

    </div>
  );
}
