"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleAuthError } from "@/lib/clientAuth";

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
    <div className="flex flex-col min-h-full">
      <main className="p-4 md:p-6 flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <button 
            onClick={() => {
              setFormData({ full_name: "", employee_code: nextCode, password: "", role: "employee" });
              setFormError(null);
              setShowAdd(true);
            }}
            className="px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Employee
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}

        {/* List Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-end">
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs uppercase font-semibold text-foreground/60 tracking-wider">
                  <th className="p-4 pl-6">Name</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-foreground/50 text-sm">Loading employees...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-foreground/50 text-sm">No employees found.</td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 pl-6">
                        <Link href={`/admin/employee/${emp.id}`} className="font-semibold text-foreground hover:text-accent transition-colors block">
                          {emp.full_name}
                        </Link>
                      </td>
                      <td className="p-4 text-sm font-medium text-foreground/70">{emp.employee_code}</td>
                      <td className="p-4 text-sm text-foreground/60 capitalize">{emp.role}</td>
                      <td className="p-4">
                        {emp.is_active ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Deactivated</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-foreground/60">
                        {new Date(emp.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 pr-6 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => {
                            setFormData({ full_name: emp.full_name, employee_code: emp.employee_code, password: "", role: emp.role });
                            setFormError(null);
                            setEditEmp(emp);
                          }} className="text-sm font-medium text-accent hover:underline">Edit</button>
                          
                          {/* Dropdown-like actions wrapped in a small flex */}
                          <button onClick={() => {
                            setResetPassword(generatePassword());
                            setFormError(null);
                            setResetEmp(emp);
                          }} className="text-sm font-medium text-foreground/60 hover:text-foreground mx-2">Reset Pwd</button>

                          <button 
                            onClick={() => handleToggleStatus(emp)}
                            className={`text-sm font-medium ${emp.is_active ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {emp.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Employee</h3>
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Code</label>
                <input required type="text" value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="flex gap-2">
                  <input required type="text" readOnly value={formData.password} placeholder="Generate a password..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-mono" />
                  <button type="button" onClick={() => setFormData({...formData, password: generatePassword()})} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-xl whitespace-nowrap">Generate</button>
                </div>
                {formData.password && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-blue-800 font-medium tracking-wide font-mono">{formData.password}</p>
                    <button type="button" onClick={() => handleCopy(formData.password)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
                <p className="text-xs text-foreground/50 mt-2">Copy and share this password immediately. It will never be shown again.</p>
              </div>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 font-medium text-foreground/60">Cancel</button>
                <button type="submit" disabled={isSubmitting || !formData.password} className="px-4 py-2 bg-accent text-white font-medium rounded-lg disabled:opacity-50">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEmp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Edit Employee</h3>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Code</label>
                <input required type="text" value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setEditEmp(null)} className="px-4 py-2 font-medium text-foreground/60">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-accent text-white font-medium rounded-lg disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetEmp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-red-600">Reset Password for {resetEmp.full_name}</h3>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">A new secure password has been generated. This action will log the user out of all devices immediately.</p>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
                <p className="text-lg font-bold font-mono tracking-wider">{resetPassword}</p>
                <button type="button" onClick={() => handleCopy(resetPassword)} className="text-accent hover:text-accent-hover text-sm font-bold">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              
              <p className="text-xs font-bold text-red-500">WARNING: Copy this password now. Once you click Confirm, it can never be viewed again.</p>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setResetEmp(null)} className="px-4 py-2 font-medium text-foreground/60">Cancel</button>
                <button onClick={handleResetPassword} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg disabled:opacity-50">Confirm & Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
