"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { ArrowLeft, Clock, Trash2, Calendar, User, AlignLeft, Send, Save, X, Edit2, Share2, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailPage(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const params = use(props.params);
  const taskId = params.id;

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

        const merged = [
          ...data.comments.map((c: any) => ({ ...c, _type: 'comment' })),
          ...data.activityLogs.map((a: any) => ({ ...a, _type: 'activity' }))
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        setFeed(merged);

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
        fetchData();
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
      <div className="flex flex-col min-h-screen bg-transparent">
        <Header title="Task Details" />
        <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  const pColor = 
    task.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/20' : 
    task.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' : 
    'bg-muted text-muted-foreground border-border';

  const sColor = 
    task.status === 'todo' ? 'text-slate-500' :
    task.status === 'in_progress' ? 'text-blue-500' :
    task.status === 'done' ? 'text-green-600 dark:text-green-400' : 'text-orange-500';

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      <Header title="Task Details" />
      
      {/* Action Strip */}
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="text-green-600 border-green-600/20 bg-green-500/5 hover:bg-green-500/15 gap-1.5 text-xs font-bold rounded-xl h-9">
                <Share2 size={14} /> <span>Share</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handleDelete} className="text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/15 h-9 w-9 p-0 rounded-xl" title="Delete Task">
                <Trash2 size={16} />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col p-4 sm:p-6 pb-28 sm:pb-12 gap-6 relative">
        
        {/* Header Details Card */}
        <Card className="rounded-3xl border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${sColor} bg-muted/60 px-3 py-1 rounded-full border border-border`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{task.status.replace('_', ' ')}</span>
            </span>
            
            {isAdmin ? (
              <select 
                value={task.priority} 
                onChange={(e) => handleAdminPatch({ priority: e.target.value })}
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border appearance-none cursor-pointer outline-none ${pColor}`}
              >
                <option value="low">LOW PRIORITY</option>
                <option value="medium">MEDIUM PRIORITY</option>
                <option value="high">HIGH PRIORITY</option>
              </select>
            ) : (
              <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${pColor}`}>
                {task.priority}
              </Badge>
            )}

            <span className="text-xs font-semibold text-muted-foreground ml-auto">
              Created {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Title Section */}
          <div className="mb-6 group">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input 
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="flex-1 text-lg font-bold bg-muted/40 border-border rounded-xl h-11"
                />
                <Button size="icon" onClick={() => { handleAdminPatch({ title: editTitle }); setIsEditingTitle(false); }} className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 w-11">
                  <Save size={16} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditTitle(task.title); setIsEditingTitle(false); }} className="rounded-xl h-11 w-11">
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">{task.title}</h1>
                {isAdmin ? (
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(true)} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-lg shrink-0">
                    <Edit2 size={15} />
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            <div className="flex items-center gap-3.5 p-3.5 bg-muted/40 rounded-2xl border border-border">
              <User size={20} className="text-[#CE1126] shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Assignee</span>
                {isAdmin ? (
                  <select 
                    value={task.assigned_to} 
                    onChange={(e) => handleAdminPatch({ assigned_to: e.target.value })}
                    className="text-base font-bold bg-transparent outline-none cursor-pointer text-foreground appearance-none mt-0.5"
                  >
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                ) : (
                  <span className="text-base font-bold text-foreground truncate mt-0.5">{task.assignee?.full_name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-muted/40 rounded-2xl border border-border">
              <Calendar size={20} className="text-[#CE1126] shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Due Date</span>
                {isAdmin ? (
                  <input 
                    type="date" 
                    value={task.due_date || ""} 
                    onChange={(e) => handleAdminPatch({ due_date: e.target.value || null })}
                    className="text-sm font-bold bg-transparent outline-none cursor-pointer text-foreground mt-0.5"
                  />
                ) : (
                  <span className="text-sm font-bold text-foreground mt-0.5">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date set'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="group relative border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-2.5">
              <AlignLeft size={16} className="text-[#CE1126]" />
              <h3 className="font-bold text-sm text-foreground">Task Description</h3>
            </div>
            
            {isEditingDesc ? (
              <div className="flex flex-col gap-3">
                <textarea 
                  autoFocus
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full min-h-[120px] font-medium bg-muted/40 border border-border rounded-xl p-3.5 text-sm text-foreground focus:ring-2 focus:ring-[#CE1126] outline-none resize-y"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setEditDesc(task.description || ""); setIsEditingDesc(false); }} className="font-semibold rounded-xl text-xs">Cancel</Button>
                  <Button size="sm" onClick={() => { handleAdminPatch({ description: editDesc }); setIsEditingDesc(false); }} className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl px-4 text-xs shadow-sm">Save Changes</Button>
                </div>
              </div>
            ) : (
              <div className="relative bg-muted/20 p-4 rounded-2xl border border-border/50">
                <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {task.description || <span className="italic text-muted-foreground">No description provided for this task assignment.</span>}
                </p>
                {isAdmin ? (
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingDesc(true)} className="absolute top-2 right-2 h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={13} />
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Quick Status Action (Employee Only) */}
          {!isAdmin && task.status !== 'done' ? (
            <div className="mt-6 pt-5 border-t border-border">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-3">Quick Actions</span>
              <div className="flex gap-3">
                {task.status === 'todo' ? (
                  <Button onClick={() => handleAdminPatch({ status: 'in_progress' })} className="w-full h-11 bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl shadow-md text-xs">
                    Start Task Work
                  </Button>
                ) : null}
                {task.status === 'in_progress' ? (
                  <Button onClick={() => handleAdminPatch({ status: 'done' })} className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md text-xs">
                    Mark Task as Completed
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>

        {/* Unified Activity Feed */}
        <div className="mt-2">
          <h3 className="font-extrabold text-base text-foreground mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#CE1126]" /> <span>Activity & Discussion</span>
          </h3>
          
          <div className="flex flex-col gap-5 relative pl-4 sm:pl-6 border-l border-border/80 ml-2">
            {feed.map((item) => {
              if (item._type === 'activity') {
                let msg = `${item.actor?.full_name} updated the task`;
                if (item.action === 'status_changed') msg = `${item.actor?.full_name} moved status to ${item.details.to.replace('_', ' ')}`;
                if (item.action === 'priority_changed') msg = `${item.actor?.full_name} changed priority to ${item.details.to}`;
                if (item.action === 'due_date_changed') msg = `${item.actor?.full_name} set due date to ${item.details.to ? new Date(item.details.to).toLocaleDateString() : 'None'}`;
                if (item.action === 'edited') msg = `${item.actor?.full_name} edited ${item.details.fields.join(' and ')}`;
                if (item.action === 'reassigned') msg = `${item.actor?.full_name} reassigned the task`;
                
                return (
                  <div key={`act-${item.id}`} className="flex items-center gap-3 relative z-10 -ml-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background -ml-[19px] sm:-ml-[27px]" />
                    <span className="text-xs font-semibold text-muted-foreground">{msg}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/60 ml-auto">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                );
              } else {
                return (
                  <Card key={`com-${item.id}`} className="flex items-start gap-3.5 relative z-10 bg-card p-4 rounded-2xl shadow-xs border-border">
                    <div className="w-8 h-8 rounded-full bg-[#CE1126]/10 text-[#CE1126] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#CE1126]/20">
                      {item.employee?.full_name?.substring(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-bold text-xs text-foreground">{item.employee?.full_name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground whitespace-pre-wrap leading-relaxed">{item.comment_text}</p>
                    </div>
                  </Card>
                );
              }
            })}
            
            {feed.length === 0 ? (
              <div className="text-xs font-semibold text-muted-foreground py-4 italic">No comments or logs recorded yet.</div>
            ) : null}
            <div ref={feedEndRef} />
          </div>
        </div>

      </div>

      {/* Comment Input Strip */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border p-3.5 z-30 shadow-lg md:static md:bg-transparent md:border-none md:shadow-none md:p-6 md:pt-0 max-w-4xl mx-auto w-full">
        <div className="flex items-end gap-2 bg-muted/40 border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-[#CE1126] transition-all">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a message or observation..."
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[42px] text-xs sm:text-sm font-medium p-2 text-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostComment();
              }
            }}
          />
          <Button 
            onClick={handlePostComment}
            disabled={!commentText.trim() || isPosting}
            className="h-10 px-4 bg-[#CE1126] hover:bg-[#b30f21] text-white rounded-xl shadow-sm font-bold text-xs shrink-0"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
