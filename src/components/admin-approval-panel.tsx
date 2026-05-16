"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, LayoutGrid, List, Search, FileText, Send, ListFilter } from "lucide-react";
import { FormInterface } from "./form-interface";

interface Submission {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "SETTLED";
  submissionDate?: string;
  template?: { id: string; version: number; templateSchema?: any };
  user?: { id: string; email: string; name: string };
  trip?: { id: string; title: string };
  createdAt: string;
  signatures?: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  paymentDate: string;
}

export const AdminApprovalPanel: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "needs_attestation">("all");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [signatureStatuses, setSignatureStatuses] = useState<Record<string, Record<string, boolean>>>({});
  const [fullSubmissions, setFullSubmissions] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      if (filter === "needs_attestation") {
        const res = await fetch("/api/submissions?needsAttestation=true");
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } else {
        const url = new URL("/api/submissions", window.location.href);
        if (filter === "pending") {
          url.searchParams.set("status", "SUBMITTED");
        } else if (filter === "reviewed") {
          url.searchParams.set("status", "REVIEWED");
        }

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionExpenses = async (submissionId: string, tripId?: string) => {
    if (!tripId || expenses[submissionId]) return;

    try {
      const res = await fetch(`/api/expenses?tripId=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses((prev) => ({
          ...prev,
          [submissionId]: data.expenses || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const fetchSubmissionDetails = async (submissionId: string) => {
    if (fullSubmissions[submissionId]) return;
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        setFullSubmissions((prev) => ({
          ...prev,
          [submissionId]: data.submission,
        }));
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
    }
  };

  const handleMarkReviewed = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REVIEWED",
          reviewNotes: reviewNotes[submissionId] || "Marked as reviewed",
        }),
      });

      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId
              ? { ...sub, status: "REVIEWED" }
              : sub
          )
        );
        if (filter === "pending") {
          fetchSubmissions();
        }
      }
    } catch (error) {
      console.error("Error marking as reviewed:", error);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return { bg: "#fef3c7", color: "#92400e", icon: "◆", label: "Submitted" };
      case "REVIEWED":
        return { bg: "#dcfce7", color: "#16a34a", icon: "✓", label: "Reviewed" };
      default:
        return { bg: "#f3f4f6", color: "#6b7280", icon: "•", label: status };
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    let matchesFilter = true;
    if (filter === "pending") matchesFilter = sub.status === "SUBMITTED";
    else if (filter === "reviewed") matchesFilter = sub.status === "REVIEWED";

    if (!matchesFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const tripTitle = (sub.trip?.title || "").toLowerCase();
      const userName = (sub.user?.name || "").toLowerCase();
      const userEmail = (sub.user?.email || "").toLowerCase();
      return tripTitle.includes(term) || userName.includes(term) || userEmail.includes(term);
    }
    return true;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (sortBy === "date-desc") return dateB - dateA;
    if (sortBy === "date-asc") return dateA - dateB;
    const nameA = (a.user?.name || "").toLowerCase();
    const nameB = (b.user?.name || "").toLowerCase();
    if (sortBy === "name-asc") return nameA.localeCompare(nameB);
    if (sortBy === "name-desc") return nameB.localeCompare(nameA);
    return 0;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Sticky Wrapper to fix scroll overlap */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-4 md:p-5 shadow-xl animate-fade-in-up">

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-0.5">
                    Submission Management
                  </h2>
                  <p className="text-teal-100/90 text-sm max-w-md font-medium">
                    Review and manage all trip form submissions.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[36px] w-full md:w-40">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${viewMode === 'grid' ? 'bg-white text-teal-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <LayoutGrid size={14} />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex-1 flex justify-center items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-all h-full ${viewMode === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <List size={14} />
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search/Sort */}
            <div className="relative z-10 mt-4 flex flex-col md:flex-row gap-3 justify-between items-center w-full">
              <div className="flex w-full md:w-auto gap-2">
                {[
                  { id: "all", label: "All", icon: ListFilter },
                  { id: "pending", label: "Submitted", icon: Send },
                  { id: "reviewed", label: "Reviewed", icon: CheckCircle },
                  { id: "needs_attestation", label: "Needs My Attestation", icon: AlertCircle }
                ].map(f => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all flex-1 md:w-[110px] justify-center border ${
                        filter === f.id 
                          ? "bg-white text-teal-700 font-bold shadow-md border-white" 
                          : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:text-white font-medium"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex w-full md:w-auto gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Search by title, name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-teal-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
                />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full md:w-36 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-teal-800 [&>option]:text-white"
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

      {/* Submissions List */}
      {sortedSubmissions.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: "0.75rem",
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <Clock size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>No submissions found for this filter.</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {sortedSubmissions.map((submission) => {
            const statusColor = getStatusColor(submission.status);
            const isExpanded = expandedSubmissionId === submission.id;

            return (
              <div
                key={submission.id}
                className={`${viewMode === "grid" ? "border-t-4 border-t-teal-500" : "border-l-4 border-l-teal-500"}`}
                style={{
                  background: "white",
                  borderRight: "1px solid #e5e7eb",
                  borderBottom: "1px solid #e5e7eb",
                  borderTop: viewMode === "list" ? "1px solid #e5e7eb" : undefined,
                  borderLeft: viewMode === "grid" ? "1px solid #e5e7eb" : undefined,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  onClick={() => {
                    setExpandedSubmissionId(isExpanded ? null : submission.id);
                    if (!isExpanded) {
                      fetchSubmissionExpenses(submission.id, submission.trip?.id);
                      fetchSubmissionDetails(submission.id);
                    }
                  }}
                  style={{
                    padding: "1rem",
                    background: isExpanded ? "#f9fafb" : "white",
                    borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: statusColor.bg,
                      color: statusColor.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {statusColor.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: 0 }}>
                      {submission.trip?.title || "Unknown Trip"}
                    </h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Submitted by {submission.user?.name || submission.user?.email}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: statusColor.bg,
                          color: statusColor.color,
                        }}
                      >
                        {getStatusColor(submission.status).label}
                      </span>
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {submission.createdAt
                          ? new Date(submission.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "1.5rem",
                      borderTop: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    {/* Submission Info */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                        Submission Details
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>ID</p>
                          <p
                            style={{
                              margin: "0.25rem 0 0",
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              wordBreak: "break-all",
                            }}
                          >
                            {submission.id}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>Submitted</p>
                          <p style={{ margin: "0.25rem 0 0" }}>
                            {submission.createdAt
                              ? new Date(submission.createdAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>Form Version</p>
                          <p style={{ margin: "0.25rem 0 0" }}>
                            {submission.template?.version ? `v${submission.template.version}` : "v1"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filled Form Details */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      {fullSubmissions[submission.id] ? (
                        (() => {
                          const sub = fullSubmissions[submission.id];
                          const formData = typeof sub.formData === "string" ? JSON.parse(sub.formData) : sub.formData;
                          
                          let sections = [];
                          if (sub.template?.templateSchema) {
                            try {
                              const parsedSchema = typeof sub.template.templateSchema === 'string' ? JSON.parse(sub.template.templateSchema) : sub.template.templateSchema;
                              sections = parsedSchema.sections || [];
                            } catch (e) {
                              console.error("Failed to parse template schema", e);
                            }
                          }

                          return formData && sections.length > 0 ? (
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
                                        const parts = (field.templateText || "").split("___");
                                        const vals = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                        return (
                                          <div key={field.id} className="col-span-1 md:col-span-2 bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm" style={{ gridColumn: "1 / -1", marginLeft: `${(field.indentation || 0) * 1.5}rem` }}>
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
                          );
                        })()
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading form details...</p>
                      )}
                    </div>

                    {/* Expenses */}
                    {expenses[submission.id]?.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                          Trip Expenses ({expenses[submission.id].length})
                        </h4>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.875rem",
                          }}
                        >
                          <thead>
                            <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                              <th style={{ padding: "0.5rem", textAlign: "left", fontWeight: "600" }}>Description</th>
                              <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>Amount</th>
                              <th style={{ padding: "0.5rem", textAlign: "left", fontWeight: "600" }}>Category</th>
                              <th style={{ padding: "0.5rem", textAlign: "center", fontWeight: "600" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses[submission.id].map((exp) => (
                              <tr key={exp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "0.5rem" }}>{exp.title}</td>
                                <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>
                                  ₹{exp.amount?.toLocaleString()}
                                </td>
                                <td style={{ padding: "0.5rem" }}>{exp.category}</td>
                                <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "0.25rem",
                                      fontSize: "0.75rem",
                                      fontWeight: "600",
                                      background:
                                        exp.status === "APPROVED"
                                          ? "#dcfce7"
                                          : exp.status === "SUBMITTED"
                                          ? "#dbeafe"
                                          : "#fef3c7",
                                      color:
                                        exp.status === "APPROVED"
                                          ? "#16a34a"
                                          : exp.status === "SUBMITTED"
                                          ? "#0369a1"
                                          : "#92400e",
                                    }}
                                  >
                                    {exp.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Review Action */}
                    {submission.status === "SUBMITTED" && (
                      <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                          Review Notes (Optional)
                        </h4>
                        <textarea
                          value={reviewNotes[submission.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [submission.id]: e.target.value,
                            }))
                          }
                          placeholder="Add personal review notes..."
                          rows={2}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            marginBottom: "1rem",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          onClick={() => handleMarkReviewed(submission.id)}
                          style={{
                            padding: "0.75rem 1.5rem",
                            background: "#dbeafe",
                            border: "1px solid #93c5fd",
                            color: "#1d4ed8",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <CheckCircle size={18} />
                          Mark as Reviewed
                        </button>
                      </div>
                    )}
                    {submission.status === "REVIEWED" && (
                      <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", borderRadius: "0.5rem", color: "#16a34a", fontWeight: 600, fontSize: "0.9rem", flex: 1 }}>
                          ✓ Reviewed
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
