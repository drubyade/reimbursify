"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Archive, Plus, LayoutGrid, List, Calendar, Building2, ArrowLeft } from "lucide-react";
import { cacheGroups, getCachedGroups, cacheSingleGroup, addToSyncQueue, flushSyncQueue, getSyncQueue } from "@/lib/offline-db";

interface Group {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  createdAt: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isGloballyArchived?: boolean;
}

export default function UserGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [joinSecretKey, setJoinSecretKey] = useState("");
  const [joining, setJoining] = useState(false);

  // Views
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    const savedViewMode = localStorage.getItem("reimbursify_group_view_mode");
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }

    const savedSearchQuery = localStorage.getItem("reimbursify_groups_search");
    if (savedSearchQuery !== null) setSearchQuery(savedSearchQuery);

    const savedSortBy = localStorage.getItem("reimbursify_groups_sort");
    if (savedSortBy) setSortBy(savedSortBy);

    const savedShowArchived = localStorage.getItem("reimbursify_groups_show_archived");
    if (savedShowArchived === "true") setShowArchived(true);

    fetchGroups();
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("reimbursify_group_view_mode", mode);
  };

  const fetchGroups = async () => {
    setLoading(true);

    // ── Serve cached data immediately (offline-first) ──────────────────────
    try {
      const cached = await getCachedGroups();
      if (cached.length > 0) {
        setGroups(cached);
        setLoading(false); // Show cached data instantly
      }
    } catch (_) {}

    // ── Then hit the network and update both UI + cache ────────────────────
    try {
      // Get pending queue BEFORE flushing so we know what's in-flight
      const syncQueue = await getSyncQueue();
      const pendingGroupIds = syncQueue.map(item => {
        const match = item.url.match(/\/api\/groups\/([^/]+)\/preferences/);
        return match ? match[1] : null;
      }).filter(Boolean);

      const res = await fetch("/api/groups", { headers: { "Cache-Control": "no-cache" } });
      if (res.ok) {
        const data = await res.json();
        const serverGroups = data.groups || [];

        const localGroups = await getCachedGroups();
        const mergedGroups = serverGroups.map((serverGroup: Group) => {
          const local = localGroups.find((g: Group) => g.groupId === serverGroup.groupId);
          if (local) {
            // Prefer local if it's currently in the sync queue
            if (pendingGroupIds.includes(serverGroup.groupId)) {
              return local;
            }
            // Prefer local if it was cached extremely recently (under 5 seconds ago)
            // This prevents race conditions where the queue just flushed but the DB fetch is stale
            if (local._cachedAt && Date.now() - local._cachedAt < 5000) {
              return local;
            }
          }
          return serverGroup;
        });

        setGroups(mergedGroups);
        await cacheGroups(mergedGroups).catch(() => {});
      }

      // Flush queue AFTER applying logic
      flushSyncQueue().catch(() => {});
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinGroupId || !joinSecretKey) return;

    setJoining(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: joinGroupId, secretKey: joinSecretKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setJoinGroupId("");
        setJoinSecretKey("");
        setIsJoinModalOpen(false);
        fetchGroups();
      } else {
        alert(data.error || "Failed to join group");
      }
    } catch (error) {
      console.error("Join group error", error);
      alert("Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  const toggleArchive = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (group.isGloballyArchived) return; // Prevent unarchiving if globally archived

    try {
      const updatedGroup = { ...group, isArchived: !group.isArchived };
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));

      // Update local IDB cache instantly
      await cacheSingleGroup(updatedGroup).catch(() => {});

      // Add to sync queue for offline support
      const url = `/api/groups/${group.groupId}/preferences`;
      const body = JSON.stringify({ isArchived: updatedGroup.isArchived });
      
      await addToSyncQueue({
        url,
        method: "PATCH",
        body,
        description: `${updatedGroup.isArchived ? "Archived" : "Unarchived"} group: ${group.name}`,
      }).catch(() => {});

      // Attempt to flush queue
      flushSyncQueue().catch(() => {});
    } catch (err) {
      console.error("Failed to toggle archive", err);
    }
  };

  const containerBgClass = showArchived ? "bg-[#81988d]" : "bg-gray-50/50";
  const textColorClass = showArchived ? "text-white" : "text-gray-900";
  const headerTitle = showArchived ? "Archived Groups" : "Groups";

  return (
    <div className={`flex-1 overflow-y-auto ${containerBgClass} px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 p-4 md:p-5 shadow-xl animate-fade-in-up">
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
                <p className="text-purple-100/90 text-sm md:text-base max-w-md font-medium">
                  Connect with clubs and manage your group expenses.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* View Toggle */}
              <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-sm items-center h-[40px] w-full md:w-48">
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`flex-1 flex justify-center items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-all h-full ${viewMode === 'grid' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutGrid size={16} />
                  Grid
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`flex-1 flex justify-center items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-all h-full ${viewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  <List size={16} />
                  List
                </button>
              </div>

              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center justify-center gap-2.5 px-5 py-2 h-[40px] w-full md:w-48 bg-white text-purple-700 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border border-white/80 shrink-0"
              >
                <Plus size={18} />
                Join Group
              </button>
            </div>
          </div>
          {/* Filter Tabs & Search/Sort */}
          <div className="relative z-10 mt-3 flex flex-col md:flex-row gap-3 justify-between items-center animate-fade-in-up delay-1 w-full">
              <button
                onClick={() => {
                  const newArchivedState = !showArchived;
                  setShowArchived(newArchivedState);
                  localStorage.setItem("reimbursify_groups_show_archived", String(newArchivedState));
                }}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all border ${
                  showArchived 
                    ? "bg-white text-purple-700 font-bold shadow-md border-white" 
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
                  localStorage.setItem("reimbursify_groups_search", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-purple-200 focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none backdrop-blur-sm"
              />
              <select 
                value={sortBy}
                onChange={e => {
                  setSortBy(e.target.value);
                  localStorage.setItem("reimbursify_groups_sort", e.target.value);
                }}
                className="w-full md:w-48 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none cursor-pointer backdrop-blur-sm [&>option]:bg-purple-800 [&>option]:text-white"
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
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mb-6">
              <Building2 size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">Not in any groups</h2>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto text-base">
              You haven't joined any groups yet. Ask a Reimbursifier for a Group ID and Secret Key to get started.
            </p>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[#023e8a] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Join a Group Now
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
                const avatarGradient = "from-blue-600 to-indigo-700";

                if (viewMode === "list") {
                  return (
                    <div
                      key={group.id}
                      className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden animate-fade-in-up cursor-pointer group/card border border-gray-200 flex flex-col md:flex-row`}
                      onClick={() => window.location.href = `/groups/${group.id}`}
                    >
                      <div className="w-1.5 bg-gradient-to-b from-purple-600 to-purple-800 shrink-0 hidden md:block" />
                      <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-purple-800 shrink-0 md:hidden block" />
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
                              <span>Joined: {new Date(group.createdAt).toLocaleDateString()}</span>
                              <span className="font-mono text-[10px] text-[var(--primary)] font-bold bg-[var(--primary-lightest)] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {group.groupId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Description */}
                        <div className="flex-[2] shrink-0 md:border-l border-gray-100 md:pl-2.5 min-w-[150px]">
                          <div className="text-[11px] md:text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {group.description || "No description provided."}
                          </div>
                        </div>
                        
                        {/* 3. Actions */}
                        <div className="flex shrink-0 md:border-l border-gray-100 md:pl-2.5 pt-2 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 items-center justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!group.isGloballyArchived) {
                                toggleArchive(e, group);
                              }
                            }}
                            disabled={group.isGloballyArchived}
                            title={group.isGloballyArchived ? "Group archived by reimbursifier" : ""}
                            className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0 ${
                              group.isGloballyArchived 
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                                : "bg-[#eaf5f0] text-[#0077b6] hover:bg-[#d1e6db] border-[#0077b6]/20 cursor-pointer"
                            }`}
                          >
                            <Archive size={12} />
                            {group.isGloballyArchived ? "Archived by Admin" : (group.isArchived ? "Unarchive" : "Archive")}
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
                    onClick={() => window.location.href = `/groups/${group.id}`}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-purple-800 absolute top-0 left-0" />
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
                            Joined: {new Date(group.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs font-mono text-[var(--primary)] font-bold bg-[var(--primary-lightest)] px-2 py-0.5 rounded-md inline-block">
                            {group.groupId}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-4 flex flex-col bg-white flex-1 justify-between relative">
                      <div className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {group.description || "No description provided."}
                      </div>
                      
                      <div className="flex justify-end mt-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!group.isGloballyArchived) toggleArchive(e, group);
                          }}
                          disabled={group.isGloballyArchived}
                          title={group.isGloballyArchived ? "Group archived by reimbursifier" : ""}
                          className={`px-4 py-1.5 border rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
                            group.isGloballyArchived 
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                              : "bg-[#eaf5f0] text-[#0077b6] hover:bg-[#d1e6db] border-[#0077b6]/20 cursor-pointer"
                          }`}
                        >
                          <Archive size={14} />
                          {group.isGloballyArchived ? "Archived by Admin" : (group.isArchived ? "Unarchive" : "Archive")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ); })()}
      </div>

      {/* Join Modal */}
      {isJoinModalOpen && (
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
              <div className="w-12 h-12 bg-[var(--primary-lightest)] text-[var(--primary)] rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Join Group
              </h2>
            </div>
            
            <form onSubmit={handleJoinGroup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Group ID
                </label>
                <input
                  type="text"
                  required
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value)}
                  placeholder="e.g. GRP-XYZ123"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Secret Key
                </label>
                <input
                  type="text"
                  required
                  value={joinSecretKey}
                  onChange={(e) => setJoinSecretKey(e.target.value)}
                  placeholder="e.g. SEC-ABC45678"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || !joinGroupId || !joinSecretKey}
                  className="flex-1 py-3 px-4 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[#023e8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? "Joining..." : "Join"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
