"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plane, Calendar, CheckCircle2, DollarSign, FileCheck, Clock, PieChart, BarChart, Star } from "lucide-react";

interface DashboardStats {
  totalTrips: number;
  completedTrips: number;
  ongoingTrips: number;
  totalExpenses: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  categoryBreakdown: { category: string; amount: number; count: number }[];
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", department: "", designation: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch profile
        fetch("/api/profile")
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setProfile(data.user);
              setProfileForm({
                name: data.user.name || "",
                department: data.user.department || "",
                designation: data.user.designation || "",
              });
            }
          })
          .catch(console.error);

        // Fetch all trips to calculate stats
        const tripsResponse = await fetch("/api/trips?archived=false");
        if (!tripsResponse.ok) throw new Error("Failed to fetch trips");

        const tripsData = await tripsResponse.json();
        const trips = tripsData.trips || [];

        // Calculate statistics
        const completedTrips = trips.filter((t: any) => t.isCompleted).length;
        const ongoingTrips = trips.filter((t: any) => !t.isCompleted).length;

        let totalExpenses = 0;
        let totalAmount = 0;
        const categoryBreakdown: { [key: string]: { amount: number; count: number } } = {};

        trips.forEach((trip: any) => {
          if (trip.expenses) {
            trip.expenses.forEach((exp: any) => {
              totalExpenses++;
              totalAmount += exp.amount;

              if (!categoryBreakdown[exp.category]) {
                categoryBreakdown[exp.category] = { amount: 0, count: 0 };
              }
              categoryBreakdown[exp.category].amount += exp.amount;
              categoryBreakdown[exp.category].count++;
            });
          }
        });

        setStats({
          totalTrips: trips.length,
          completedTrips,
          ongoingTrips,
          totalExpenses,
          totalAmount,
          approvedAmount: totalAmount * 0.8, // Mock: 80% approved
          pendingAmount: totalAmount * 0.2, // Mock: 20% pending
          categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
            category,
            amount: data.amount,
            count: data.count,
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session?.user?.id]);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const data = await response.json();
      setProfile(data.user);
      setEditingProfile(false);
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading dashboard...</div>;
  }

  if (!session) {
    return null;
  }

  const displayError = error ? (
    <div
      style={{
        padding: "1rem",
        background: "#fee",
        border: "1px solid #fcc",
        borderRadius: "0.5rem",
        color: "#c33",
        marginBottom: "1rem",
      }}
    >
      {error}
    </div>
  ) : null;

  if (!stats) {
    return (
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {displayError}
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No data available yet</p>
      </main>
    );
  }

  const StatCard = ({ label, value, unit = "", colorClass = "bg-blue-500", icon: Icon }: any) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center animate-fade-in-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${colorClass} shadow-sm`}>
        {Icon && <Icon size={24} />}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900">
        {value}{unit}
      </p>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-gray-50/50">
      <main className="w-full lg:w-[65%] overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full border-r border-gray-200">
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-500 to-pink-500 p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                <BarChart size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Dashboard
                </h2>
                <p className="text-fuchsia-100/90 text-sm md:text-base max-w-md font-medium">
                  Overview of your travel and expenses
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {displayError}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Trips" value={stats.totalTrips} icon={Plane} colorClass="bg-blue-500" />
        <StatCard label="Ongoing Trips" value={stats.ongoingTrips} icon={Calendar} colorClass="bg-purple-500" />
        <StatCard label="Completed Trips" value={stats.completedTrips} icon={CheckCircle2} colorClass="bg-teal-500" />
        <StatCard label="Total Expenses" value={stats.totalExpenses} icon={DollarSign} colorClass="bg-orange-500" />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-1">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Total Amount
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ₹{stats.totalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Across all expenses
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-2">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Approved
          </p>
          <p className="text-3xl font-bold text-green-600 mb-1">
            ₹{stats.approvedAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Ready for reimbursement
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-3">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Pending
          </p>
          <p className="text-3xl font-bold text-amber-500 mb-1">
            ₹{stats.pendingAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Under review
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm mb-8 animate-fade-in-up delay-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="text-[var(--primary)]" size={24} />
            Expenses by Category
          </h2>

          <div className="space-y-4">
            {stats.categoryBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="font-semibold text-gray-800">{item.category}</span>
                  <span className="text-gray-500 text-sm">
                    {item.count} {item.count === 1 ? 'expense' : 'expenses'}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden flex">
                  <div
                    className="bg-[image:var(--gradient-primary)] h-full transition-all duration-1000 ease-out flex items-center justify-end px-2 text-white text-[10px] font-bold"
                    style={{ width: `${Math.max((item.amount / stats.totalAmount) * 100, 5)}%` }}
                  >
                    {(item.amount / stats.totalAmount) * 100 > 10 ? `₹${item.amount.toFixed(0)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-[var(--primary-lightest)] rounded-2xl p-8 border border-[var(--primary-light)] text-center shadow-sm mb-8 animate-fade-in-up delay-5">
        <h3 className="text-xl font-bold text-[var(--primary-dark)] mb-2">
          Ready to create a new trip or add expenses?
        </h3>
        <p className="text-sm text-[var(--primary)] mb-6">
          Track your travel expenditures and manage reimbursements easily.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/trips"
            className="px-6 py-3 bg-white text-[var(--primary)] font-bold rounded-xl border border-[var(--primary-light)] hover:bg-gray-50 transition-colors shadow-sm"
          >
            📋 View All Trips
          </Link>
          <Link
            href="/trips/new"
            className="px-6 py-3 bg-[image:var(--gradient-primary)] text-white font-bold rounded-xl hover:shadow-md transition-all shadow-sm transform hover:-translate-y-0.5"
          >
            ➕ Create New Trip
          </Link>
        </div>
      </div>
        </div>
      </main>

      {/* Profile Sidebar (35%) */}
      <div className="hidden lg:block w-[35%] bg-white p-6 md:p-8 h-full shadow-inner overflow-y-auto">
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Star size={20} className="text-emerald-600" />
              My Profile
            </h2>
            {profile && (
              <button
                onClick={() => {
                  if (editingProfile) {
                    handleSaveProfile();
                  } else {
                    setEditingProfile(true);
                  }
                }}
                disabled={savingProfile}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-sm ${
                  editingProfile 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {savingProfile ? "Saving..." : editingProfile ? "Save Changes" : "Edit Profile"}
              </button>
            )}
          </div>
          {profile ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm relative">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                  {profile.name ? profile.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  {editingProfile ? (
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 mb-1 text-sm font-bold border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Full Name"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-gray-900 truncate">{profile.name}</h3>
                  )}
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  {editingProfile ? (
                    <input
                      type="text"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-semibold border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Department"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-100 min-h-[38px]">
                      {profile.department || "—"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Designation
                  </label>
                  {editingProfile ? (
                    <input
                      type="text"
                      value={profileForm.designation}
                      onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-semibold border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Designation"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-100 min-h-[38px]">
                      {profile.designation || "—"}
                    </div>
                  )}
                </div>
              </div>

              {editingProfile && (
                <div className="mt-6 pt-4 border-t border-gray-200 text-right">
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileForm({
                        name: profile.name || "",
                        department: profile.department || "",
                        designation: profile.designation || "",
                      });
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Loading profile...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
