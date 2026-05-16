"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, Users, ChevronRight, Search, Inbox } from "lucide-react";

interface Group {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
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

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avatarColors = [
    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #14b8a6 0%, #10b981 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  ];

  const getColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 px-6 pb-6 md:px-8 md:pb-8 pt-0 h-full w-full">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Hero Header */}
        <div className="sticky top-0 z-50 bg-gray-50 pt-3 pb-5 -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-4 md:p-5 shadow-xl animate-fade-in-up">
          {/* Decorative elements */}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner shrink-0">
                <MessageSquare size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  Messages
                </h2>
                <p className="text-indigo-100/90 text-sm md:text-base max-w-md font-medium">
                  Select a group to view direct messages
                </p>
              </div>
            </div>
          </div>
          {/* Search Bar */}
          {groups.length > 0 && (
            <div className="relative z-10 mt-4 position-relative">
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.85rem 1rem 0.85rem 2.75rem",
              borderRadius: "1rem",
              border: "1px solid var(--border)",
              background: "white",
              fontSize: "0.95rem",
              outline: "none",
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#10b981";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
            }}
            />
          </div>
        )}
        </div>
        </div>

      {/* Content */}
      {loading ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "6rem 2rem",
          gap: "1rem",
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "3px solid #e5e7eb",
            borderTopColor: "#10b981",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading your groups...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : groups.length === 0 ? (
        <div style={{
          background: "white",
          padding: "5rem 2rem",
          borderRadius: "1.5rem",
          textAlign: "center",
          border: "1px dashed var(--border)",
          boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}>
            <Inbox size={36} color="#9ca3af" />
          </div>
          <h3 style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}>
            No groups to message
          </h3>
          <p style={{
            color: "var(--text-muted)",
            maxWidth: "400px",
            margin: "0 auto 1.5rem",
            lineHeight: 1.6,
          }}>
            Join a group to start messaging members. Ask a Reimbursifier for a Group ID and Secret Key.
          </p>
          <button
            onClick={() => router.push("/groups")}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(135deg, #0077b6, #0096c7)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(27, 94, 63, 0.25)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(27, 94, 63, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(27, 94, 63, 0.25)";
            }}
          >
            Go to Groups
          </button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{
          background: "white",
          padding: "4rem 2rem",
          borderRadius: "1.5rem",
          textAlign: "center",
          border: "1px solid var(--border)",
        }}>
          <Search size={36} color="#9ca3af" style={{ marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            No groups matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => router.push(isAdmin ? `/admin/messages/${group.id}` : `/groups/${group.id}/messages`)}
              style={{
                background: "white",
                borderRadius: "1rem",
                display: "flex",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(4px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#0f766e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
              }}
            >
              <div className="w-1.5 shrink-0 bg-gradient-to-b from-indigo-600 to-indigo-800" />
              <div style={{ padding: "0.75rem 1rem", flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
                {/* Group Avatar */}
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "0.875rem",
                background: getColor(group.id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                <Users size={22} />
              </div>

              {/* Group Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "0 0 0.2rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {group.name}
                </h3>
                <p style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {group.description || "Tap to open group messages"}
                </p>
              </div>

              {/* Message Badge + Arrow */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <span style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  background: "#ecfdf5",
                  color: "#059669",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "1px solid #a7f3d0",
                }}>
                  Messages
                </span>
                <ChevronRight size={18} color="#9ca3af" />
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
