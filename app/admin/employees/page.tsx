"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";
import Header from "@/components/Header";
import { Plus, Search, Copy, Check, MoreHorizontal, Shield, User, Loader2, AlertCircle, RefreshCw, Power } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  is_active: boolean;
  role: string;
  created_at: string;
}

export default function EmployeeManagement() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nextCode, setNextCode] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [resetEmp, setResetEmp] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState({ full_name: "", employee_code: "", password: "", role: "employee" });
  const [resetPassword, setResetPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      if (!token) return;

      const res = await fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleAuthError(router);
        return;
      }
      if (!res.ok) throw new Error("Failed to load employees");

      const data = await res.json();
      setEmployees(data.employees || []);
      setNextCode(data.nextSuggestedCode || "EMP-001");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employees.");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add employee");
      
      setShowAdd(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/employees/${editEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: formData.full_name, employee_code: formData.employee_code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update employee");
      
      setEditEmp(null);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to ${emp.is_active ? 'deactivate' : 'reactivate'} ${emp.full_name}?`)) return;
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !emp.is_active })
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      fetchEmployees();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmp) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("attendance_session_token");
      const res = await fetch(`/api/admin/employees/${resetEmp.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      
      setResetEmp(null);
      alert("Password reset successfully. Active sessions for this user have been cleared.");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full bg-transparent">
      <Header title="Employee Management" />
      <main className="p-4 sm:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 pb-16">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Employees Directory</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Manage credentials, roles, and attendance status</p>
          </div>
          <Button 
            onClick={() => {
              setFormData({ full_name: "", employee_code: nextCode, password: "", role: "employee" });
              setFormError(null);
              setShowAdd(true);
            }}
            className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl h-11 px-5 gap-2 shadow-md shadow-[#CE1126]/20"
          >
            <Plus size={18} />
            <span>Add Employee</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-semibold text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* List Section */}
        <Card className="rounded-3xl border-border shadow-md overflow-hidden flex flex-col flex-1 bg-card/90">
          <div className="p-4 sm:p-5 border-b border-border/70 flex justify-end bg-muted/20">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search size={16} />
              </span>
              <Input 
                type="text" 
                placeholder="Search employees or codes..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 h-10 bg-card border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#CE1126] shadow-sm w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[400px] p-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                  <TableHead className="pr-6 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className="border-border/40">
                      <TableCell className="pl-6 py-4"><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground font-medium text-sm">
                      No employees found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.id} className="group hover:bg-muted/50 transition-colors border-border/50">
                      <TableCell className="pl-6 py-3.5">
                        <Link href={`/admin/employee/${emp.id}`} className="font-bold text-foreground hover:text-[#CE1126] transition-colors block">
                          {emp.full_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-muted-foreground">{emp.employee_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs font-bold gap-1 px-2.5 py-0.5">
                          {emp.role === 'admin' ? <Shield size={12} className="text-[#CE1126]" /> : <User size={12} />}
                          <span>{emp.role}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.is_active ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 hover:bg-green-500/15 font-bold px-2.5 py-0.5 rounded-full">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/15 font-bold px-2.5 py-0.5 rounded-full">Deactivated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {new Date(emp.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setFormData({ full_name: emp.full_name, employee_code: emp.employee_code, password: "", role: emp.role });
                              setFormError(null);
                              setEditEmp(emp);
                            }}
                            className="h-8 font-bold text-xs text-[#CE1126] hover:text-[#CE1126] hover:bg-[#CE1126]/10 px-2.5 rounded-lg"
                          >
                            Edit
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                              <MoreHorizontal size={16} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border p-1.5">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setResetPassword(generatePassword());
                                  setFormError(null);
                                  setResetEmp(emp);
                                }}
                                className="gap-2 text-xs font-semibold py-2 rounded-xl cursor-pointer"
                              >
                                <RefreshCw size={14} className="text-muted-foreground" />
                                <span>Reset Password</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(emp)}
                                className={`gap-2 text-xs font-semibold py-2 rounded-xl cursor-pointer ${emp.is_active ? 'text-destructive focus:text-destructive' : 'text-green-600 focus:text-green-600'}`}
                              >
                                <Power size={14} />
                                <span>{emp.is_active ? "Deactivate Account" : "Reactivate Account"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Add Employee</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Create credentials and assign administrative or user privileges</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
              <Input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-11 rounded-xl bg-muted/40 font-medium" placeholder="E.g. Rahul Sharma" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee Code</Label>
              <Input required type="text" value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} className="h-11 rounded-xl bg-muted/40 font-mono font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</Label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="h-11 px-3 bg-muted/40 border border-border rounded-xl font-medium text-sm text-foreground focus:ring-2 focus:ring-[#CE1126] outline-none">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Initial Password</Label>
              <div className="flex gap-2">
                <Input required type="text" readOnly value={formData.password} placeholder="Click generate..." className="h-11 rounded-xl bg-muted/20 font-mono font-bold" />
                <Button type="button" variant="outline" onClick={() => setFormData({...formData, password: generatePassword()})} className="h-11 rounded-xl font-bold px-4">Generate</Button>
              </div>
              {formData.password && (
                <div className="mt-2 p-3 bg-[#CE1126]/5 border border-[#CE1126]/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold font-mono tracking-wide text-foreground">{formData.password}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(formData.password)} className="h-7 text-[#CE1126] font-bold text-xs">
                    {copied ? <><Check size={13} className="mr-1" /> Copied</> : <><Copy size={13} className="mr-1" /> Copy</>}
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground font-medium mt-1">Copy and share immediately. It cannot be retrieved after creation.</p>
            </div>

            {formError && <Alert variant="destructive" className="rounded-xl py-2 text-xs font-semibold">{formError}</Alert>}

            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="rounded-xl font-semibold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !formData.password} className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl px-5">
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editEmp} onOpenChange={(open) => !open && setEditEmp(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Edit Employee</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Update profile name and unique organizational code</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
              <Input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-11 rounded-xl bg-muted/40 font-medium" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee Code</Label>
              <Input required type="text" value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} className="h-11 rounded-xl bg-muted/40 font-mono font-bold" />
            </div>
            {formError && <Alert variant="destructive" className="rounded-xl py-2 text-xs font-semibold">{formError}</Alert>}
            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setEditEmp(null)} className="rounded-xl font-semibold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold rounded-xl px-5">
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!resetEmp} onOpenChange={(open) => !open && setResetEmp(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-destructive">Reset Password</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Generating a new password for <strong className="text-foreground">{resetEmp?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">A new secure password has been generated. Confirmed execution will immediately log the user out of all active devices.</p>
            
            <div className="p-4 bg-muted/40 border border-border rounded-2xl flex items-center justify-between">
              <span className="text-lg font-bold font-mono tracking-wider text-foreground">{resetPassword}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(resetPassword)} className="h-8 text-[#CE1126] font-bold rounded-xl">
                {copied ? <><Check size={14} className="mr-1" /> Copied!</> : <><Copy size={14} className="mr-1" /> Copy</>}
              </Button>
            </div>
            
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs font-bold ml-2">
                Copy this password now! It can never be viewed again once confirmed.
              </AlertDescription>
            </Alert>

            {formError && <Alert variant="destructive" className="rounded-xl py-2 text-xs font-semibold">{formError}</Alert>}
            
            <DialogFooter className="mt-3 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setResetEmp(null)} className="rounded-xl font-semibold">Cancel</Button>
              <Button onClick={handleResetPassword} disabled={isSubmitting} variant="destructive" className="font-bold rounded-xl px-5">
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Confirm & Reset
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
