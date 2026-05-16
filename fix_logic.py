import re

with open("src/components/trips-dashboard.tsx", "r") as f:
    content = f.read()

# 1. Update deleteTrip
old_delete = """  const deleteTrip = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${trip.title}"? This will delete all associated expenses and cannot be undone.`)) return;"""

new_delete = """  const deleteTrip = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    if ((trip.expensesCount || 0) > 0 || (trip.totalAmount || 0) > 0) {
      alert(`Cannot delete "${trip.title}" because it has existing expenses. Please delete all expenses first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete "${trip.title}"?`)) return;"""

content = content.replace(old_delete, new_delete)

# 2. Fix Modal Cancel Buttons to not mutate sidebarView
# It looks like:
#                   onClick={() => {
#                     setSidebarView(selectedTripId ? "trip-detail" : "trips");
#                     setShowAddExpenseForm(false);
#                     setEditingExpenseId(null);
#                   }}

old_cancel_expense = """                  onClick={() => {
                    setSidebarView(selectedTripId ? "trip-detail" : "trips");
                    setShowAddExpenseForm(false);
                    setEditingExpenseId(null);
                  }}"""
new_cancel_expense = """                  onClick={() => {
                    setShowAddExpenseForm(false);
                    setEditingExpenseId(null);
                  }}"""
content = content.replace(old_cancel_expense, new_cancel_expense)

old_close_expense = """onClick={() => { setShowAddExpenseForm(false); setSidebarView("trips"); }}"""
new_close_expense = """onClick={() => { setShowAddExpenseForm(false); setEditingExpenseId(null); }}"""
content = content.replace(old_close_expense, new_close_expense)


old_cancel_trip = """                  onClick={() => {
                    setSidebarView("trips");
                    setShowNewTripForm(false);
                  }}"""
new_cancel_trip = """                  onClick={() => {
                    setShowNewTripForm(false);
                  }}"""
content = content.replace(old_cancel_trip, new_cancel_trip)

old_close_trip = """onClick={() => { setShowNewTripForm(false); setSidebarView("trips"); }}"""
new_close_trip = """onClick={() => { setShowNewTripForm(false); }}"""
content = content.replace(old_close_trip, new_close_trip)

# 3. Remove `setSidebarView("add-expense")` and `setSidebarView("add-trip")` 
# from the open button handlers because they are modals now.
content = content.replace('setSidebarView("add-expense");\n', '')
content = content.replace('setSidebarView("add-trip");\n', '')


# 4. Remove the duplicate Add Expense button from the bottom of trip summary page
# We can search for the Action Buttons block.
old_action_buttons = """              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                <button
                  onClick={() => {
                    setSelectedTripId(tripDetails.id);
                    setShowAddExpenseForm(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#1b5e3f",
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
                    e.currentTarget.style.background = "#1b5e3f";
                  }}
                >
                  + Add Expense
                </button>
                <button
                  onClick={() => setSidebarView("trips")}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#1b5e3f",
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
              </div>"""

new_action_buttons = """              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                <button
                  onClick={() => setSidebarView("trips")}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#1b5e3f",
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
              </div>"""

content = content.replace(old_action_buttons, new_action_buttons)

with open("src/components/trips-dashboard.tsx", "w") as f:
    f.write(content)

print("Logic fixed!")
