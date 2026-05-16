import re

with open("src/components/trips-dashboard.tsx", "r") as f:
    content = f.read()

# 1. Extract Add Trip Form
# We look for: {/* Add Trip Form View */} ... down to the end of the form.
# The form ends at `            </form>\n          )}`
add_trip_start = content.find('{/* Add Trip Form View */}')
if add_trip_start == -1:
    print("Could not find Add Trip Form View")
    exit(1)

add_trip_end = content.find('</form>\n          )}', add_trip_start) + len('</form>\n          )}')

add_trip_block = content[add_trip_start:add_trip_end]

# Modify the extracted block to be a modal
modified_add_trip = add_trip_block.replace(
    '{sidebarView === "add-trip" && (',
    '{showNewTripForm && (\n        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">\n          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all animate-scale-in my-8 relative max-h-[90vh] flex flex-col">\n            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">\n              <h2 className="text-xl font-bold text-[var(--primary)]">New Trip</h2>\n              <button type="button" onClick={() => { setShowNewTripForm(false); setSidebarView("trips"); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">\n                ✕\n              </button>\n            </div>\n            <div className="p-6 overflow-y-auto">\n'
)
modified_add_trip = modified_add_trip.replace('</form>\n          )}', '</form>\n            </div>\n          </div>\n        </div>\n      )}')

# 2. Extract Add Expense Form
add_exp_start = content.find('{/* Add Expense Form View */}')
if add_exp_start == -1:
    print("Could not find Add Expense Form View")
    exit(1)

add_exp_end = content.find('</form>\n          )}', add_exp_start) + len('</form>\n          )}')

add_exp_block = content[add_exp_start:add_exp_end]

# Modify the extracted block to be a modal
modified_add_exp = add_exp_block.replace(
    '{(sidebarView === "add-expense" || sidebarView === "edit-expense") && (',
    '{(showAddExpenseForm || sidebarView === "edit-expense") && (\n        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">\n          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all animate-scale-in my-8 relative max-h-[90vh] flex flex-col">\n            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">\n              <h2 className="text-xl font-bold text-[var(--primary)]">{sidebarView === "edit-expense" ? "Edit Expense" : "Add Expense"}</h2>\n              <button type="button" onClick={() => { setShowAddExpenseForm(false); setSidebarView("trips"); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">\n                ✕\n              </button>\n            </div>\n            <div className="p-6 overflow-y-auto">\n'
)
modified_add_exp = modified_add_exp.replace('</form>\n          )}', '</form>\n            </div>\n          </div>\n        </div>\n      )}')

# 3. Remove the blocks from their original location
content = content[:add_trip_start] + content[add_exp_end:]

# 4. Insert the modified blocks right after `return (\n    <div style={{ display: "flex", height: "100%", width: "100%" }}>`
insert_target = 'return (\n    <div style={{ display: "flex", height: "100%", width: "100%" }}>'
insert_pos = content.find(insert_target) + len(insert_target)

modals = f'\n      {modified_add_trip}\n      {modified_add_exp}\n'
content = content[:insert_pos] + modals + content[insert_pos:]

# 5. Fix the sidebar display logic and Main Content Area display logic
# Sidebar should only display if trip-detail
content = content.replace(
    'display: sidebarView === "trips" ? "none" : "flex",',
    'display: sidebarView === "trip-detail" ? "flex" : "none",'
)

# Main Content Area should only hide if trip-detail
content = content.replace(
    'className={`flex-1 overflow-y-auto ${sidebarView === "trips" ? "block" : "hidden"} bg-gray-50/50 p-6 md:p-10 h-full`}',
    'className={`flex-1 overflow-y-auto ${sidebarView === "trip-detail" ? "hidden" : "block"} bg-gray-50/50 p-6 md:p-10 h-full`}'
)

with open("src/components/trips-dashboard.tsx", "w") as f:
    f.write(content)

print("Modification complete.")
