"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Link as LinkIcon } from "lucide-react";

export default function JoinGroupPage() {
  const router = useRouter();
  
  // Standard Join state
  const [groupId, setGroupId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleStandardJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !secretKey) {
      setJoinError("Both Group ID and Secret Key are required.");
      return;
    }

    try {
      setJoining(true);
      setJoinError("");
      
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, secretKey })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      router.push("/trips");
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 border border-emerald-100">
            <Shield className="text-emerald-600" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Direct Entry</h2>
          <p className="text-gray-500 mb-8 flex-1">
            If you already have the Group ID and Secret Key, enter them below to join immediately.
          </p>

          <form onSubmit={handleStandardJoin} className="space-y-4">
            {joinError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {joinError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Group ID</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. GRP-123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secret Key</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter secret key"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joining}
              className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Group"}
            </button>
          </form>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">
          Requesting access is handled outside the app. Ask your group head for the Group ID and Secret Key.
        </div>
      </div>
    </div>
  );
}
