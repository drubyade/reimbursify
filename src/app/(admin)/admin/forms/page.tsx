"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormSection } from "@/types/forms";
import { FormBuilder } from "@/components/FormBuilder";
import { OfflineGuard } from "@/components/OfflineGuard";
import { Users, Plus, LayoutGrid, List, FileText, ArrowLeft, Building2 } from "lucide-react";

interface AdminGroup {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  createdAt: string;
  isArchived?: boolean;
  _count?: { members: number };
}

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  group?: { id: string; name: string; groupId: string };
}

export default function FormManagementPage() {
  return (
    <OfflineGuard featureName="Form management">
      <FormManagementContent />
    </OfflineGuard>
  );
}

function FormManagementContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data states
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View states
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("adminForms_selectedGroupId");
    return null;
  });
  const [editingFormId, setEditingFormId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("adminForms_editingFormId");
    return null;
  });
  
  // Form Builder state
  const [editingSections, setEditingSections] = useState<FormSection[]>([]);
  const [editingMetadata, setEditingMetadata] = useState<any>({});
  const [showCreateForm, setShowCreateForm] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("adminForms_showCreateForm") === "true";
    return false;
  });
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [creatingForm, setCreatingForm] = useState(false);

  // Group Filters/Sort
  const [groupViewMode, setGroupViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") return (sessionStorage.getItem("adminForms_groupViewMode") as "grid" | "list") || "list";
    return "list";
  });
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSortBy, setGroupSortBy] = useState("date-desc");

  // Form Filters/Sort
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [formStatusFilter, setFormStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formViewMode, setFormViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") return (sessionStorage.getItem("adminForms_formViewMode") as "grid" | "list") || "list";
    return "list";
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMINISTRATOR") {
      router.push("/trips");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedGroupId) sessionStorage.setItem("adminForms_selectedGroupId", selectedGroupId);
      else sessionStorage.removeItem("adminForms_selectedGroupId");
      
      if (editingFormId) sessionStorage.setItem("adminForms_editingFormId", editingFormId);
      else sessionStorage.removeItem("adminForms_editingFormId");
      
      sessionStorage.setItem("adminForms_showCreateForm", showCreateForm.toString());
      sessionStorage.setItem("adminForms_groupViewMode", groupViewMode);
      sessionStorage.setItem("adminForms_formViewMode", formViewMode);
    }
  }, [selectedGroupId, editingFormId, showCreateForm, groupViewMode, formViewMode]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchGroups();
  }, [session?.user?.id]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchForms(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      // Only show unarchived groups
      setGroups((data.groups || []).filter((g: AdminGroup) => !g.isArchived));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async (groupId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/forms-builder?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch forms");
      const data = await res.json();
      setForms(data.forms || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newFormTitle.trim() || !selectedGroupId) return;

    try {
      setCreatingForm(true);
      setError(null);

      const templateSchema = {
        metadata: { requiresTripLink: false },
        sections: [
          {
            id: "section-1",
            title: "General Information",
            fields: [],
            position: 0,
          },
        ],
      };

      const response = await fetch("/api/forms-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFormTitle,
          description: newFormDesc || null,
          templateSchema,
          groupId: selectedGroupId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create form");
      }

      const data = await response.json();
      setForms([data.form, ...forms]);
      setNewFormTitle("");
      setNewFormDesc("");
      setShowCreateForm(false);
      setEditingFormId(data.form.id);
      setEditingSections(templateSchema.sections);
      setEditingMetadata(templateSchema.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create form");
    } finally {
      setCreatingForm(false);
    }
  };

  const handleEditForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms-builder/${formId}`);
      if (!response.ok) throw new Error("Failed to fetch form");
      const data = await response.json();
      setEditingFormId(formId);
      setEditingSections(data.form.templateSchema.sections || []);
      setEditingMetadata(data.form.templateSchema.metadata || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form");
    }
  };

  const handleSaveForm = async (sections: FormSection[], metadata?: any) => {
    if (!editingFormId || !selectedGroupId) return;
    try {
      const form = forms.find((f) => f.id === editingFormId);
      if (!form) return;
      const response = await fetch(`/api/forms-builder/${editingFormId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          templateSchema: { sections, metadata },
        }),
      });
      if (!response.ok) throw new Error("Failed to save form");
      
      setEditingFormId(null);
      await fetchForms(selectedGroupId); // refresh forms
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    try {
      const response = await fetch(`/api/forms-builder/${formId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete form");
      setForms(forms.filter((f) => f.id !== formId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete form");
    }
  };

  const handleToggleActive = async (formId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/forms-builder/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error("Failed to update form status");
      setForms(forms.map((f) => f.id === formId ? { ...f, isActive: !isActive } : f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update form");
    }
  };

  if (status === "loading" || (loading && !selectedGroupId)) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!session || session.user?.role !== "ADMINISTRATOR") {
    return null;
  }

  // ─── PHASE 3: FORM BUILDER VIEW ───────────────────────────────────────────
  if (editingFormId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <FormBuilder
            initialSections={editingSections}
            initialMetadata={editingMetadata}
            onSave={handleSaveForm}
            onBack={() => setEditingFormId(null)}
            loading={false}
            formId={editingFormId || "new"}
          />
        </div>
      </div>
    );
  }

  // ─── PHASE 2: FORMS VIEW (For Selected Group) ─────────────────────────────
  if (selectedGroupId) {
    const group = groups.find(g => g.id === selectedGroupId);
    
    const filteredForms = forms.filter((form) => {
      if (formStatusFilter === "active" && !form.isActive) return false;
      if (formStatusFilter === "inactive" && form.isActive) return false;
      if (formSearchQuery) {
        const term = formSearchQuery.toLowerCase();
        return form.title.toLowerCase().includes(term) || (form.description || "").toLowerCase().includes(term);
      }
      return true;
    });

    return (
      <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full">
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 p-4 md:p-5 shadow-xl animate-fade-in-up">

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedGroupId(null)}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Go Back to Groups"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <FileText size={24} className="text-purple-200" />
                    Forms for {group?.name || "Group"}
                  </h1>
                  <p className="text-purple-100/90 text-sm mt-1 font-medium max-w-xl">
                    Create, configure, and manage forms specifically for this group.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[36px] w-full md:w-40">
                  <button
                    onClick={() => setFormViewMode("grid")}
                    className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${formViewMode === 'grid' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <LayoutGrid size={14} />
                    Grid
                  </button>
                  <button
                    onClick={() => setFormViewMode("list")}
                    className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${formViewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <List size={14} />
                    List
                  </button>
                </div>
                <button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center justify-center gap-2 h-[36px] px-4 bg-white text-purple-700 hover:bg-purple-50 rounded-xl text-sm font-extrabold transition-all shadow-md hover:shadow-lg w-full md:w-auto"
                >
                  {showCreateForm ? "Cancel" : <><Plus size={16} className="stroke-[3]" /> Create Form</>}
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search/Sort inside header */}
            <div className="relative z-10 mt-4 flex flex-col md:flex-row gap-3 justify-between items-center w-full">
              <div className="flex w-full md:w-auto gap-2 items-center">
                <input
                  type="text"
                  placeholder="Search forms..."
                  value={formSearchQuery}
                  onChange={(e) => setFormSearchQuery(e.target.value)}
                  className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-purple-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
                />
                <select
                  value={formStatusFilter}
                  onChange={(e) => setFormStatusFilter(e.target.value as any)}
                  className="w-full md:w-36 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-purple-800 [&>option]:text-white"
                >
                  <option value="all">All Forms</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {showCreateForm && (
            <div className="p-8 bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl mb-8 shadow-xl animate-fade-in-up">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Initialize New Form</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Form Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFormTitle}
                    onChange={(e) => setNewFormTitle(e.target.value)}
                    placeholder="e.g., Q3 Travel Reimbursement Form"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900 font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newFormDesc}
                    onChange={(e) => setNewFormDesc(e.target.value)}
                    placeholder="Brief description of what this form is for..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900 font-medium outline-none resize-y"
                  />
                </div>
                <button
                  onClick={handleCreateForm}
                  disabled={creatingForm || !newFormTitle.trim()}
                  className={`px-8 py-3 rounded-xl font-bold text-white transition-all ${
                    creatingForm || !newFormTitle.trim()
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  }`}
                >
                  {creatingForm ? "Initializing..." : "Start Building →"}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading forms...</div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
              <div className="text-6xl mb-4 opacity-50">📝</div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">No Forms Found</h2>
              <p className="text-gray-500">Create a new form to get started.</p>
            </div>
          ) : (
            <div className={formViewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group ${formViewMode === "grid" ? "border-t-4 border-t-purple-500 flex flex-col p-5 gap-3" : "border-l-4 border-l-purple-500 flex flex-row items-center justify-between p-4 gap-4"}`}
                  style={{
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #e5e7eb",
                    borderTop: formViewMode === "list" ? "1px solid #e5e7eb" : undefined,
                    borderLeft: formViewMode === "grid" ? "1px solid #e5e7eb" : undefined,
                  }}
                >
                  {formViewMode === "grid" && <div className={`absolute top-0 left-0 right-0 h-1.5 ${form.isActive ? 'bg-gradient-to-r from-purple-500 to-purple-700' : 'bg-gray-300'}`} />}
                  
                  <div className={formViewMode === "list" ? "flex-1" : ""}>
                    <h3 className="text-lg font-bold text-gray-900 mb-0.5 line-clamp-1" title={form.title}>{form.title}</h3>
                    <p className={`text-sm text-gray-500 ${formViewMode === "grid" ? "line-clamp-2 min-h-[40px]" : "line-clamp-1"} mb-2`}>{form.description || "No description provided."}</p>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Ver</span>
                        <span className="text-xs font-extrabold text-gray-700">{form.version}.0</span>
                      </div>
                      {form.isActive ? (
                        <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Inactive</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex gap-2 ${formViewMode === "grid" ? "mt-auto pt-4 border-t border-gray-100" : "shrink-0 items-center"}`}>
                    <button
                      onClick={() => handleEditForm(form.id)}
                      className={`px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg font-bold text-purple-700 text-xs transition-colors flex items-center justify-center gap-1 ${formViewMode === "grid" ? "flex-1" : ""}`}
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(form.id, form.isActive)}
                      className={`px-3 py-1.5 border rounded-lg font-bold text-xs transition-colors flex items-center justify-center ${formViewMode === "grid" ? "flex-1" : ""} ${
                        form.isActive ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {form.isActive ? "Deactivate" : "Activate"}
                    </button>
                    {formViewMode === "list" && (
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Template"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  {formViewMode === "grid" && (
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="absolute top-3 right-3 p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Template"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PHASE 1: GROUP SELECTION VIEW ────────────────────────────────────────
  
  let sortedGroups = [...groups];
  if (groupSortBy === "date-desc") sortedGroups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (groupSortBy === "date-asc") sortedGroups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (groupSortBy === "name-asc") sortedGroups.sort((a, b) => a.name.localeCompare(b.name));
  else if (groupSortBy === "name-desc") sortedGroups.sort((a, b) => b.name.localeCompare(a.name));

  const filteredGroups = sortedGroups.filter(g => {
    if (!groupSearchQuery) return true;
    const term = groupSearchQuery.toLowerCase();
    return g.name.toLowerCase().includes(term) || (g.description || "").toLowerCase().includes(term);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 p-4 md:p-5 shadow-xl animate-fade-in-up">

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <Building2 size={24} className="text-purple-200" />
                  Form Templates
                </h1>
                <p className="text-purple-100/90 text-sm mt-1 font-medium max-w-xl">
                  Select a group to manage and construct sophisticated reimbursement formats.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[36px] w-full md:w-40">
                <button
                  onClick={() => setGroupViewMode("grid")}
                  className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${groupViewMode === 'grid' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutGrid size={14} />
                  Grid
                </button>
                <button
                  onClick={() => setGroupViewMode("list")}
                  className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${groupViewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  <List size={14} />
                  List
                </button>
              </div>
              <Link href="/admin/groups" className="flex items-center justify-center gap-2 h-[36px] px-4 bg-white text-purple-700 hover:bg-purple-50 rounded-xl text-sm font-extrabold transition-all shadow-md hover:shadow-lg w-full md:w-auto">
                <Plus size={16} className="stroke-[3]" />
                Create Group
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex flex-col md:flex-row gap-3 justify-between items-center w-full">
            <div className="flex w-full md:w-auto gap-2 items-center">
              <input
                type="text"
                placeholder="Search groups..."
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-purple-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
              />
              <select
                value={groupSortBy}
                onChange={(e) => setGroupSortBy(e.target.value)}
                className="w-full md:w-36 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-purple-800 [&>option]:text-white"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-300 animate-fade-in-up">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Building2 size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Groups Found</h3>
            <p className="text-gray-500 max-w-md">Try adjusting your search criteria or create a new group.</p>
          </div>
        ) : (
          <div className={groupViewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {filteredGroups.map((group) => {
              if (groupViewMode === "list") {
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className="group/card relative rounded-2xl bg-white border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center border-l-4 border-l-purple-500"
                  >
                    <div className="flex-[3] min-w-0 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base text-gray-900 truncate" title={group.name}>{group.name}</h3>
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-0.5">
                            <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                            <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded tracking-wider border border-purple-100">
                              {group.groupId}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-[2] shrink-0 md:border-l border-gray-100 md:pl-4 min-w-0 w-full">
                      <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                        {group.description || "No description provided."}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          <Users size={12} />
                          <span className="font-bold">{group._count?.members || 1} Members</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 md:border-l border-gray-100 md:pl-4 w-full md:w-auto items-center justify-end">
                      <button className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-bold text-sm transition-colors w-full md:w-auto">
                        Manage Forms →
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden cursor-pointer group/card border border-gray-200 flex flex-col relative"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-purple-800 absolute top-0 left-0" />
                  <div className="p-5 flex flex-col border-b border-gray-100 bg-gray-50/30">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-gray-900 truncate mb-1" title={group.name}>{group.name}</h3>
                        <p className="text-xs font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md inline-block border border-purple-100">
                          ID: {group.groupId}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col bg-white flex-1 justify-between gap-4">
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {group.description || "No description provided."}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <Users size={14} className="text-gray-400" />
                        <span>{group._count?.members || 1} Members</span>
                      </div>
                      <span className="text-purple-600 font-bold text-sm group-hover/card:translate-x-1 transition-transform">
                        Manage Forms →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
