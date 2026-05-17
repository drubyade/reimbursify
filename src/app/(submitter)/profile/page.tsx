"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";



interface PaymentCard {
  id: string;
  label: string;
  cardType: string;
  maskedNumber: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ label: "", type: "UPI", customType: "", details: "" });



  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchPaymentCards = async () => {
      try {
        const cardsResponse = await fetch("/api/profile/payment-cards", { headers: { "Cache-Control": "no-cache" } });
        if (cardsResponse.ok) {
          const cardsData = await cardsResponse.json();
          setPaymentCards(cardsData.cards || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment cards");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentCards();
    const id = setInterval(fetchPaymentCards, 500);
    return () => clearInterval(id);
  }, [session?.user?.id]);


  const handleAddCard = async () => {
    if (!newPaymentMethod.label) {
      setError("Please provide a label for the payment method.");
      return;
    }
    
    const finalType = newPaymentMethod.type === "Custom" ? newPaymentMethod.customType : newPaymentMethod.type;
    if (!finalType) {
      setError("Please provide a valid payment method type.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/profile/payment-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardLabel: newPaymentMethod.label,
          cardType: finalType,
          maskedNumber: newPaymentMethod.details || "N/A",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add payment method");
      }

      const data = await response.json();
      setPaymentCards([data.card, ...paymentCards]);
      setIsAddingCard(false);
      setNewPaymentMethod({ label: "", type: "UPI", customType: "", details: "" });
      setSuccess("Payment method added successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add payment method");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                <CreditCard size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Payment Cards
                </h2>
                <p className="text-emerald-100/90 text-sm md:text-base max-w-md font-medium">
                  Manage your payment methods
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>

      {error && (
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
      )}

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "#efe",
            border: "1px solid #cfc",
            borderRadius: "0.5rem",
            color: "#3c3",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}




      {/* Payment Cards Section */}
      <div
        style={{
          padding: "2rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", margin: 0 }}>
            Payment Methods
          </h2>
          {!isAddingCard && (
            <button
              onClick={() => setIsAddingCard(true)}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              ➕ Add Method
            </button>
          )}
        </div>

        {isAddingCard && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", marginTop: 0 }}>Add Payment Method</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Label (e.g. My HDFC Card, My UPI)</label>
                <input
                  type="text"
                  value={newPaymentMethod.label}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, label: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                  placeholder="e.g. Personal UPI"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Method Type</label>
                <select
                  value={newPaymentMethod.type}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>
            </div>
            {newPaymentMethod.type === "Custom" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Custom Method Name</label>
                <input
                  type="text"
                  value={newPaymentMethod.customType}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, customType: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                  placeholder="e.g. Crypto Wallet"
                />
              </div>
            )}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Details (Optional)</label>
              <input
                type="text"
                value={newPaymentMethod.details}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, details: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                placeholder="e.g. ****1234 or yourname@upi"
              />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleAddCard}
                disabled={saving}
                style={{ padding: "0.75rem 1.5rem", background: "var(--success)", color: "white", border: "none", borderRadius: "0.4rem", cursor: "pointer", fontWeight: "500", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save Method"}
              </button>
              <button
                onClick={() => setIsAddingCard(false)}
                disabled={saving}
                style={{ padding: "0.75rem 1.5rem", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "0.4rem", cursor: "pointer", fontWeight: "500" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {paymentCards.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              background: "var(--bg-primary)",
              borderRadius: "0.5rem",
              color: "var(--text-muted)",
            }}
          >
            <p>No payment methods saved yet</p>
            <button
              onClick={() => setIsAddingCard(true)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
              }}
            >
              ➕ Add Payment Method
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {paymentCards.map((card) => (
              <div
                key={card.id}
                style={{
                  padding: "1rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)", margin: "0 0 0.25rem 0" }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                    {card.cardType} • {card.maskedNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // TODO: Add delete functionality
                    alert("Delete payment method feature coming soon");
                  }}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "var(--danger)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.3rem",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      </div>
    </main>
  );
}
