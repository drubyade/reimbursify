"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Send, ChevronLeft, AlertCircle, CheckCircle } from "lucide-react";
import {
  getCachedForm,
  cacheForms,
  getCachedExpensesByTrip,
  cacheExpenses,
  cacheSingleSubmission,
} from "@/lib/offline-db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  templateSchema?: { sections: any[]; metadata?: any };
  fields?: any[];
  version: number;
}

interface TripBasic {
  id: string;
  title: string;
  startDate?: string;
}

interface FullExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  expenseType: string;
  category: string;
  paymentDate: string;
  vendor?: string;
  billNumber?: string;
  numDays?: number;
  description?: string;
  metadata: Record<string, any>;
  status: string;
}

interface FormInterfaceProps {
  tripId: string;
  formId: string;
  trip?: { id: string; title: string; expenses: any[] };
  onSubmit?: (data: any) => void;
  onBack?: () => void;
  submissionData?: any; // If provided, renders in read-only mode for viewing/printing
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TABLE_TYPES = [
  "expense_cards_table",
  "accommodation_cards_table",
  "other_expenses_table",
];
const TRAVEL_TYPES = ["AIRWAYS", "TRAIN", "TAXI", "BUS", "OWN_CAR"];
const LODGING_TYPES = ["LODGING", "GUEST_HOUSE"];

// ─── Table style helpers ──────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  textAlign: "left",
  fontWeight: "700",
  fontSize: "0.77rem",
  color: "#166534",
  borderBottom: "2px solid #bbf7d0",
  whiteSpace: "nowrap",
  background: "#f0fdf4",
};
const TD: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  fontSize: "0.84rem",
  color: "#374151",
  verticalAlign: "middle",
  borderBottom: "1px solid #f3f4f6",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FormInterface: React.FC<FormInterfaceProps> = ({
  tripId,
  formId,
  trip,
  onSubmit,
  onBack,
  submissionData,
}) => {
  const { data: session } = useSession();

  // Form core state
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Expense-linking state
  const [userTrips, setUserTrips] = useState<TripBasic[]>([]);
  const [activeExpenseTripId, setActiveExpenseTripId] = useState<string>(tripId || "");
  const [tripExpenses, setTripExpenses] = useState<FullExpense[]>([]);
  const [expenseSelections, setExpenseSelections] = useState<Record<string, string[]>>({});
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Profile auto-fill
  const [userProfile, setUserProfile] = useState<Record<string, any>>({});
  const [autoFilled, setAutoFilled] = useState(false);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const isDraft = submissionData?.status === "DRAFT";
  const isReadOnly = submissionData && !isDraft;

  const formHasExpenseTables = (f: FormTemplate | null): boolean => {
    if (!f?.templateSchema?.sections) return false;
    return f.templateSchema.sections.some((s: any) =>
      s.fields?.some((field: any) => EXPENSE_TABLE_TYPES.includes(field.type))
    );
  };

  // ─── Fetch form ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (submissionData) {
      // Read-only mode
      let template = { ...submissionData.template };
      if (template && typeof template.templateSchema === "string") {
        try { template.templateSchema = JSON.parse(template.templateSchema); }
        catch (e) { console.error("Failed to parse templateSchema:", e); }
      }
      setForm(template);
      if (submissionData.formData) {
        try {
          const parsed = JSON.parse(submissionData.formData);
          setFormData(parsed);
          if (parsed._expenseSelections) setExpenseSelections(parsed._expenseSelections);
        } catch (e) { console.error(e); }
      }
      setActiveExpenseTripId(submissionData.tripId);
      // Fetch trip expenses for this specific trip
      fetchTripExpenses(submissionData.tripId);
      setLoading(false);
      return;
    }
    fetchForm();
  }, [formId, submissionData]);

  const fetchForm = async () => {
    // ── Serve cached form immediately ───────────────────────────────────
    try {
      const cached = await getCachedForm(formId);
      if (cached) {
        let template = { ...cached };
        if (template.templateSchema && typeof template.templateSchema === "string") {
          try { template.templateSchema = JSON.parse(template.templateSchema); } catch (_) {}
        }
        setForm(template);
        const init: Record<string, any> = {};
        template?.templateSchema?.sections?.forEach((s: any) =>
          s.fields?.forEach((f: any) => { init[f.id] = ""; })
        );
        const savedProgress = sessionStorage.getItem(`reimbursify_form_progress_${formId}`);
        if (savedProgress && !submissionData) {
          try {
            const parsed = JSON.parse(savedProgress);
            setFormData(parsed.formData || init);
            if (parsed.expenseSelections) setExpenseSelections(parsed.expenseSelections);
          } catch (e) { setFormData(init); }
        } else {
          setFormData(init);
        }
        setLoading(false);
      }
    } catch (_) {}

    // ── Then fetch fresh from network ──────────────────────────────────
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) throw new Error("Failed to fetch form");
      const data = await res.json();
      if (data.form && typeof data.form.templateSchema === "string") {
        try { data.form.templateSchema = JSON.parse(data.form.templateSchema); }
        catch (e) { console.error("Failed to parse templateSchema:", e); }
      }
      setForm(data.form);
      // Cache it
      cacheForms([data.form]).catch(() => {});
      const init: Record<string, any> = {};
      data.form?.templateSchema?.sections?.forEach((s: any) =>
        s.fields?.forEach((f: any) => { init[f.id] = ""; })
      );
      const savedProgress = sessionStorage.getItem(`reimbursify_form_progress_${formId}`);
      if (savedProgress && !submissionData) {
        try {
          const parsed = JSON.parse(savedProgress);
          setFormData(parsed.formData || init);
          if (parsed.expenseSelections) setExpenseSelections(parsed.expenseSelections);
        } catch (e) { setFormData(init); }
      } else {
        setFormData(init);
      }
      setError(null);
    } catch (err) {
      // Only show error if we truly have no form to display
      if (!form) setError("Failed to load form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── After form loads: fetch profile + trips if needed ─────────────────────

  useEffect(() => {
    if (!form) return;
    if (!submissionData) {
      fetchUserProfile();
    }
    if (formHasExpenseTables(form)) {
      if (tripId && !isDraft) {
        setActiveExpenseTripId(tripId);
      } else if (!isReadOnly) {
        fetchUserTrips();
      }
    }
  }, [form, submissionData, tripId, isDraft, isReadOnly]);

  // ─── When trip selected → fetch its expenses ───────────────────────────────

  useEffect(() => {
    if (activeExpenseTripId) fetchTripExpenses(activeExpenseTripId);
  }, [activeExpenseTripId]);

  // ─── Auto-fill form from profile ───────────────────────────────────────────

  useEffect(() => {
    if (!userProfile || !form?.templateSchema?.sections || autoFilled) return;
    const map: Record<string, string> = {
      "name":                              userProfile.name  || session?.user?.name || "",
      "emp. code":                         userProfile.empCode      || "",
      "employee code":                     userProfile.empCode      || "",
      "emp code":                          userProfile.empCode      || "",
      "pay level":                         userProfile.gradeLvl     || "",
      "grade level":                       userProfile.gradeLvl     || "",
      "designation":                       userProfile.designation  || "",
      "department":                        userProfile.department   || "",
      "bank account no. (sbi/any other)":  userProfile.bankAccount  || "",
      "bank account no.":                  userProfile.bankAccount  || "",
      "bank account":                      userProfile.bankAccount  || "",
      "ifsc code":                         userProfile.ifscCode     || "",
    };
    const fills: Record<string, string> = {};
    form.templateSchema.sections.forEach((s: any) => {
      s.fields?.forEach((f: any) => {
        const key = (f.label || "").toLowerCase().trim();
        if (map[key] && map[key] !== "") fills[f.id] = map[key];
      });
    });
    if (Object.keys(fills).length > 0) {
      setFormData(prev => ({ ...prev, ...fills }));
      setAutoFilled(true);
    }
  }, [userProfile, form]);

  // ─── Persist to sessionStorage ───────────────────────────────────────────────

  useEffect(() => {
    if (!isReadOnly && formId && !loading && Object.keys(formData).length > 0) {
      sessionStorage.setItem(`reimbursify_form_progress_${formId}`, JSON.stringify({
        formData,
        expenseSelections
      }));
    }
  }, [formData, expenseSelections, formId, isReadOnly, loading]);

  // ─── API helpers ───────────────────────────────────────────────────────────

  const fetchUserTrips = async () => {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) { const d = await res.json(); setUserTrips(d.trips || []); }
    } catch (e) { console.error(e); }
    finally { setLoadingTrips(false); }
  };

  const handleTripChange = (newTripId: string) => {
    const hasSelections = Object.values(expenseSelections).some(arr => arr.length > 0);
    if (hasSelections) {
      if (!window.confirm("Warning: Already checked expense data in current form state will be lost. Do you want to proceed?")) {
        return;
      }
      setExpenseSelections({});
    }
    setActiveExpenseTripId(newTripId);
    if (newTripId) {
      fetchTripExpenses(newTripId);
    } else {
      setTripExpenses([]);
    }
  };

  const handleDiscardChanges = () => {
    if (!window.confirm("Are you sure you want to discard your unsaved changes? The form will revert to its last saved state.")) {
      return;
    }
    if (submissionData && submissionData.formData) {
      try {
        const parsed = JSON.parse(submissionData.formData);
        setFormData(parsed);
        if (parsed._expenseSelections) setExpenseSelections(parsed._expenseSelections);
        else setExpenseSelections({});
      } catch (e) { console.error(e); }
    }
    if (submissionData?.tripId) {
      setActiveExpenseTripId(submissionData.tripId);
      fetchTripExpenses(submissionData.tripId);
    }
  };

  const fetchTripExpenses = async (id: string) => {
    setLoadingExpenses(true);

    // ── Serve cached expenses immediately ───────────────────────────────
    try {
      const cached = await getCachedExpensesByTrip(id);
      if (cached.length > 0) {
        setTripExpenses(cached.map((e: any) => ({
          ...e,
          metadata: (() => {
            try {
              let p = typeof e.metadata === "string" ? JSON.parse(e.metadata) : (e.metadata || {});
              if (typeof p === "string") p = JSON.parse(p);
              return typeof p === "object" && p !== null ? p : {};
            } catch { return {}; }
          })(),
        })) as FullExpense[]);
        setLoadingExpenses(false);
      }
    } catch (_) {}

    // ── Refresh from network ──────────────────────────────────────────
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (res.ok) {
        const d = await res.json();
        const rawExpenses = d.trip?.expenses || d.expenses || [];
        const exps: FullExpense[] = rawExpenses.map((e: any) => ({
          ...e,
          metadata: (() => {
            try {
              let parsed = typeof e.metadata === "string" ? JSON.parse(e.metadata) : (e.metadata || {});
              if (typeof parsed === "string") parsed = JSON.parse(parsed);
              return typeof parsed === "object" && parsed !== null ? parsed : {};
            }
            catch { return {}; }
          })(),
        }));
        setTripExpenses(exps);
        // Cache them
        cacheExpenses(exps.map((e) => ({ ...e, tripId: id }))).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoadingExpenses(false); }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) { const d = await res.json(); setUserProfile(d.user || d || {}); }
    } catch (_) {}
  };

  // ─── Expense selection toggle ──────────────────────────────────────────────

  const toggleExpense = (fieldId: string, expenseId: string) => {
    if (submissionData && submissionData.status !== "DRAFT") return;
    setExpenseSelections(prev => {
      const cur = prev[fieldId] || [];
      return {
        ...prev,
        [fieldId]: cur.includes(expenseId)
          ? cur.filter(id => id !== expenseId)
          : [...cur, expenseId],
      };
    });
  };

  // ─── General field change ──────────────────────────────────────────────────

  const handleFieldChange = (fieldId: string, value: any) => {
    if (submissionData && submissionData.status !== "DRAFT") return;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // ─── Validate ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    if (!form) return false;
    const sections = form.templateSchema?.sections || [{ fields: form.fields || [] }];
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (!field.required) continue;
        if (field.type === "signature_authority") continue; // Manager fills this
        if (EXPENSE_TABLE_TYPES.includes(field.type)) {
          if ((expenseSelections[field.id] || []).length === 0) {
            setError(`"${field.label}" requires at least one selected expense`);
            return false;
          }
        } else if (!formData[field.id]) {
          setError(`"${field.label}" is required`);
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  const isFormValid = (): boolean => {
    if (!form) return false;
    const sections = form.templateSchema?.sections || [{ fields: form.fields || [] }];
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (!field.required) continue;
        if (field.type === "signature_authority") continue;
        if (EXPENSE_TABLE_TYPES.includes(field.type)) {
          if ((expenseSelections[field.id] || []).length === 0) return false;
        } else if (!formData[field.id]) {
          return false;
        }
      }
    }
    return true;
  };

  // ─── PDF generation ────────────────────────────────────────────────────────

  const generatePDF = async () => {
    if (!formRef.current || !form) return;
    try {
      const canvas = await html2canvas(formRef.current, { scale: 2, logging: false, backgroundColor: "#ffffff" });
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      let left = imgH, pos = 0;
      const img = canvas.toDataURL("image/png");
      while (left >= 0) {
        pdf.addImage(img, "PNG", 0, pos, imgW, imgH);
        left -= 297; pos -= 297;
        if (left > 0) pdf.addPage();
      }
      pdf.save(`${form.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) { setError("Failed to generate PDF"); }
  };

  const handleBack = () => {
    if (formId) sessionStorage.removeItem(`reimbursify_form_progress_${formId}`);
    if (onBack) onBack();
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const finalTripId = activeExpenseTripId || tripId || undefined;
      const isDraftUpdate = submissionData && submissionData.status === "DRAFT";
      const url = isDraftUpdate ? `/api/submissions/${submissionData.id}` : "/api/submissions";
      const method = isDraftUpdate ? "PATCH" : "POST";
      
      const subRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId: finalTripId,
          status: "SUBMITTED",
          submissionDate: new Date(),
          formData,
          expenseSelections,
        }),
      });
      if (!subRes.ok) throw new Error("Failed to create submission");
      const sub = await subRes.json();

      // Upload PDF snapshot
      if (formRef.current && form) {
        const canvas = await html2canvas(formRef.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgW = 210, imgH = (canvas.height * imgW) / canvas.width;
        const pdf = new jsPDF("p", "mm", "a4");
        let left = imgH, pos = 0;
        const img = canvas.toDataURL("image/png");
        while (left >= 0) { pdf.addImage(img, "PNG", 0, pos, imgW, imgH); left -= 297; pos -= 297; if (left > 0) pdf.addPage(); }
        const blob = pdf.output("blob");
        const fd = new FormData();
        fd.append("file", blob, `${form.title}_${Date.now()}.pdf`);
        await fetch(`/api/submissions/${sub.submission.id}/files`, { method: "POST", body: fd });
      }

      setSuccess(true);
      // Cache the submission locally
      cacheSingleSubmission(sub.submission).catch(() => {});
      if (onSubmit) {
        if (formId) sessionStorage.removeItem(`reimbursify_form_progress_${formId}`);
        onSubmit(sub.submission);
      }
      setTimeout(() => { if (onBack) onBack(); }, 2000);
    } catch (err) {
      setError("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    setSubmitting(true);
    try {
      const finalTripId = activeExpenseTripId || tripId || undefined;
      const isDraftUpdate = submissionData && submissionData.status === "DRAFT";
      const url = isDraftUpdate ? `/api/submissions/${submissionData.id}` : "/api/submissions";
      const method = isDraftUpdate ? "PATCH" : "POST";

      const subRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId: finalTripId,
          status: "DRAFT",
          submissionDate: new Date(),
          formData,
          expenseSelections,
        }),
      });
      if (!subRes.ok) throw new Error("Failed to create draft");
      const sub = await subRes.json();

      setSuccess(true);
      alert("Draft saved successfully! You can find it in the My Reimbursements tab.");
      if (onSubmit) {
        if (formId) sessionStorage.removeItem(`reimbursify_form_progress_${formId}`);
        onSubmit(sub.submission);
      }
      setTimeout(() => { if (onBack) onBack(); }, 2000);
    } catch (err) {
      setError("Failed to save draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Trip selector banner ──────────────────────────────────────────────────

  const renderTripSelector = () => {
    if (!form || !formHasExpenseTables(form)) return null;
    if (submissionData && submissionData.status !== "DRAFT") return null; // Don't show trip selection banner in read-only mode, tables handle it
    
    const linkedTitle =
      userTrips.find(t => t.id === activeExpenseTripId)?.title ||
      trip?.title ||
      null;

    return (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-5 md:p-6 mb-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-inner">
            <span className="text-xl">✈️</span>
          </div>
          <div>
            <h3 className="m-0 text-base font-extrabold text-emerald-900">
              Link Trip Expenses
            </h3>
            <p className="m-0 text-sm text-emerald-600 font-medium">
              Choose a trip to import your saved expense cards into the table fields below
            </p>
          </div>
        </div>

        {isReadOnly || (tripId && !isDraft) ? (
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm bg-emerald-100/50 px-3 py-2 rounded-lg w-fit">
            <CheckCircle size={16} className="text-emerald-600" />
            Using expenses from trip: <span className="text-emerald-900">{trip?.title || tripId}</span>
            {loadingExpenses && <span className="text-emerald-500 font-medium ml-2">⏳ Loading expenses…</span>}
          </div>
        ) : loadingTrips ? (
          <p className="m-0 text-emerald-600 text-sm font-medium">⏳ Loading your trips…</p>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={activeExpenseTripId}
              onChange={e => handleTripChange(e.target.value)}
              className="flex-1 min-w-[280px] max-w-[420px] px-4 py-2.5 border border-emerald-300 rounded-xl text-sm bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
            >
              <option value="">— Select a Trip —</option>
              {userTrips.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {activeExpenseTripId && (
              <span className="text-emerald-700 font-bold text-sm bg-emerald-100/50 px-3 py-2 rounded-lg">
                {loadingExpenses
                  ? "⏳ Loading expenses…"
                  : `✓ ${tripExpenses.length} expense(s) loaded`}
              </span>
            )}
          </div>
        )}

        {linkedTitle && !loadingExpenses && tripExpenses.length > 0 && (
          <div className="flex gap-4 flex-wrap text-[13px] text-emerald-700 font-medium mt-1 bg-white/60 px-4 py-2.5 rounded-xl border border-emerald-100">
            <span className="flex items-center gap-1.5"><span className="opacity-80">✈️ Travel:</span> <span className="font-bold text-emerald-900 bg-emerald-100 px-1.5 rounded">{tripExpenses.filter(e => e.category === "Travel" || TRAVEL_TYPES.includes(e.expenseType)).length}</span></span>
            <span className="flex items-center gap-1.5"><span className="opacity-80">🏨 Lodging:</span> <span className="font-bold text-emerald-900 bg-emerald-100 px-1.5 rounded">{tripExpenses.filter(e => e.category === "Accommodation" || LODGING_TYPES.includes(e.expenseType)).length}</span></span>
            <span className="flex items-center gap-1.5"><span className="opacity-80">🧾 Other:</span> <span className="font-bold text-emerald-900 bg-emerald-100 px-1.5 rounded">{tripExpenses.filter(e => (e.category !== "Travel" && !TRAVEL_TYPES.includes(e.expenseType)) && (e.category !== "Accommodation" && !LODGING_TYPES.includes(e.expenseType))).length}</span></span>
          </div>
        )}
      </div>
    );
  };

  // ─── Expense table: Travel (Section 12) ───────────────────────────────────

  const renderTravelTable = (field: any) => {
    const expenses = tripExpenses.filter(e => e.category === "Travel" || TRAVEL_TYPES.includes(e.expenseType));
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden", minWidth: "950px" }}>
          <thead>
            <tr>
              {["", "Date", "Dep. Time", "From", "Arr. Date", "Arr. Time", "To", "Dist. (km)", "Class", "Ticket / PNR No.", "Fare (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 10 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No travel expenses (Air / Train / Taxi / Bus / Own Car) in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map(exp => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={TD}>{new Date(exp.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td style={TD}>{exp.metadata?.departureTime || "—"}</td>
                  <td style={TD}>{exp.metadata?.from || "—"}</td>
                  <td style={TD}>{exp.metadata?.arrivalDate ? new Date(exp.metadata.arrivalDate).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={TD}>{exp.metadata?.arrivalTime || "—"}</td>
                  <td style={TD}>{exp.metadata?.to || "—"}</td>
                  <td style={{ ...TD, textAlign: "right" }}>{exp.metadata?.distance || "—"}</td>
                  <td style={TD}>{exp.metadata?.class || "—"}</td>
                  <td style={TD}>{exp.metadata?.pnr || "—"}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#0077b6" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={10} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#0077b6", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Expense table: Accommodation (Section 13) ────────────────────────────

  const renderAccommodationTable = (field: any) => {
    const expenses = tripExpenses.filter(e => e.category === "Accommodation" || LODGING_TYPES.includes(e.expenseType));
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden", minWidth: "560px" }}>
          <thead>
            <tr>
              {["", "Check-in", "Check-out", "Hotel / Guest House", "Bill No.", "Days", "Amount (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 5 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No lodging/accommodation expenses in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map(exp => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={TD}>{exp.metadata?.from || new Date(exp.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td style={TD}>{exp.metadata?.to || "—"}</td>
                  <td style={TD}>{exp.metadata?.hotelName || exp.metadata?.guestHouseName || exp.title}</td>
                  <td style={TD}>{exp.metadata?.billNo || "—"}</td>
                  <td style={{ ...TD, textAlign: "right" }}>{exp.metadata?.numNights ?? "—"}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#0077b6" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={6} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#0077b6", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Expense table: Other (Section 15) ────────────────────────────────────

  const renderOtherExpensesTable = (field: any) => {
    const expenses = tripExpenses.filter(
      e => (e.category !== "Travel" && !TRAVEL_TYPES.includes(e.expenseType)) && (e.category !== "Accommodation" && !LODGING_TYPES.includes(e.expenseType))
    );
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden" }}>
          <thead>
            <tr>
              {["", "Sr. No.", "Details", "Type", "Amount (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No other expenses (Registration / Visa / Food / Other) in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map((exp, idx) => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={{ ...TD, textAlign: "center", fontWeight: "600", color: "#6b7280" }}>{idx + 1}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: "500" }}>{exp.title}</div>
                    {exp.vendor && <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{exp.vendor}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ padding: "0.2rem 0.5rem", background: "#f3e8ff", color: "#7c3aed", borderRadius: "0.25rem", fontSize: "0.72rem", fontWeight: "700" }}>
                      {exp.expenseType}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#0077b6" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={4} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#0077b6", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Render a single form field ────────────────────────────────────────────

  const renderField = (field: any) => {
    const isReadOnly = !!submissionData && submissionData.status !== "DRAFT";

    switch (field.type) {
      case "text":
      case "short_text":
      case "email":
      case "phone":
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || `Enter ${field.label.toLowerCase()}`}
            style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "long_text":
        return (
          <textarea
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || "Enter your response…"}
            style={{ ...inputStyle, minHeight: "100px", resize: "vertical", background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "number":
      case "decimal":
        return (
          <input
            type="number"
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || "0"}
            style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "date":
        return <input disabled={isReadOnly} type="date" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "time":
        return <input disabled={isReadOnly} type="time" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "datetime":
        return <input disabled={isReadOnly} type="datetime-local" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "multiple_choice":
      case "yesno":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(field.options || (field.type === "yesno" ? ["Yes", "No"] : [])).map((opt: string) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: isReadOnly ? "default" : "pointer", fontSize: "0.95rem" }}>
                <input disabled={isReadOnly} type="radio" name={field.id} value={opt} checked={formData[field.id] === opt} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ accentColor: "#0077b6" }} />
                {opt}
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(field.options || []).map((opt: string) => {
              const vals = Array.isArray(formData[field.id]) ? formData[field.id] : [];
              return (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: isReadOnly ? "default" : "pointer", fontSize: "0.95rem" }}>
                  <input
                    disabled={isReadOnly}
                    type="checkbox"
                    checked={vals.includes(opt)}
                    onChange={e => handleFieldChange(field.id, e.target.checked ? [...vals, opt] : vals.filter((v: string) => v !== opt))}
                    style={{ accentColor: "#0077b6" }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      case "dropdown":
        return (
          <select disabled={isReadOnly} value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}>
            <option value="" disabled>Select an option</option>
            {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case "linear_scale":
        return (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
            {field.minLabel && <span style={{ fontSize: "0.85rem", color: "#6b7280", paddingBottom: "0.25rem" }}>{field.minLabel}</span>}
            <div style={{ display: "flex", gap: "0.75rem", flex: 1, justifyContent: "space-between" }}>
              {Array.from({ length: (field.scaleEnd || 10) - (field.scaleStart || 1) + 1 }).map((_, idx) => {
                const val = (field.scaleStart || 1) + idx;
                return (
                  <label key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", cursor: isReadOnly ? "default" : "pointer" }}>
                    <input disabled={isReadOnly} type="radio" name={field.id} value={val} checked={String(formData[field.id]) === String(val)} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ accentColor: "#0077b6" }} />
                    <span style={{ fontSize: "0.78rem", fontWeight: "600" }}>{val}</span>
                  </label>
                );
              })}
            </div>
            {field.maxLabel && <span style={{ fontSize: "0.85rem", color: "#6b7280", paddingBottom: "0.25rem" }}>{field.maxLabel}</span>}
          </div>
        );
      case "rating":
        return (
          <div style={{ display: "flex", gap: "0.5rem", fontSize: "1.75rem" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} onClick={() => handleFieldChange(field.id, n)} style={{ cursor: isReadOnly ? "default" : "pointer", color: (formData[field.id] || 0) >= n ? "#f59e0b" : "#d1d5db" }}>★</span>
            ))}
          </div>
        );
      case "file_upload": {
        const fileData = formData[field.id];
        
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit. Please upload a smaller file.");
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result;
            handleFieldChange(field.id, {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              base64: base64
            });
          };
          reader.readAsDataURL(file);
        };
        
        return (
          <div style={{ padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
            {fileData?.base64 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
                  <div style={{ fontSize: "1.5rem" }}>📎</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }} title={fileData.fileName}>{fileData.fileName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{(fileData.fileSize / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <a href={fileData.base64} download={fileData.fileName} style={{ padding: "0.375rem 0.75rem", background: "#10b981", color: "white", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none", display: "inline-block", textAlign: "center" }}>
                    Download
                  </a>
                  {!isReadOnly && (
                    <button type="button" onClick={() => handleFieldChange(field.id, null)} style={{ padding: "0.375rem 0.75rem", background: "#ef4444", color: "white", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600, border: "none", cursor: "pointer" }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : isReadOnly ? (
              <div style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>No file attached</div>
            ) : (
              <div>
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  style={{ display: "block", width: "100%", fontSize: "0.875rem", color: "#6b7280" }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>Max file size: 5MB</div>
              </div>
            )}
          </div>
        );
      }
      // ─── Expense card tables ──────────────────────────────────────────
      case "expense_cards_table":
        return renderTravelTable(field);
      case "accommodation_cards_table":
        return renderAccommodationTable(field);
      case "other_expenses_table":
        return renderOtherExpensesTable(field);
      case "signature_authority":
        let isApproved = false;
        let isRejected = false;
        if (submissionData && submissionData.signatures) {
          try {
            const sigs = JSON.parse(submissionData.signatures);
            if (sigs[field.id] === true) isApproved = true;
            if (sigs[field.id] === false) isRejected = true;
          } catch(e) {}
        }
        return (
          <div style={{ marginTop: "1.5rem", display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: "220px", border: "1px dashed #cbd5e1", padding: "1.5rem 1rem 0.5rem", borderRadius: "0.5rem", position: "relative" }}>
            {isApproved && (
              <div style={{ position: "absolute", top: "-10px", right: "-10px", transform: "rotate(-10deg)", border: "3px solid #16a34a", color: "#16a34a", padding: "0.25rem 0.75rem", borderRadius: "0.25rem", fontWeight: "800", fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255,255,255,0.9)" }}>
                APPROVED
              </div>
            )}
            {isRejected && (
               <div style={{ position: "absolute", top: "-10px", right: "-10px", transform: "rotate(-10deg)", border: "3px solid #dc2626", color: "#dc2626", padding: "0.25rem 0.75rem", borderRadius: "0.25rem", fontWeight: "800", fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255,255,255,0.9)" }}>
                REJECTED
              </div>
            )}
            <div style={{ height: "40px", borderBottom: "1px solid #1e293b", width: "100%", marginBottom: "0.5rem" }}></div>
            <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#334155" }}>
              Signature of {field.label || "Authority"}
            </div>
            {isApproved && (
               <div style={{ fontSize: "0.7rem", color: "#16a34a", marginTop: "0.25rem", fontWeight: "500" }}>
                 Digitally verified by Approver
               </div>
            )}
          </div>
        );
      default:
        return (
          <input disabled={isReadOnly} type="text" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{...inputStyle, background: isReadOnly ? "#fafafa" : "white"}} />
        );
    }
  };

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
        <p style={{ color: "#6b7280" }}>Loading form…</p>
      </div>
    );
  }
  if (!form) {
    return (
      <div style={{ padding: "2rem", display: "flex", gap: "0.5rem", alignItems: "center", color: "#dc2626" }}>
        <AlertCircle size={20} /> <span>Form not found</span>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">

      {/* Hero Header */}
      <div className="sticky top-0 z-50 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[#1a5c3a] to-[#0f4c2f] p-5 md:p-6 shadow-xl mb-6">
        {/* Decorative elements */}
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {onBack && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all backdrop-blur-sm border border-white/10 shrink-0"
                title="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {form.title}
              </h1>
              {form.description && (
                <p className="text-white/80 mt-1 text-sm font-medium max-w-2xl">
                  {form.description}
                </p>
              )}
            </div>
          </div>

          {submissionData && submissionData.status !== "DRAFT" && (
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[var(--primary)] hover:bg-gray-50 rounded-xl font-bold transition-colors shadow-sm shrink-0 text-sm"
            >
              <Download size={16} /> Download PDF
            </button>
          )}
        </div>
      </div>



      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3 text-sm text-red-700 font-medium shadow-sm">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm text-emerald-800 font-medium shadow-sm">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <span>Form submitted successfully! Redirecting…</span>
        </div>
      )}

      {/* Trip selector (shown when form has expense table fields) */}
      {renderTripSelector()}

      {/* Form body */}
      <div ref={formRef} className="space-y-6 mb-6">
        {(form.templateSchema?.sections || [{ id: "fallback", title: "", fields: form.fields || [] }]).map((section: any) => (
          <div key={section.id} className="bg-[#f0fdfaf0] border border-cyan-100 rounded-2xl shadow-sm overflow-hidden">
            {section.title && (
              <div 
                className="px-6 py-4 relative overflow-hidden bg-[#0f4c3a]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundBlendMode: 'overlay' }}
              >
                <div className="relative z-10">
                  <h2 className="text-[1.05rem] font-extrabold text-white m-0 mb-1 uppercase tracking-wider">
                    {section.title}
                  </h2>
                  {section.description && <p className="text-sm text-cyan-100/90 m-0">{section.description}</p>}
                </div>
              </div>
            )}

            <div className="px-6 pb-6 md:px-8 md:pb-8 pt-0 space-y-6">
              {section.fields?.map((field: any) => (
                <div key={field.id}>
                  <>
                    <label className="block text-[0.9rem] font-semibold text-slate-700 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-[0.82rem] text-gray-500 m-0 mb-1.5">{field.description}</p>
                    )}
                    {field.helpText && (
                      <p className="text-[0.78rem] text-gray-400 m-0 mb-1.5 italic">{field.helpText}</p>
                    )}
                  </>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-4 mt-6">
        {(!submissionData || submissionData.status === "DRAFT") && (
          <>
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-800 border-2 border-emerald-700 rounded-xl font-bold text-sm transition-all hover:bg-emerald-50 ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              Save as Draft
            </button>
            {isDraft && (
              <button
                onClick={handleDiscardChanges}
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-xl font-bold text-sm transition-all hover:bg-rose-50 ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                Discard Changes
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !isFormValid()}
              className={`flex items-center gap-2 px-6 py-2.5 border-none rounded-xl font-bold text-sm transition-all shadow-[0_4px_12px_rgba(5,150,105,0.25)] hover:-translate-y-0.5 ${
                submitting || !isFormValid() 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none hover:shadow-none hover:translate-y-0" 
                  : "bg-gradient-to-r from-emerald-800 to-emerald-600 text-white hover:shadow-[0_6px_16px_rgba(5,150,105,0.35)]"
              }`}
            >
              <Send size={18} /> {submitting ? "Submitting…" : "Submit Form"}
            </button>
          </>
        )}
        {submissionData && submissionData.status !== "DRAFT" && (
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-6 py-2.5 bg-transparent text-purple-700 border-2 border-purple-700 rounded-xl font-bold text-sm transition-all hover:bg-purple-50"
          >
            <Download size={18} /> Download PDF
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Small helper sub-components ──────────────────────────────────────────────

const NoTripWarning = () => (
  <div style={{ padding: "1rem", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "0.5rem", color: "#92400e", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
    ⚠️ Please select a trip above to load your expense cards.
  </div>
);

const LoadingRow = () => (
  <div style={{ padding: "1.5rem", textAlign: "center", background: "#f9fafb", borderRadius: "0.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
    ⏳ Loading expenses…
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  minHeight: "42px",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  lineHeight: "1.4",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
  color: "#1f2937",
};
