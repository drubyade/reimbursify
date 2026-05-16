"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Archive, Plus, LayoutGrid, List, Calendar, Building2, ArrowLeft, UserPlus, Trash2, X } from "lucide-react";

interface Group {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  createdAt: string;
  secretKey: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  _count?: {
    members: number;
  };
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Views
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    const savedViewMode = localStorage.getItem("reimbursify_admin_group_view_mode");
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }

    const savedSearchQuery = localStorage.getItem("reimbursify_admin_groups_search");
    if (savedSearchQuery !== null) setSearchQuery(savedSearchQuery);

    const savedSortBy = localStorage.getItem("reimbursify_admin_groups_sort");
    if (savedSortBy) setSortBy(savedSortBy);

    const savedShowArchived = localStorage.getItem("reimbursify_admin_groups_show_archived");
    if (savedShowArchived === "true") setShowArchived(true);

    fetchGroups();
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("reimbursify_admin_group_view_mode", mode);
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });

      if (res.ok) {
        setNewGroupName("");
        setNewGroupDesc("");
        setIsModalOpen(false);
        fetchGroups();
      } else {
        alert("Failed to create group");
      }
    } catch (error) {
      console.error("Failed to create group", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArchive = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();

    try {
      const updatedGroup = { ...group, isArchived: !group.isArchived };
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));

      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: updatedGroup.isArchived }),
      });
      
      if (!res.ok) {
         // revert if failed
         setGroups(prev => prev.map(g => g.id === group.id ? group : g));
         alert("Failed to update group archive status");
      }
    } catch (err) {
      console.error("Failed to toggle archive", err);
      // revert if failed
      setGroups(prev => prev.map(g => g.id === group.id ? group : g));
    }
  };

  // ── Collaborator Modal State ──
  const [collabModalGroupId, setCollabModalGroupId] = useState<string | null>(null);
  const [collabList, setCollabList] = useState<Array<{ id: string; user: { id: string; name: string; email: string; role: string } }>>([]); 
  const [collabEmail, setCollabEmail] = useState("");
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);

  const openCollabModal = async (groupId: string) => {
    setCollabModalGroupId(groupId);
    setCollabError(null);
    setCollabEmail("");
    setCollabLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollabList(data.collaborators || []);
      }
    } catch (err) { console.error(err); }
    finally { setCollabLoading(false); }
  };

  const addCollaborator = async () => {
    if (!collabEmail.trim() || !collabModalGroupId) return;
    setCollabError(null);
    try {
      const res = await fetch(`/api/groups/${collabModalGroupId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: collabEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollabList((prev) => [data.collaborator, ...prev]);
        setCollabEmail("");
      } else {
        setCollabError(data.error || "Failed to add collaborator");
      }
    } catch (err) {
      setCollabError("Network error");
    }
  };

  const removeCollaborator = async (userId: string) => {
    if (!collabModalGroupId) return;
    try {
      await fetch(`/api/groups/${collabModalGroupId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setCollabList((prev) => prev.filter((c) => c.user.id !== userId));
    } catch (err) { console.error(err); }
  };

  const containerBgClass = showArchived ? "bg-[#81988d]" : "bg-gray-50/50";
  const textColorClass = showArchived ? "text-white" : "text-gray-900";
  const headerTitle = showArchived ? "Archived Groups" : "Manage Groups";

  return (
    <div className={`flex-1 overflow-y-auto ${containerBgClass} px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Hero Header Wrapper to fix scroll overlap */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {showArchived && (
                <button 
                  onClick={() => setShowArchived(false)}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {headerTitle}
                </h2>
                <p className="text-blue-100/90 text-sm md:text-base max-w-md font-medium">
                  Create and manage groups. Share the Group ID and Secret Key with users.
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
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2.5 px-5 py-2 h-[40px] w-full md:w-48 bg-white text-blue-700 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border border-white/80 shrink-0"
              >
                <Plus size={18} />
                Create Group
              </button>
            </div>
          </div>
          {/* Filter Tabs & Search/Sort */}
          <div className="relative z-10 mt-3 flex flex-col md:flex-row gap-3 justify-between items-center animate-fade-in-up delay-1 w-full">
              <button
                onClick={() => {
                  const newArchivedState = !showArchived;
                  setShowArchived(newArchivedState);
                  localStorage.setItem("reimbursify_admin_groups_show_archived", String(newArchivedState));
                }}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all border ${
                  showArchived 
                    ? "bg-white text-blue-700 font-bold shadow-md border-white" 
                    : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:text-white font-medium"
                }`}
              >
                <Archive size={16} />
                <span>Archived Groups</span>
              </button>

            <div className="flex w-full md:w-auto gap-2 items-center">
              <input 
                type="text" 
                placeholder="Search groups..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  localStorage.setItem("reimbursify_admin_groups_search", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-blue-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
              />
              <select 
                value={sortBy}
                onChange={e => {
                  setSortBy(e.target.value);
                  localStorage.setItem("reimbursify_admin_groups_sort", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-blue-800 [&>option]:text-white"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
              </select>
            </div>
          </div>
        </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner !w-8 !h-8 border-4 border-[var(--primary)]" />
          </div>
        ) : groups.length === 0 ? (
          <div className="animate-fade-in-up delay-3 bg-[var(--bg-secondary)] rounded-2xl p-16 text-center border-2 border-dashed border-[var(--primary-lighter)] bg-white/50">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-600 flex items-center justify-center mb-6 shadow-md">
              <Building2 size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">No Groups Yet</h2>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto text-base">
              You haven't created any groups. Create your first group and invite users to submit forms to you.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[#023e8a] transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <Plus size={20} />
              Create Your First Group
            </button>
          </div>
        ) : (() => {
          const filteredAndSortedGroups = groups
            .filter(g => showArchived ? g.isArchived : !g.isArchived)
            .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) || g.groupId.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
              if (sortBy === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (sortBy === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              if (sortBy === "name-asc") return a.name.localeCompare(b.name);
              if (sortBy === "name-desc") return b.name.localeCompare(a.name);
              return 0;
            });

          if (filteredAndSortedGroups.length === 0) {
            return (
              <div className={`py-20 text-center ${showArchived ? 'text-white' : 'text-gray-500'}`}>
                <p>No groups match your current filters and search.</p>
              </div>
            );
          }

          return (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              {filteredAndSortedGroups.map((group, idx) => {
                const avatarGradient = "from-blue-600 to-emerald-700";

                if (viewMode === "list") {
                  return (
                    <div
                      key={group.id}
                      className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden animate-fade-in-up cursor-pointer group/card border border-gray-200 flex flex-col md:flex-row`}
                    >
                      <div className="w-1.5 bg-gradient-to-b from-blue-600 to-blue-800 shrink-0 hidden md:block" />
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-blue-800 shrink-0 md:hidden block" />
                      <div className="flex-1 p-2 md:p-2.5 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-2.5 bg-white">
                        
                        {/* 1. Avatar & Title Info */}
                        <div className="flex items-center gap-2.5 flex-[1.5] min-w-0 w-full">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`}>
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                            <h3 className="font-bold text-base text-gray-900 truncate" title={group.name}>
                              {group.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-gray-500">
                              <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                              <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {group.groupId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Description */}
                        <div className="flex-[2] shrink-0 md:border-l border-gray-100 md:pl-2.5 min-w-[150px]">
                          <div className="text-[11px] md:text-xs text-gray-600 line-clamp-2 leading-relaxed mb-1">
                            {group.description || "No description provided."}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-mono">
                                <span>Key:</span>
                                <span className="text-rose-600 font-bold">{group.secretKey}</span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                <Users size={10} />
                                <span>{group._count?.members || 1} Members</span>
                             </div>
                          </div>
                        </div>
                        
                        {/* 3. Actions */}
                        <div className="flex shrink-0 md:border-l border-gray-100 md:pl-2.5 pt-2 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 items-center justify-end">
                          <button
                            onClick={(e) => toggleArchive(e, group)}
                            className="px-2.5 py-1.5 bg-[#eaf5f0] text-[#0077b6] hover:bg-[#d1e6db] border border-[#0077b6]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Archive size={12} />
                            {group.isArchived ? "Unarchive" : "Archive"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openCollabModal(group.id); }}
                            className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <UserPlus size={12} />
                            Collaborators
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Grid View
                return (
                  <div
                    key={group.id}
                    className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden animate-fade-in-up cursor-pointer group/card border border-gray-200 flex flex-col relative`}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-blue-800 absolute top-0 left-0" />
                    {/* Top Section */}
                    <div className="p-4 pt-5 flex flex-col border-b border-gray-100 bg-gray-50/30">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0`}>
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-lg text-gray-900 truncate mb-1" title={group.name}>
                            {group.name}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mb-1">
                            Created: {new Date(group.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <p className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100">
                              ID: {group.groupId}
                            </p>
                            <p className="text-xs font-mono text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block border border-rose-100">
                              Key: {group.secretKey}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-4 flex flex-col bg-white flex-1 justify-between relative">
                      <div className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {group.description || "No description provided."}
                      </div>
                      
                      <div className="flex justify-between mt-auto items-center">
                         <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            <Users size={12} />
                            <span>{group._count?.members || 1} Members</span>
                         </div>
                        <button
                          onClick={(e) => toggleArchive(e, group)}
                          className="px-4 py-1.5 bg-[#eaf5f0] text-[#0077b6] hover:bg-[#d1e6db] border border-[#0077b6]/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Archive size={14} />
                          {group.isArchived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCollabModal(group.id); }}
                          className="px-4 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5"
                        >
                          <UserPlus size={14} />
                          Collaborators
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ); })()}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
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
            maxWidth: "450px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }} className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Create Group
              </h2>
            </div>
            
            <form onSubmit={handleCreateGroup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sales Team Q3"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Brief description of this group..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newGroupName.trim()}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborator Modal */}
      {collabModalGroupId && (
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
            padding: "2rem",
            borderRadius: "1.5rem",
            width: "100%",
            maxWidth: "480px",
            maxHeight: "80vh",
            overflow: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }} className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <UserPlus size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Group Collaborators</h2>
              </div>
              <button onClick={() => setCollabModalGroupId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Add Collaborator */}
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={collabEmail}
                onChange={(e) => { setCollabEmail(e.target.value); setCollabError(null); }}
                placeholder="Enter user email..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none text-sm"
                onKeyDown={(e) => e.key === "Enter" && addCollaborator()}
              />
              <button
                onClick={addCollaborator}
                disabled={!collabEmail.trim()}
                className="px-4 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
              >
                Add
              </button>
            </div>
            {collabError && (
              <p className="text-red-600 text-xs font-medium mb-3 bg-red-50 p-2 rounded-lg border border-red-100">{collabError}</p>
            )}

            {/* Collaborator List */}
            {collabLoading ? (
              <p className="text-center text-gray-400 py-8 text-sm">Loading...</p>
            ) : collabList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No collaborators yet.</p>
                <p className="text-gray-300 text-xs mt-1">Add users by email to assign them to signature fields.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collabList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(c.user.name || c.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.user.name || "Unnamed"}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-gray-500 truncate">{c.user.email}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            c.user.role === "ADMINISTRATOR" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {c.user.role === "ADMINISTRATOR" ? "Admin" : "Submitter"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCollaborator(c.user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remove collaborator"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
