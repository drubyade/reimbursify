"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { EXPENSE_TYPES } from "@/lib/expense-config";
import { CURRENCIES, getCurrencyDisplay } from "@/lib/currencies";
import {
  cacheTrips,
  cacheSingleTrip,
  getCachedTrips,
  cacheExpenses,
  getCachedExpensesByTrip,
  cacheSingleExpense,
  addToSyncQueue,
  getSyncQueue,
  flushSyncQueue
} from "@/lib/offline-db";
import { Plus, ArrowRight, Plane, Calendar, CreditCard, PieChart, Star, Archive, Trash2, ChevronRight, Eye, LayoutGrid, List, Briefcase, Receipt } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  startDate: string;
  isCompleted: boolean;
  advanceDrawn: number;
  budgetHead?: string;
  purpose?: string;
  notes?: string;
  createdAt: string;
  totalAmount?: number;
  expenseCount?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  paymentDate: string;
  status: string;
  tripId: string;
}

export const TripsDashboard = forwardRef((_, ref) => {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filterView, setFilterView] = useState<"active" | "favorites" | "archived">("active");

  useEffect(() => {
    const savedViewMode = localStorage.getItem("reimbursify_view_mode");
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }

    const savedFilterView = localStorage.getItem("reimbursify_filter_view");
    if (savedFilterView === "active" || savedFilterView === "favorites" || savedFilterView === "archived") {
      setFilterView(savedFilterView);
    }

    const savedSearchQuery = localStorage.getItem("reimbursify_trips_search");
    if (savedSearchQuery !== null) setSearchQuery(savedSearchQuery);

    const savedSortBy = localStorage.getItem("reimbursify_trips_sort");
    if (savedSortBy) setSortBy(savedSortBy);
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("reimbursify_view_mode", mode);
  };

  const handleFilterViewChange = (filter: "active" | "favorites" | "archived") => {
    setFilterView(filter);
    localStorage.setItem("reimbursify_filter_view", filter);
  };
  const [sidebarView, setSidebarView] = useState<"trips" | "add-trip" | "add-expense" | "edit-expense" | "trip-detail">("trips");
  
  const handleSidebarViewChange = (view: typeof sidebarView) => {
    setSidebarView(view);
    localStorage.setItem("reimbursify_sidebar_view", view);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const [selectedTripId, setSelectedTripIdState] = useState<string | null>(null);
  const setSelectedTripId = (id: string | null) => {
    setSelectedTripIdState(id);
    if (id) localStorage.setItem("reimbursify_selected_trip_id", id);
    else localStorage.removeItem("reimbursify_selected_trip_id");
  };

  const tripDetails = useMemo(() => trips.find((t) => t.id === selectedTripId) || null, [trips, selectedTripId]);
  const [tripExpenses, setTripExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [paymentCards, setPaymentCards] = useState<any[]>([]);

  const [tripForm, setTripForm] = useState({
    title: "",
    startDate: "",
    purpose: "",
    budgetHead: "",
    notes: "",
  });

  // Set today's date as default
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Travel",
    expenseType: "",
    paymentDate: getTodayDate(),
    paymentMethod: "Cash",
    description: "",
    currency: "INR",
    metadata: {} as Record<string, any>,
    files: [] as File[],
  });

  useImperativeHandle(ref, () => ({
    openAddTripForm: () => {
            setShowNewTripForm(true);
    },
    openAddExpenseForm: () => {
      setSelectedTripId(null);
            setShowAddExpenseForm(true);
    },
  }));

  useEffect(() => {
    if (session?.user?.id) {
      fetchTrips();
      fetch("/api/profile/payment-cards")
        .then(res => res.json())
        .then(data => {
          if (data.cards) setPaymentCards(data.cards);
        })
        .catch(console.error);

      const savedSidebarView = localStorage.getItem("reimbursify_sidebar_view");
      if (savedSidebarView) setSidebarView(savedSidebarView as any);

      const savedSelectedTripId = localStorage.getItem("reimbursify_selected_trip_id");
      if (savedSelectedTripId) {
        setSelectedTripIdState(savedSelectedTripId);
        fetchTripExpenses(savedSelectedTripId);
      }
    }

    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "CACHE_UPDATED") {
        if (event.data.url.includes("/api/trips")) {
          try {
            // Use payload directly if provided by the Service Worker (prevents infinite fetch loops)
            if (event.data.payload && event.data.payload.trips) {
              const serverTrips = event.data.payload.trips;
              const syncQueue = await getSyncQueue();
              const pendingTripIds = syncQueue.map(item => {
                const match = item.url.match(/\/api\/trips\/([^/]+)/);
                return match ? match[1] : null;
              }).filter(Boolean);

              const localTrips = await getCachedTrips();
              const merged = serverTrips.map((serverTrip: Trip) => {
                if (pendingTripIds.includes(serverTrip.id)) {
                  const local = localTrips.find((t: Trip) => t.id === serverTrip.id);
                  return local || serverTrip;
                }
                return serverTrip;
              });

              setTrips(merged);
              cacheTrips(merged).catch(() => {});
            }
          } catch (e) {
            console.error("Error processing CACHE_UPDATED:", e);
          }
        }
      }
    };

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, [session?.user?.id]);

  const fetchTrips = async () => {
    setLoading(true);

    // ── Serve cached data immediately (offline-first) ──────────────────────
    try {
      const cached = await getCachedTrips();
      if (cached.length > 0) {
        setTrips(cached);
        setLoading(false); // show cached data right away
      }
    } catch (_) {}

    // ── Then hit the network and update both UI + cache ────────────────────
    try {
      // Get pending queue BEFORE flushing so we know what's in-flight
      const syncQueue = await getSyncQueue();
      const pendingTripIds = syncQueue.map(item => {
        const match = item.url.match(/\/api\/trips\/([^/]+)/);
        return match ? match[1] : null;
      }).filter(Boolean);

      const allRes = await fetch("/api/trips?archived=true", { headers: { "Cache-Control": "no-cache" } });
      if (allRes.ok) {
        const allData = await allRes.json();
        const serverTrips = allData.trips || [];
        
        const localTrips = await getCachedTrips();
        const merged = serverTrips.map((serverTrip: Trip) => {
          const local = localTrips.find((t: Trip) => t.id === serverTrip.id);
          if (local) {
            // Prefer local if it's currently in the sync queue
            if (pendingTripIds.includes(serverTrip.id)) {
               return local;
            }
            // Prefer local if it was cached extremely recently (under 5 seconds ago)
            if (local._cachedAt && Date.now() - local._cachedAt < 5000) {
              return local;
            }
          }
          return serverTrip;
        });

        setTrips(merged);
        await cacheTrips(merged).catch(() => {});
      }

      // Flush queue AFTER applying logic
      flushSyncQueue().catch(() => {});
    } catch (error) {
      console.error("Error fetching trips (using cache):", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    try {
      const updatedTrip = { ...trip, isFavorite: !trip.isFavorite };
      setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
      cacheSingleTrip(updatedTrip).catch(() => {});
      
      const payload = { isFavorite: updatedTrip.isFavorite };
      const url = `/api/trips/${trip.id}`;
      
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Offline or failed");
      } catch (err) {
        await addToSyncQueue({ url, method: "PATCH", body: JSON.stringify(payload) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleArchive = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    try {
      const updatedTrip = { ...trip, isArchived: !trip.isArchived };
      setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
      cacheSingleTrip(updatedTrip).catch(() => {});
      
      const payload = { isArchived: updatedTrip.isArchived };
      const url = `/api/trips/${trip.id}`;
      
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Offline or failed");
      } catch (err) {
        await addToSyncQueue({ url, method: "PATCH", body: JSON.stringify(payload) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTrip = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    if ((trip.expenseCount || 0) > 0 || (trip.totalAmount || 0) > 0) {
      alert(`Cannot delete "${trip.title}" because it has existing expenses. Please delete all expenses first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete "${trip.title}"?`)) return;
    try {
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTripExpenses = async (tripId: string) => {
    setLoadingExpenses(true);

    // ── Serve cached expenses immediately ─────────────────────────────────
    try {
      const cached = await getCachedExpensesByTrip(tripId);
      if (cached.length > 0) {
        setTripExpenses(cached as Expense[]);
        setLoadingExpenses(false);
      }
    } catch (_) {}

    // ── Then refresh from network ──────────────────────────────────────────
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`);
      if (res.ok) {
        const data = await res.json();
        const fresh = (data.expenses || []).map((e: any) => ({ ...e, tripId }));
        setTripExpenses(fresh);
        await cacheExpenses(fresh).catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching expenses (using cache):", error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.title || !tripForm.startDate) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tripForm.title,
          startDate: tripForm.startDate,
          purpose: tripForm.purpose || null,
          budgetHead: tripForm.budgetHead || null,
          notes: tripForm.notes || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newTrip = data.trip;
        setTrips([newTrip, ...trips]);
        // Cache the new trip locally
        cacheSingleTrip(newTrip).catch(() => {});
        setTripForm({ title: "", startDate: "", purpose: "", budgetHead: "", notes: "" });
        setShowNewTripForm(false);
        handleSidebarViewChange("trips");
      } else if (res.status === 202) {
        // Queued offline — add optimistic entry
        const tempTrip: Trip = {
          id: `local-${Date.now()}`,
          title: tripForm.title,
          startDate: tripForm.startDate,
          isCompleted: false,
          advanceDrawn: 0,
          purpose: tripForm.purpose,
          budgetHead: tripForm.budgetHead,
          notes: tripForm.notes,
          createdAt: new Date().toISOString(),
        };
        setTrips([tempTrip, ...trips]);
        cacheSingleTrip(tempTrip).catch(() => {});
        setTripForm({ title: "", startDate: "", purpose: "", budgetHead: "", notes: "" });
        setShowNewTripForm(false);
        handleSidebarViewChange("trips");
        alert("Trip saved offline — will sync when back online.");
      } else {
        alert("Failed to create trip");
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      alert("Error creating trip");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !expenseForm.title || !expenseForm.amount) {
      alert("Please fill in all required fields: Trip, Title, and Amount");
      return;
    }

    if (!expenseForm.paymentDate) {
      alert("Please select a payment date");
      return;
    }

    if (!expenseForm.category || !["Travel", "Accommodation", "Other", "Personal"].includes(expenseForm.category)) {
      alert("Please select a valid category");
      return;
    }

    try {
      const isEdit = !!editingExpenseId;
      const res = await fetch(isEdit ? `/api/expenses/${editingExpenseId}` : "/api/expenses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          expenseType: expenseForm.expenseType,
          date: expenseForm.paymentDate,
          paymentMethod: expenseForm.paymentMethod,
          description: expenseForm.description || null,
          currency: expenseForm.currency || "INR",
          metadata: expenseForm.metadata,
        }),
      });

      if (res.ok) {
        const expenseData = await res.json();
        const expenseId = expenseData.expense?.id;

        // Cache the expense locally right away
        if (expenseData.expense) {
          cacheSingleExpense({ ...expenseData.expense, tripId: selectedTripId }).catch(() => {});
        }

        // Upload files if any
        if (expenseForm.files.length > 0 && expenseId) {
          for (const file of expenseForm.files) {
            const formData = new FormData();
            formData.append("file", file);
            await fetch(
              `/api/trips/${selectedTripId}/expenses/${expenseId}/attachments`,
              { method: "POST", body: formData }
            );
          }
        }

        setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", description: "", currency: "INR", metadata: {}, files: [] });
        setEditingExpenseId(null);
        setShowAddExpenseForm(false);
        handleSidebarViewChange("trip-detail");
        if (selectedTripId) fetchTripExpenses(selectedTripId);
        fetchTrips();
      } else if (res.status === 202) {
        // Queued offline — add optimistic entry
        const tempExpense: Expense = {
          id: `local-${Date.now()}`,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          expenseType: expenseForm.expenseType,
          paymentDate: expenseForm.paymentDate,
          status: "PENDING",
          tripId: selectedTripId!,
        };
        setTripExpenses(prev => [...prev, tempExpense]);
        cacheSingleExpense(tempExpense).catch(() => {});
        setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", description: "", currency: "INR", metadata: {}, files: [] });
        handleSidebarViewChange("trip-detail");
        alert("Expense saved offline — will sync when back online.");
      } else {
        const errorData = await res.json().catch(() => ({error: "Failed to save expense"}));
        alert(`Failed to save expense: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Error saving expense");
    }
  };

  const startEditExpense = (expense: any) => {
    setSelectedTripId(expense.tripId);
    setExpenseForm({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      expenseType: expense.expenseType,
      paymentDate: new Date(expense.paymentDate).toISOString().split("T")[0],
      paymentMethod: expense.paymentMethod || "Cash",
      description: expense.description || "",
      currency: expense.currency || "INR",
      metadata: (() => {
        try {
          let parsed = typeof expense.metadata === "string" ? JSON.parse(expense.metadata) : (expense.metadata || {});
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          return typeof parsed === "object" && parsed !== null ? parsed : {};
        } catch { return {}; }
      })(),
      files: [],
    });
    setEditingExpenseId(expense.id);
    setShowAddExpenseForm(true);
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this expense? Receipts will also be lost.")) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        setTripExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
        fetchTrips(); // update global amounts
      } else {
        alert("Failed to delete expense");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting expense");
    }
  };

  // Filter expense types based on selected category
  const getFilteredExpenseTypes = () => {
    return Object.entries(EXPENSE_TYPES).filter(([_, config]: any) => config.category === expenseForm.category);
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {showNewTripForm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white",
            padding: "2.5rem",
            borderRadius: "1.5rem",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            maxHeight: "90vh",
            overflowY: "auto",
          }} className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--primary-lightest)] text-[var(--primary)] rounded-xl flex items-center justify-center shrink-0">
                <Briefcase size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                New Trip
              </h2>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Trip Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter trip name"
                  value={tripForm.title}
                  onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(e) => setTripForm({ ...tripForm, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Purpose
                </label>
                <input
                  type="text"
                  placeholder="Trip purpose"
                  value={tripForm.purpose}
                  onChange={(e) => setTripForm({ ...tripForm, purpose: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Budget Head
                </label>
                <input
                  type="text"
                  placeholder="Budget category"
                  value={tripForm.budgetHead}
                  onChange={(e) => setTripForm({ ...tripForm, budgetHead: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  placeholder="Any additional notes"
                  value={tripForm.notes}
                  onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none min-h-[80px] resize-y"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTripForm(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tripForm.title || !tripForm.startDate}
                  className="flex-1 py-3 px-4 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[#023e8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddExpenseForm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white",
            padding: "2.5rem",
            borderRadius: "1.5rem",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            maxHeight: "90vh",
            overflowY: "auto",
          }} className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--primary-lightest)] text-[var(--primary)] rounded-xl flex items-center justify-center shrink-0">
                <Receipt size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingExpenseId ? "Edit Expense" : "Add Expense"}
              </h2>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-5">
              {selectedTripId === null ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Select Trip *
                  </label>
                  <select
                    value={selectedTripId || ""}
                    onChange={(e) => setSelectedTripId(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none cursor-pointer"
                  >
                    <option value="">Choose a trip...</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Flight ticket"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none cursor-pointer"
                  >
                    <option value="">Select Currency...</option>
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => {
                    setExpenseForm({ ...expenseForm, category: e.target.value, expenseType: "" });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none cursor-pointer"
                >
                  <option value="Travel">🚆 Travel (Air/Train/Bus/Taxi)</option>
                  <option value="Accommodation">🏨 Accommodation (Hotel/Guest House)</option>
                  <option value="Other">📋 Other (Registration/Visa/Charges)</option>
                  <option value="Personal">👤 Personal</option>
                </select>
              </div>

              {/* Expense Type List - Show filtered types for selected category */}
              {getFilteredExpenseTypes().length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expense Type *
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {getFilteredExpenseTypes().map(([key, config]: any) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setExpenseForm({ ...expenseForm, expenseType: key, metadata: {} })}
                        style={{
                          padding: "0.75rem",
                          border: expenseForm.expenseType === key ? "2px solid #0077b6" : "1px solid #e5e7eb",
                          background: expenseForm.expenseType === key ? "#f0f9f7" : "white",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          textAlign: "left",
                          fontSize: "0.95rem",
                          fontWeight: expenseForm.expenseType === key ? "600" : "500",
                          color: "#1a3a2e",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (expenseForm.expenseType !== key) {
                            e.currentTarget.style.background = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expenseForm.expenseType !== key) {
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>{config.outlineIcon || config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: expenseForm.paymentMethod === "Saved Payment Methods" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.paymentDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mode of Payment
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Saved Payment Methods">Saved Payment Methods</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {expenseForm.paymentMethod === "Saved Payment Methods" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Select Method (Optional)
                    </label>
                    <select
                      value={expenseForm.metadata?.savedCardId || ""}
                      onChange={(e) => setExpenseForm({
                        ...expenseForm,
                        metadata: { ...expenseForm.metadata, savedCardId: e.target.value }
                      })}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        fontSize: "0.95rem",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        backgroundColor: "#f3f4f6",
                        color: "#1a3a2e",
                      }}
                    >
                      <option value="">Select a method...</option>
                      {paymentCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.label} ({card.cardType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes / Remarks (Bank Details, etc.)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Paid using HDFC Credit Card ending in 1234"
                  value={expenseForm.metadata?.remarks || ""}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    metadata: { ...expenseForm.metadata, remarks: e.target.value }
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>

              {/* Proof Fields - Only show when expense type is selected */}
              {expenseForm.expenseType && EXPENSE_TYPES[expenseForm.expenseType as keyof typeof EXPENSE_TYPES]?.proofFields && (
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Required Documents
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {EXPENSE_TYPES[expenseForm.expenseType as keyof typeof EXPENSE_TYPES].proofFields.map((field: any) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {field.label}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            placeholder={field.label}
                            value={expenseForm.metadata[field.key] || ""}
                            onChange={(e) => setExpenseForm({
                              ...expenseForm,
                              metadata: { ...expenseForm.metadata, [field.key]: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none text-sm min-h-[50px] resize-y"
                          />
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.label}
                            value={expenseForm.metadata[field.key] || ""}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => setExpenseForm({
                              ...expenseForm,
                              metadata: { ...expenseForm.metadata, [field.key]: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Additional details"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none min-h-[60px] resize-y"
                />
              </div>

              {/* File Upload */}
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Attachments (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    if (e.target.files) {
                      setExpenseForm({
                        ...expenseForm,
                        files: [...expenseForm.files, ...Array.from(e.target.files)]
                      });
                      e.target.value = "";
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none cursor-pointer text-sm"
                />
                {expenseForm.files.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {expenseForm.files.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.3rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span style={{ color: "#5a6f6a" }}>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setExpenseForm({
                            ...expenseForm,
                            files: expenseForm.files.filter((_, i) => i !== index)
                          })}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#e74c3c",
                            color: "white",
                            border: "none",
                            borderRadius: "0.2rem",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpenseForm(false);
                    setEditingExpenseId(null);
                  }}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!expenseForm.title || !expenseForm.amount || !expenseForm.expenseType}
                  className="flex-1 py-3 px-4 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[#023e8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingExpenseId ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Left Sidebar (Now Full View Container) */}
      <div
        style={{
          display: sidebarView === "trip-detail" ? "flex" : "none",
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          borderRight: "none",
          background: "#ffffff",
          flexDirection: "column",
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, color: "#1a3a2e", fontSize: "1.25rem", fontWeight: "700" }}>
            {sidebarView === "add-trip" ? "New Trip" : sidebarView === "add-expense" ? "Add Expense" : sidebarView === "trip-detail" ? "Trip Summary" : "Trips & Expenses"}
          </h2>
        </div>

        {/* Sidebar Content - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          

          {/* Trip Detail View with Expense Summary */}
          {sidebarView === "trip-detail" && tripDetails && (
            <div>
              {/* Trip Header */}
              <div style={{ paddingBottom: "1.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#1a3a2e", fontSize: "1.1rem", fontWeight: "700" }}>
                      {tripDetails.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTripId(tripDetails.id);
                      setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", currency: "INR", description: "", metadata: {}, files: [] });
                      setShowAddExpenseForm(true);
                    }}
                    style={{ padding: "0.5rem 1rem", background: "#0077b6", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    ➕ Add Expense
                  </button>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Date:</strong> {new Date(tripDetails.startDate).toLocaleDateString()}
                </p>
                {tripDetails.purpose && (
                  <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                    <strong>Purpose:</strong> {tripDetails.purpose}
                  </p>
                )}
                <p style={{ margin: "0.5rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Total Amount:</strong> <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0077b6" }}>₹{(tripDetails.totalAmount || 0).toFixed(2)}</span>
                </p>
                <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Advance Drawn:</strong> ₹{tripDetails.advanceDrawn.toFixed(2)}
                </p>
              </div>

              {/* Expenses Summary by Category */}
              {loadingExpenses ? (
                <p style={{ textAlign: "center", color: "#5a6f6a", padding: "2rem 0" }}>Loading expenses...</p>
              ) : tripExpenses.length === 0 ? (
                <p style={{ textAlign: "center", color: "#5a6f6a", padding: "2rem 0" }}>No expenses yet</p>
              ) : (
                <div>
                  {/* Group expenses by category */}
                  {["Travel", "Food", "Accommodation", "Other", "Personal"].map((category) => {
                    const categoryExpenses = tripExpenses.filter((e) => e.category === category);
                    if (categoryExpenses.length === 0) return null;

                    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

                    return (
                      <div
                        key={category}
                        style={{
                          marginBottom: "1.5rem",
                          padding: "1rem",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <h4 style={{ margin: "0", color: "#1a3a2e", fontSize: "0.95rem", fontWeight: "700" }}>
                            {category}
                          </h4>
                          <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0077b6" }}>
                            ₹{categoryTotal.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {categoryExpenses.map((expense: any) => (
                            <div
                              key={expense.id}
                              onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)}
                              style={{
                                padding: "0.75rem",
                                background: expandedExpenseId === expense.id ? "#f0fdf4" : "white",
                                border: "1px solid #d1e8dd",
                                borderRadius: "0.5rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              {/* Row 1: Title and Amount */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: "0", color: "#1a3a2e", fontSize: "0.9rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES]?.icon || "🧾"} {expense.title}
                                  </p>
                                  <p style={{ margin: "0.15rem 0 0 0", color: "#5a6f6a", fontSize: "0.75rem" }}>
                                    {expense.expenseType && EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES]
                                      ? EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES].label
                                      : "N/A"}
                                  </p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                  <p style={{ margin: "0 0 0.4rem 0.5rem", color: "#0077b6", fontSize: "0.95rem", fontWeight: "700", flexShrink: 0 }}>
                                    ₹{(expense.amount || 0).toFixed(2)}
                                  </p>
                                  {expandedExpenseId !== expense.id && (
                                    <span
                                      style={{ background: "transparent", color: "#0077b6", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem", opacity: 0.8 }}
                                    >
                                      👁️ View Details
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {expandedExpenseId === expense.id && (
                                <div style={{ padding: "0.75rem 0", borderTop: "1px dashed #cbd5e1", marginTop: "0.5rem", fontSize: "0.85rem", color: "#475569" }} onClick={e => e.stopPropagation()}>
                                  <p style={{ margin: "0 0 0.5rem 0" }}>📅 <strong>Date:</strong> {new Date(expense.paymentDate).toLocaleDateString()}</p>
                                  {expense.description && <p style={{ margin: "0 0 0.5rem 0" }}>📝 <strong>Description:</strong> {expense.description}</p>}
                                  
                                  {(() => {
                                     let meta = expense.metadata;
                                     if (typeof meta === "string") {
                                        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
                                     }
                                     if (!meta || Object.keys(meta).length === 0) return null;
                                     
                                     return (
                                       <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "0.35rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                                         {meta.from && <p style={{ margin: "0 0 0.25rem" }}>📍 <strong>From:</strong> {meta.from}</p>}
                                         {meta.to && <p style={{ margin: "0 0 0.25rem" }}>📍 <strong>To:</strong> {meta.to}</p>}
                                         {meta.hotelName && <p style={{ margin: "0 0 0.25rem" }}>🏨 <strong>Hotel:</strong> {meta.hotelName}</p>}
                                         {meta.billNo && <p style={{ margin: "0 0 0.25rem" }}>🧾 <strong>Bill No:</strong> {meta.billNo}</p>}
                                         {meta.pnr && <p style={{ margin: "0 0 0.25rem" }}>🎫 <strong>PNR/Ticket:</strong> {meta.pnr}</p>}
                                         {meta.numNights && <p style={{ margin: "0 0 0.25rem" }}>🌙 <strong>Nights:</strong> {meta.numNights}</p>}
                                         {meta.distance && <p style={{ margin: "0 0 0.25rem" }}>🛣️ <strong>Distance:</strong> {meta.distance} km</p>}
                                       </div>
                                     );
                                  })()}
                                  
                                  {/* Attachments */}
                                  <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
                                    <p style={{ margin: "0 0 0.5rem", fontWeight: "600" }}>📎 Attachments / Bills:</p>
                                    {(!expense.bills || expense.bills.length === 0) ? (
                                       <span style={{ color: "#9ca3af" }}>No attachments uploaded.</span>
                                    ) : (
                                       <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                         {expense.bills.map((b: any) => (
                                            <button key={b.id} onClick={(e) => { e.stopPropagation(); window.open(`/api/files/${b.id}`, "_blank"); }} style={{ padding: "0.25rem 0.5rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.25rem", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                              📄 {b.fileName}
                                            </button>
                                         ))}
                                       </div>
                                    )}
                                  </div>

                                  {/* Row 2: Action Buttons */}
                                  <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); startEditExpense(expense); }}
                                      style={{
                                        flex: 1,
                                        padding: "0.35rem 0.5rem",
                                        background: "#e0f2fe",
                                        color: "#0284c7",
                                        border: "1px solid #bae6fd",
                                        borderRadius: "0.3rem",
                                        cursor: "pointer",
                                        fontSize: "0.78rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteExpense(e, expense.id)}
                                      style={{
                                        flex: 1,
                                        padding: "0.35rem 0.5rem",
                                        background: "#fee2e2",
                                        color: "#dc2626",
                                        border: "1px solid #fecaca",
                                        borderRadius: "0.3rem",
                                        cursor: "pointer",
                                        fontSize: "0.78rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                <button
                  onClick={() => {
                    setSelectedTripId(tripDetails.id);
                                        setShowAddExpenseForm(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#0077b6",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0f4c2f";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0077b6";
                  }}
                >
                  + Add Expense
                </button>
                <button
                  onClick={() => {
                    handleSidebarViewChange("trips");
                    setSelectedTripId(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#0077b6",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${sidebarView === "trip-detail" ? "hidden" : "block"} bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full`}>
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-4 md:p-5 shadow-xl animate-fade-in-up">
            {/* Decorative elements */}

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                  <Plane size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                    {filterView === "active" ? "Active Trips" : filterView === "favorites" ? "Favourites" : "Archived Trips"}
                  </h2>
                  <p className="text-blue-100/90 text-sm md:text-base max-w-md font-medium">
                    Manage and track your travel expenses.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                {/* View Toggle */}
                <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[40px] w-full md:w-48">
                  <button
                    onClick={() => handleViewModeChange("grid")}
                    className={`flex-1 flex justify-center items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-all h-full ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <LayoutGrid size={16} />
                    Grid
                  </button>
                  <button
                    onClick={() => handleViewModeChange("list")}
                    className={`flex-1 flex justify-center items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-all h-full ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                  >
                    <List size={16} />
                    List
                  </button>
                </div>

                <button
                  onClick={() => setShowNewTripForm(true)}
                  className="flex items-center justify-center gap-2.5 px-5 py-2 h-[40px] w-full md:w-48 bg-white text-blue-700 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border border-white/80 shrink-0"
                >
                  <Plus size={18} />
                  Create Trip
                </button>
              </div>
            </div>
          {/* Filter Tabs & Search/Sort */}
          <div className="relative z-10 mt-3 flex flex-col md:flex-row gap-3 justify-between items-center animate-fade-in-up delay-1 w-full">
            <div className="flex w-full md:w-auto gap-2">
              {[
                { id: "active", label: "Active Trips", icon: Plane },
                { id: "favorites", label: "Favourites", icon: Star },
                { id: "archived", label: "Archived", icon: Archive }
              ].map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFilterViewChange(f.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all flex-1 md:w-[140px] justify-center border ${
                      filterView === f.id 
                        ? "bg-white text-blue-700 font-bold shadow-md border-white" 
                        : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:text-white font-medium"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex w-full md:w-auto gap-2 items-center">
              <input 
                type="text" 
                placeholder="Search trips..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  localStorage.setItem("reimbursify_trips_search", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-blue-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
              />
              <select 
                value={sortBy}
                onChange={e => {
                  setSortBy(e.target.value);
                  localStorage.setItem("reimbursify_trips_sort", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-blue-800 [&>option]:text-white"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="title-asc">Title: A-Z</option>
              </select>
            </div>
          </div>
        </div>
        </div>

        {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner !w-8 !h-8" />
            </div>
          ) : trips.length === 0 ? (
            <div className="animate-fade-in-up delay-3 bg-[var(--bg-secondary)] rounded-2xl p-16 text-center border-2 border-dashed border-[var(--primary-lighter)]">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mb-6">
                <Plane size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">No trips yet!</h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto text-base">
                Create your first trip to start tracking your expenses and reimbursements.
              </p>
              <button
                onClick={() => {
                                    setShowNewTripForm(true);
                }}
                className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[#023e8a] transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create Trip
              </button>
            </div>
          ) : (() => {
            const filteredAndSortedTrips = trips
              .filter(t => filterView === "favorites" ? t.isFavorite : filterView === "archived" ? t.isArchived : !t.isArchived)
              .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.purpose && t.purpose.toLowerCase().includes(searchQuery.toLowerCase())))
              .sort((a, b) => {
                if (sortBy === "date-desc") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                if (sortBy === "date-asc") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                if (sortBy === "amount-desc") return (b.totalAmount || 0) - (a.totalAmount || 0);
                if (sortBy === "amount-asc") return (a.totalAmount || 0) - (b.totalAmount || 0);
                if (sortBy === "title-asc") return a.title.localeCompare(b.title);
                return 0;
              });

            if (filteredAndSortedTrips.length === 0) {
              return (
                <div className="py-20 text-center text-gray-500">
                  <p>No trips match your current filters and search.</p>
                </div>
              );
            }

            return (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-2.5"}>
                {filteredAndSortedTrips.map((trip, idx) => {
                  const isCompleted = trip.isCompleted;
                  const isArchived = trip.isArchived;
                  const isFavorite = trip.isFavorite;
                  
                  let borderClass = isCompleted ? "border-emerald-400" : "border-blue-400";
                  let bgClass = isCompleted ? "bg-gradient-to-br from-emerald-50/80 to-white" : "bg-gradient-to-br from-blue-50/80 to-white";
                  let headingBg = isCompleted ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-blue-600 to-indigo-600";
                  let avatarGradient = isCompleted ? "from-emerald-500 to-teal-600" : "from-blue-600 to-indigo-700";

                  if (isFavorite) {
                    if (isArchived) {
                      borderClass = "border-[#b58b43]";
                      bgClass = "bg-gradient-to-br from-[#fcf7ec]/80 to-white";
                      headingBg = "bg-gradient-to-r from-[#b58b43] to-[#8f6e35]";
                      avatarGradient = "from-[#b58b43] to-[#8f6e35]";
                    } else {
                      borderClass = "border-amber-400";
                      bgClass = "bg-gradient-to-br from-amber-50/80 to-white";
                      headingBg = "bg-gradient-to-r from-amber-500 to-yellow-500";
                      avatarGradient = "from-amber-500 to-yellow-600";
                    }
                  } else if (isArchived) {
                    borderClass = "border-gray-400";
                    bgClass = "bg-gradient-to-br from-gray-50/80 to-white";
                    headingBg = "bg-gradient-to-r from-gray-500 to-gray-600";
                    avatarGradient = "from-gray-500 to-gray-700";
                  }
                  
                  if (viewMode === "list") {
                    return (
                      <div
                        key={trip.id}
                        className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 bg-white overflow-hidden animate-fade-in-up flex flex-col md:flex-row group`}
                      >
                        {/* Thin Left Border */}
                        <div className={`w-1.5 shrink-0 ${headingBg}`} />

                        {/* Content Area */}
                        <div className="flex-1 p-2 md:p-2.5 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-2.5 bg-white/40">
                          
                          {/* 1. Title & Avatar & Date */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 w-full">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`}>
                              {trip.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-base text-gray-900 truncate mb-0.5" title={trip.title}>
                                {trip.title}
                              </h3>
                              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <Calendar size={12} className="text-gray-400" />
                                {new Date(trip.startDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* 2. Total Expenses */}
                          <div className="flex flex-col shrink-0 md:border-l border-gray-100 md:pl-2.5 min-w-[90px] justify-center">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Expenses</span>
                            <span className="text-base font-bold text-gray-900">₹{(trip.totalAmount || 0).toFixed(2)}</span>
                          </div>

                          {/* 3. Advance */}
                          <div className="flex flex-col shrink-0 md:border-l border-gray-100 md:pl-2.5 min-w-[80px] justify-center">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Advance</span>
                            <span className="text-base font-bold text-gray-900">₹{trip.advanceDrawn.toFixed(2)}</span>
                          </div>

                          {/* 4. Actions */}
                          <div className="flex gap-1.5 shrink-0 md:border-l border-gray-100 md:pl-2.5 pt-2 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 flex-wrap md:flex-nowrap items-center">
                            <button
                              onClick={() => {
                                setSelectedTripId(trip.id);
                                handleSidebarViewChange("trip-detail");
                                fetchTripExpenses(trip.id);
                              }}
                              className="px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-gray-100 group/btn shrink-0"
                            >
                              <Eye size={14} className="transition-transform group-hover/btn:scale-110" />
                              <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">View Trip</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTripId(trip.id);
                                setShowAddExpenseForm(true);
                              }}
                              className="px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-gray-100 group/btn shrink-0"
                            >
                              <Plus size={14} className="transition-transform group-hover/btn:scale-110" />
                              <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Add Exp</span>
                            </button>
                            <button
                              onClick={(e) => deleteTrip(e, trip)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-800 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-red-100 group/btn shrink-0"
                            >
                              <Trash2 size={14} className="transition-transform group-hover/btn:scale-110" />
                              <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Delete</span>
                            </button>
                          </div>

                          {/* 5. Star and Archive Labels (Vertical, Rightmost) */}
                          <div className="flex flex-row md:flex-col gap-1.5 shrink-0 md:border-l border-gray-100 md:pl-2.5 min-w-[80px] justify-center">
                            <button 
                              onClick={(e) => toggleFavorite(e, trip)} 
                              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-yellow-600 transition-colors"
                            >
                              <Star size={14} className={trip.isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-400"} />
                              <span className="uppercase tracking-wide">Favourite</span>
                            </button>
                            <button 
                              onClick={(e) => toggleArchive(e, trip)} 
                              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              <Archive size={14} className={trip.isArchived ? "fill-gray-400 text-gray-500" : "text-gray-400"} />
                              <span className="uppercase tracking-wide">Archive</span>
                            </button>
                          </div>
                          
                        </div>
                      </div>
                    );
                  }

                  return (
                  <div
                    key={trip.id}
                    className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 bg-white overflow-hidden animate-fade-in-up delay-${Math.min(idx + 1, 5)} flex flex-col relative group`}
                  >
                    {/* Top Thin Strip */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${headingBg}`} />

                    {/* Main Card Content */}
                    <div className="p-4 pt-5 flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`}>
                          {trip.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-base text-gray-900 truncate mb-0.5" title={trip.title}>
                                {trip.title}
                              </h3>
                              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <Calendar size={12} className="text-gray-400" />
                                {new Date(trip.startDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
                               <button onClick={(e) => toggleFavorite(e, trip)} className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 hover:text-yellow-600 transition-colors">
                                 <Star size={12} className={trip.isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-400"} />
                                 <span>Favourite</span>
                               </button>
                               <button onClick={(e) => toggleArchive(e, trip)} className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 hover:text-gray-900 transition-colors">
                                 <Archive size={12} className={trip.isArchived ? "fill-gray-400 text-gray-500" : "text-gray-400"} />
                                 <span>Archive</span>
                               </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/50 rounded-xl p-3 mb-4 border border-gray-100 mt-auto">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Expenses</span>
                          <span className="text-sm font-bold text-gray-900">₹{(trip.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Advance</span>
                          <span className="text-xs font-semibold text-gray-500">₹{trip.advanceDrawn.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-100">
                        {/* Quick Actions */}
                        <button
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            handleSidebarViewChange("trip-detail");
                            fetchTripExpenses(trip.id);
                          }}
                          className="w-full px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-start gap-2 border border-gray-100 group/btn"
                          title="View Details"
                        >
                          <Eye size={16} className="transition-transform group-hover/btn:scale-110" />
                          <span className="text-xs font-semibold whitespace-nowrap">View Trip</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setShowAddExpenseForm(true);
                          }}
                          className="w-full px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-start gap-2 border border-gray-100 group/btn"
                          title="Add Expense"
                        >
                          <Plus size={16} className="transition-transform group-hover/btn:scale-110" />
                          <span className="text-xs font-semibold whitespace-nowrap">Add Expense</span>
                        </button>
                        <button
                          onClick={(e) => deleteTrip(e, trip)}
                          className="w-full px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-800 hover:text-white rounded-lg transition-colors flex items-center justify-start gap-2 border border-red-100 group/btn"
                          title="Delete Trip"
                        >
                          <Trash2 size={16} className="transition-transform group-hover/btn:scale-110" />
                          <span className="text-xs font-semibold whitespace-nowrap">Delete Trip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            ); })()}
        </div>
      </div>
    </div>
  );
});
