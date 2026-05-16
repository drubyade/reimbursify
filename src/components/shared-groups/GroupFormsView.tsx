"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { FormInterface } from "@/components/form-interface";
import { OfflineGuard } from "@/components/OfflineGuard";
import { ArrowLeft, MessageSquare, FileText, ClipboardList, Sparkles, Users, Building2, LayoutGrid, List } from "lucide-react";

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  templateSchema?: string;
  isActive: boolean;
  version: number;
}

interface GroupInfo {
  id: string;
  name: string;
  groupId: string;
  description: string | null;
}

export function GroupFormsView({ groupId, baseRoute = "/groups" }: { groupId: string, baseRoute?: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    const savedFormId = sessionStorage.getItem(`reimbursify_active_form_${groupId}`);
    if (savedFormId) setSelectedFormId(savedFormId);
  }, [groupId]);

  const handleSelectForm = (id: string | null) => {
    setSelectedFormId(id);
    if (id) {
      sessionStorage.setItem(`reimbursify_active_form_${groupId}`, id);
    } else {
      sessionStorage.removeItem(`reimbursify_active_form_${groupId}`);
    }
  };

  useEffect(() => {
    const savedViewMode = localStorage.getItem("reimbursify_group_forms_view_mode");
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }
    fetchGroupForms();
  }, [groupId]);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("reimbursify_group_forms_view_mode", mode);
  };

  const handleOpenMessages = () => {
    router.push(`${baseRoute}/${groupId}/messages`);
  };

  const fetchGroupForms = async () => {
    try {
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (!groupRes.ok) {
        setError("Group not found or you don't have access.");
        setLoading(false);
        return;
      }
      const groupData = await groupRes.json();
      setGroup(groupData.group);

      const formsRes = await fetch(`/api/forms?active=true&groupId=${groupId}`);
      if (formsRes.ok) {
        const formsData = await formsRes.json();
        setForms(formsData.forms || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load group data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-gray-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner !w-8 !h-8 border-4 border-[var(--primary)]" />
          <span className="text-sm font-medium text-gray-400">Loading group...</span>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-gray-50/50">
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-red-600 font-bold text-lg mb-2">Access Error</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[#023e8a] transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  if (selectedFormId) {
    return (
      <FormInterface
        tripId=""
        formId={selectedFormId}
        onBack={() => {
          handleSelectForm(null);
          setSuccess(null);
        }}
        onSubmit={() => {
          handleSelectForm(null);
          setSuccess("Form submitted successfully!");
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full relative">
      


      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[#1a5c3a] to-[#0f4c2f] p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Left Side: Back Button + Info */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all backdrop-blur-sm border border-white/10 shrink-0"
                title="Back to Groups"
              >
                <ArrowLeft size={18} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 shadow-lg hidden sm:flex">
                  <Building2 size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                    {group?.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="px-2 py-0.5 rounded flex items-center gap-1 bg-white/10 border border-white/20 text-white/90 text-[10px] font-bold uppercase tracking-wider">
                      {group?.groupId}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/70 text-[11px] font-medium">
                      <FileText size={12} />
                      {forms.length} active {forms.length === 1 ? "form" : "forms"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
              {/* View Toggle */}
              {forms.length > 0 && (
                <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[40px] w-full md:w-auto">
                  <button
                    onClick={() => handleViewModeChange("grid")}
                    className={`flex-1 md:w-20 flex justify-center items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all h-full ${viewMode === 'grid' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <LayoutGrid size={14} />
                    Grid
                  </button>
                  <button
                    onClick={() => handleViewModeChange("list")}
                    className={`flex-1 md:w-20 flex justify-center items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all h-full ${viewMode === 'list' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <List size={14} />
                    List
                  </button>
                </div>
              )}

              {/* Messages Button */}
              <button
                onClick={handleOpenMessages}
                className="flex items-center justify-center gap-2 px-5 py-2 h-[40px] bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-bold shadow-[0_4px_15px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)] hover:-translate-y-0.5 transition-all border-none shrink-0"
              >
                <MessageSquare size={16} />
                <span className="hidden sm:inline">Open</span> Messages
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Success / Error Alerts */}
        {success && (
          <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-sm animate-fade-in-up">
            <span className="text-lg">✅</span>
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-semibold text-sm animate-fade-in-up">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}


        {/* Content Area */}
        {forms.length === 0 ? (
          <div className="animate-fade-in-up delay-2 bg-white rounded-2xl p-16 text-center border-2 border-dashed border-[var(--primary-lighter)]">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mb-6">
              <FileText size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">No Active Forms</h2>
            <p className="text-gray-500 mb-2 max-w-md mx-auto text-base leading-relaxed">
              There are no active forms in this group yet. Forms will appear here once an administrator publishes them.
            </p>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'grid-cols-1 gap-2.5'} animate-fade-in-up delay-2`}>
            {forms.map((form, idx) => {
              const parsedDesc = (() => {
                if (form.description) return form.description;
                try {
                  const s = JSON.parse(form.templateSchema || "{}");
                  if (s.description) return s.description;
                } catch(e) {}
                return "No description provided.";
              })();
              
              return (
              <div
                key={form.id}
                onClick={() => handleSelectForm(form.id)}
                className={`group relative bg-white rounded-2xl border border-gray-200 hover:border-[var(--primary-lighter)] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in-up delay-${Math.min(idx + 2, 5)} ${viewMode === 'list' ? 'flex flex-row items-stretch' : 'flex flex-col'}`}
              >
                {/* Accent strip */}
                <div className={`bg-gradient-to-r from-[var(--primary)] to-emerald-400 ${viewMode === 'list' ? 'w-1.5 h-auto bg-gradient-to-b' : 'h-1.5 w-full'}`} />

                <div className={`p-2 md:p-2.5 flex-1 flex ${viewMode === 'list' ? 'flex-row items-center gap-2.5' : 'flex-col'}`}>
                  {/* Icon + Title */}
                  <div className={`flex items-center gap-2.5 ${viewMode === 'list' ? 'flex-[1.5] min-w-0 mb-0' : 'mb-3'}`}>
                    <div className={`${viewMode === 'list' ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-gradient-to-br from-[var(--primary)] to-emerald-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                      <FileText size={viewMode === 'list' ? 18 : 22} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`${viewMode === 'list' ? 'text-base' : 'text-lg'} font-bold text-gray-900 truncate group-hover:text-[var(--primary)] transition-colors`}>
                        {form.title}
                      </h3>
                      {viewMode === 'grid' && (
                        <p className="text-[10px] uppercase font-bold text-[var(--primary)] tracking-wider mt-0.5">Form Template</p>
                      )}
                    </div>
                  </div>

                  {/* Description area */}
                  <div className={`border-gray-100 ${viewMode === 'list' ? 'pl-2.5 border-l flex-[2] min-w-[200px]' : 'pt-3 border-t mt-auto'}`}>
                    <p className={`text-[11px] md:text-xs text-gray-600 leading-relaxed ${viewMode === 'grid' ? 'line-clamp-3' : 'line-clamp-2'}`}>
                      {parsedDesc}
                    </p>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
