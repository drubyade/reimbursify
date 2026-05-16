"use client";

import { useState, useEffect } from "react";
import { FileCheck, Edit, CheckCircle } from "lucide-react";
import { FormInterface } from "@/components/form-interface";

interface Submission {
  id: string;
  status: string;
  submissionDate?: string;
  createdAt: string;
  formData?: string;
  reviewNotes?: string;
  template?: { id: string; title: string; version: number; templateSchema?: string };
  trip?: { id: string; title: string; expenses?: any[] };
}

export default function MyResponsesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedIdState] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftIdState] = useState<string | null>(null);
  const [filter, setFilterState] = useState<"all" | "DRAFT" | "SUBMITTED" | "SETTLED" | "needs_attestation">("all");
  const [attestationSubs, setAttestationSubs] = useState<Submission[]>([]);

  useEffect(() => {
    const savedFilter = localStorage.getItem("reimbursify_responses_filter");
    if (savedFilter) setFilterState(savedFilter as any);
    const savedExpandedId = localStorage.getItem("reimbursify_responses_expanded_id");
    if (savedExpandedId) setExpandedIdState(savedExpandedId);
    const savedDraftId = localStorage.getItem("reimbursify_responses_editing_draft_id");
    if (savedDraftId) setEditingDraftIdState(savedDraftId);

    fetchSubmissions();
  }, []);

  const setFilter = (val: "all" | "DRAFT" | "SUBMITTED" | "SETTLED" | "needs_attestation") => {
    setFilterState(val);
    localStorage.setItem("reimbursify_responses_filter", val);
    if (val === "needs_attestation") {
      fetchAttestationSubmissions();
    }
  };

  const setExpandedId = (val: string | null) => {
    setExpandedIdState(val);
    if (val) localStorage.setItem("reimbursify_responses_expanded_id", val);
    else localStorage.removeItem("reimbursify_responses_expanded_id");
  };

  const setEditingDraftId = (val: string | null) => {
    setEditingDraftIdState(val);
    if (val) localStorage.setItem("reimbursify_responses_editing_draft_id", val);
    else localStorage.removeItem("reimbursify_responses_editing_draft_id");
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttestationSubmissions = async () => {
    try {
      const res = await fetch("/api/submissions?needsAttestation=true");
      if (res.ok) {
        const data = await res.json();
        setAttestationSubs(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch attestation submissions:", err);
    }
  };

  const handleSettleForm = async (id: string) => {
    if (!confirm("Are you sure you want to mark this form as settled?")) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SETTLED" })
      });
      if (res.ok) {
        await fetchSubmissions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DRAFT": return { bg: "#f3f4f6", color: "#6b7280", label: "Draft" };
      case "SUBMITTED": return { bg: "#fef3c7", color: "#92400e", label: "Submitted" };
      case "SETTLED": return { bg: "#e0e7ff", color: "#4338ca", label: "Settled" };
      default: return { bg: "#f3f4f6", color: "#6b7280", label: status };
    }
  };

  const filtered = filter === "needs_attestation" ? attestationSubs : submissions.filter(s => filter === "all" || s.status === filter);

  const parseFormData = (fd: string | undefined) => {
    if (!fd) return null;
    try { return JSON.parse(fd); } catch { return null; }
  };

  const parseSections = (schema: string | undefined) => {
    if (!schema) return [];
    try {
      const parsed = typeof schema === "string" ? JSON.parse(schema) : schema;
      return parsed.sections || [];
    } catch { return []; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner !w-8 !h-8" />
      </div>
    );
  }

  if (editingDraftId) {
    const draft = submissions.find(s => s.id === editingDraftId);
    if (draft && draft.template) {
      return (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 h-full w-full relative">
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => { setEditingDraftId(null); fetchSubmissions(); }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              ← Back to Responses
            </button>
          </div>
          <div className="pt-16">
            <FormInterface
              tripId={draft.trip?.id || ""}
              formId={draft.template.id}
              submissionData={draft}
              onBack={() => { setEditingDraftId(null); fetchSubmissions(); }}
              onSubmit={() => { setEditingDraftId(null); fetchSubmissions(); }}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-4 right-8 w-20 h-20 bg-white/10 rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                <FileCheck size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  My Form Responses
                </h2>
                <p className="text-orange-100/90 text-sm md:text-base max-w-md font-medium">
                  Track the status and history of your submitted forms.
                </p>
              </div>
            </div>
          </div>
          {/* Filters */}
          <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 animate-fade-in-up delay-1 w-full border-t border-white/20 pt-3">
            {[
              { key: "all", label: "All" },
              { key: "DRAFT", label: "Drafts" },
              { key: "SUBMITTED", label: "Submitted" },
              { key: "SETTLED", label: "Settled" },
              { key: "needs_attestation", label: "Needs My Attestation" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex items-center justify-center px-2 py-2 rounded-lg text-xs md:text-sm transition-all flex-1 border ${
                  filter === tab.key
                    ? "bg-white text-orange-600 font-bold shadow-md border-white"
                    : "bg-transparent text-orange-100/80 border-transparent hover:bg-white/10 hover:text-white font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          </div>
        </div>

      {filtered.length === 0 ? (
        <div style={{ background: "white", padding: "4rem 2rem", borderRadius: "1rem", textAlign: "center", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Responses Yet</h3>
          <p style={{ color: "var(--text-muted)" }}>You haven't submitted any forms yet. Go to "My Groups" to fill out forms.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(sub => {
            const st = getStatusStyle(sub.status);
            const isExpanded = expandedId === sub.id;
            const formData = parseFormData(sub.formData);
            const sections = parseSections(sub.template?.templateSchema);

            return (
              <div key={sub.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex shadow-sm hover:shadow-md transition-shadow">
                <div className="w-1.5 shrink-0 bg-gradient-to-b from-orange-400 to-orange-600" />
                <div className="flex-1 flex flex-col min-w-0">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                    className={`p-2.5 md:p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                  >
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                    <h3 className="text-sm md:text-base font-bold text-gray-900 truncate" title={sub.template?.title || "Unknown Form"}>
                      {sub.template?.title || "Unknown Form"}
                    </h3>
                    <p className="text-[11px] md:text-xs text-gray-500 font-medium whitespace-nowrap">
                      Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span 
                      style={{ background: st.bg, color: st.color }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    >
                      {st.label}
                    </span>
                    <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {sub.status === "DRAFT" && (
                        <button
                          onClick={() => setEditingDraftId(sub.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-orange-600 transition-colors"
                        >
                          <Edit size={16} /> Edit Draft
                        </button>
                      )}
                      {sub.status === "SUBMITTED" && (
                        <button
                          onClick={() => handleSettleForm(sub.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
                        >
                          <CheckCircle size={16} /> Mark as Settled
                        </button>
                      )}
                    </div>

                    {sub.reviewNotes && (
                      <div style={{ padding: "0.75rem 1rem", background: "#dbeafe", borderRadius: "0.5rem", color: "#1d4ed8", fontWeight: 600, fontSize: "0.875rem", marginBottom: "1rem" }}>
                        📝 Review Notes: {sub.reviewNotes}
                      </div>
                    )}

                    {formData && sections.length > 0 ? (
                      <div>
                        {sections.map((section: any, sIdx: number) => (
                          <div key={sIdx} style={{ marginBottom: "1.5rem" }}>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "2px solid #e2e8f0" }}>
                              {section.title}
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                              {(section.fields || []).map((field: any) => {
                                const isExpenseTable = ["expense_cards_table", "accommodation_cards_table", "other_expenses_table"].includes(field.type);
                                if (isExpenseTable) {
                                  const expenseIds = formData._expenseSelections?.[field.id] || [];
                                  const attached = Array.isArray(expenseIds) && sub.trip?.expenses ? sub.trip.expenses.filter((e: any) => expenseIds.includes(e.id)) : [];
                                  return (
                                    <div key={field.id} className="col-span-1 md:col-span-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm" style={{ gridColumn: "1 / -1" }}>
                                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">{field.label}</div>
                                      {attached.length === 0 ? (
                                        <div className="text-sm text-gray-500">No expenses attached</div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {attached.map((exp: any) => (
                                            <div key={exp.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                                              <div className="truncate pr-2">
                                                <div className="text-sm font-bold text-gray-900 truncate">{exp.title} {exp.vendor ? `(${exp.vendor})` : ''}</div>
                                                <div className="text-[11px] text-gray-500">{exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString() : 'No date'}</div>
                                              </div>
                                              <div className="text-sm font-bold text-emerald-700 shrink-0">
                                                {exp.currency} {exp.amount.toFixed(2)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (field.type === "subheading") {
                                  return (
                                    <div key={field.id} className="col-span-1 md:col-span-2 pt-4 pb-2 border-b-2 border-gray-200 mt-2 mb-2" style={{ gridColumn: "1 / -1" }}>
                                      <h4 className="text-lg font-bold text-gray-900 m-0">{field.label}</h4>
                                      {field.description && <p className="text-sm text-gray-600 mt-1 mb-0">{field.description}</p>}
                                    </div>
                                  );
                                }

                                if (field.type === "text_with_fill_ins") {
                                  const parts = (field.templateText || "").split("[BLANK]");
                                  const vals = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                  return (
                                    <div key={field.id} className="col-span-1 md:col-span-2 bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm" style={{ gridColumn: "1 / -1" }}>
                                      <div className="text-base text-gray-800 leading-relaxed">
                                        {parts.map((part: string, i: number) => (
                                          <span key={i}>
                                            {part}
                                            {i < parts.length - 1 && (
                                              <strong className="mx-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded border-b-2 border-indigo-300">
                                                {vals[i] || "_____"}
                                              </strong>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={field.id} style={{ padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                                      {field.label}
                                    </div>
                                    <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>
                                      {formData[field.id] !== undefined && formData[field.id] !== "" ? (
                                        typeof formData[field.id] === "object" && formData[field.id]?.base64 ? (
                                          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200 mt-1">
                                            <div className="text-xl">📎</div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-semibold truncate" title={formData[field.id].fileName}>{formData[field.id].fileName}</div>
                                              <div className="text-xs text-gray-500">{(formData[field.id].fileSize / 1024).toFixed(1)} KB</div>
                                            </div>
                                            <a href={formData[field.id].base64} download={formData[field.id].fileName} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition-colors whitespace-nowrap">
                                              Download
                                            </a>
                                          </div>
                                        ) : typeof formData[field.id] === "boolean" ? (
                                          formData[field.id] ? "Yes" : "No"
                                        ) : (
                                          String(formData[field.id])
                                        )
                                      ) : "—"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : formData ? (
                      <div>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Response Data</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          {Object.entries(formData).filter(([k]) => !k.startsWith("_")).map(([key, val]) => (
                            <div key={key} style={{ padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>{key}</div>
                              <div style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                {val !== undefined && val !== "" ? (
                                  typeof val === "object" && val !== null && (val as any).base64 ? (
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200 mt-1">
                                      <div className="text-xl">📎</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate" title={(val as any).fileName}>{(val as any).fileName}</div>
                                        <div className="text-xs text-gray-500">{((val as any).fileSize / 1024).toFixed(1)} KB</div>
                                      </div>
                                      <a href={(val as any).base64} download={(val as any).fileName} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition-colors whitespace-nowrap">
                                        Download
                                      </a>
                                    </div>
                                  ) : typeof val === "boolean" ? (
                                    val ? "Yes" : "No"
                                  ) : (
                                    String(val)
                                  )
                                ) : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No form data available.</p>
                    )}
                  </div>
                )}
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
