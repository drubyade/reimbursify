"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { TripManagement } from "@/components/trip-management";
import { FormSelection } from "@/components/form-selection";
import { FormInterface } from "@/components/form-interface";
import { ReimbursementsView } from "@/components/reimbursements-view";

export default function FloatingFormsDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [activeTab, setActiveTab] = useState<"trips" | "reimbursements">("trips");
  const [currentView, setCurrentView] = useState<"dashboard" | "forms" | "filling">("dashboard");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        if (!session?.user?.id) {
          router.push("/auth/signin");
          return;
        }

        setUserName(session.user.name || session.user.email?.split("@")[0] || "User");
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        router.push("/auth/signin");
      }
    };

    checkSession();
  }, [router]);

  const handleSelectTrip = async (tripId: string) => {
    setSelectedTripId(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTrip(data.trip || data);
        setCurrentView("forms");
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
    }
  };

  const handleSelectForm = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentView("filling");
  };

  const handleFormSubmitted = () => {
    setCurrentView("dashboard");
    setSelectedTripId(null);
    setSelectedFormId(null);
    setSelectedTrip(null);
    if (activeTab === "reimbursements") {
      setCurrentView("dashboard");
    }
  };

  const handleSelectFormFromReimbursements = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentView("filling");
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafbfa" }}>
        <Header title="Floating Forms" showAuthButtons={false} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ color: "var(--text-primary)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafbfa" }}>
      <Header title="Floating Forms" showAuthButtons={true} />
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", width: "100%", flex: 1 }}>
        <div
          style={{
            display: "flex",
            gap: "2rem",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "2rem",
            paddingBottom: "1rem",
          }}
        >
          <button
            onClick={() => {
              setActiveTab("trips");
              setCurrentView("dashboard");
            }}
            style={{
              padding: "0.75rem 1.5rem",
              borderBottom: activeTab === "trips" ? "2px solid #1f2937" : "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "trips" ? "600" : "500",
              color: activeTab === "trips" ? "#1f2937" : "#6b7280",
              fontSize: "1rem",
              transition: "all 0.2s",
            }}
          >
            Trips & Expenses
          </button>
          <button
            onClick={() => {
              setActiveTab("reimbursements");
              setCurrentView("dashboard");
            }}
            style={{
              padding: "0.75rem 1.5rem",
              borderBottom: activeTab === "reimbursements" ? "2px solid #1f2937" : "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "reimbursements" ? "600" : "500",
              color: activeTab === "reimbursements" ? "#1f2937" : "#6b7280",
              fontSize: "1rem",
              transition: "all 0.2s",
            }}
          >
            Reimbursements
          </button>
        </div>

        {activeTab === "trips" && (
          <>
            {currentView === "dashboard" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
                    Your Trips & Expenses
                  </h2>
                  <button
                    onClick={() => {
                      setActiveTab("reimbursements");
                      setCurrentView("dashboard");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      backgroundColor: "#0ea5e9",
                      color: "#fff",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0284c7";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0ea5e9";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    📋 View Reimbursements
                  </button>
                </div>
                <TripManagement onSelectTrip={handleSelectTrip} />
              </>
            )}

            {currentView === "forms" && (
              <FormSelection
                tripId={selectedTripId!}
                onSelectForm={handleSelectForm}
                onCancel={() => setCurrentView("dashboard")}
              />
            )}

            {currentView === "filling" && selectedTripId && selectedFormId && (
              <FormInterface
                tripId={selectedTripId}
                formId={selectedFormId}
                trip={selectedTrip}
                onSubmit={handleFormSubmitted}
                onBack={() => setCurrentView("dashboard")}
              />
            )}
          </>
        )}

        {activeTab === "reimbursements" && (
          <>
            {currentView === "dashboard" && (
              <ReimbursementsView onSelectForm={handleSelectFormFromReimbursements} />
            )}

            {currentView === "filling" && selectedFormId && (
              <FormInterface
                tripId={selectedTripId || ""}
                formId={selectedFormId}
                trip={selectedTrip}
                onSubmit={handleFormSubmitted}
                onBack={() => setCurrentView("dashboard")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
