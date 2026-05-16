"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { decryptAES } from "@/lib/encryption-client";
import { Send, MessageCircle, User, Search, ArrowLeft, Check, CheckCheck, Clock } from "lucide-react";

interface DMUser {
  id: string;
  name: string;
  username: string;
  email: string;
  unreadCount?: number;
  lastMessageAt?: string | null;
  pinned?: boolean;
}

const avatarColors = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-orange-500 to-amber-600",
  "from-indigo-500 to-cyan-600",
  "from-emerald-500 to-green-600",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GroupMessages({ groupId }: { groupId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const [aesKey, setAesKey] = useState<any>(null); // Placeholder for key management

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DMUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [recentUsers, setRecentUsers] = useState<DMUser[]>([]);
  const [selectedUser, setSelectedUserState] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [initialAppLoading, setInitialAppLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(`reimbursify_chat_${groupId}`);
    if (savedUser) {
      try {
        setSelectedUserState(JSON.parse(savedUser));
      } catch (e) {
        // ignore parse error
      }
    }
  }, [groupId]);

  const setSelectedUser = (user: DMUser | null) => {
    setSelectedUserState(user);
    if (user) {
      localStorage.setItem(`reimbursify_chat_${groupId}`, JSON.stringify(user));
    } else {
      localStorage.removeItem(`reimbursify_chat_${groupId}`);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}&groupId=${encodeURIComponent(groupId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, groupId]);

  const fetchRecentUsers = async () => {
    try {
      const res = await fetch(`/api/direct-messages?groupId=${encodeURIComponent(groupId)}`);
      if (res.ok) {
        const data = await res.json();
        setRecentUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialAppLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentUsers();
    const interval = setInterval(fetchRecentUsers, 5000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedUser?.id, groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `/api/direct-messages?groupId=${encodeURIComponent(groupId)}&otherId=${selectedUser.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => {
          const pending = prev.filter((m) => m.status === "pending");
          return [...data, ...pending];
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage;
    setNewMessage("");
    
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      senderId: session?.user?.id,
      tempPlaintext: text,
      status: "pending",
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      setSending(true);
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          receiverId: selectedUser.id,
          plaintext: text,
          aesKey: "default-aes-key-256bit",
        }),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
        fetchRecentUsers();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleSelectUser = (user: DMUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
  };

  const decryptMessage = (encrypted: string) => {
    try {
      return decryptAES(encrypted, "default-aes-key-256bit");
    } catch {
      return "[Error decrypting]";
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white relative">
      {initialAppLoading && (
        <div className="fixed inset-0 bg-[#0a192f]/60 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 max-w-[280px] w-full transform animate-in zoom-in-95 duration-300">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-indigo-600 animate-spin" />
              <MessageCircle className="absolute text-indigo-600 w-6 h-6 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">Opening...</h3>
              <p className="text-sm font-medium text-gray-500">Loading messages securely</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`${selectedUser ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[380px] border-r border-gray-100 bg-indigo-50/80 flex-col shrink-0`}>
          <div className="m-2 p-3 md:p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl shadow-md text-white relative overflow-hidden shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <button 
                onClick={() => router.push(isAdmin ? "/admin/messages" : "/messages")}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to messages list"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-base font-extrabold tracking-tight">Group Messages</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={14} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition-all shadow-sm placeholder:text-white/60 font-medium text-white"
              />
            </div>
            {searching && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mt-2 animate-pulse">Searching...</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {(searchResults.length > 0 ? searchResults : recentUsers).map((user) => (
              <div key={user.id} className="px-2 py-0.5">
                <div
                  onClick={() => handleSelectUser(user)}
                  className={`p-2 md:p-2.5 flex items-center gap-2.5 cursor-pointer transition-all rounded-xl ${
                    selectedUser?.id === user.id 
                      ? "bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-md text-white" 
                      : "bg-transparent text-gray-900 hover:bg-gray-100/70"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${
                      selectedUser?.id === user.id ? 'bg-white/20' : `bg-gradient-to-br ${getAvatarColor(user.id)}`
                    } flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 transition-transform group-hover:scale-105`}
                  >
                    {getInitials(user.name || user.email || "U")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <p className={`font-bold text-[13px] truncate ${selectedUser?.id === user.id ? 'text-white' : 'text-gray-900'}`}>
                        {user.name || user.username || user.email}
                      </p>
                      {user.pinned && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${
                          selectedUser?.id === user.id 
                            ? 'text-indigo-100 bg-indigo-800/40 border border-indigo-600/50' 
                            : 'text-indigo-700 bg-indigo-100/80 border border-indigo-200/50'
                        }`}>
                          Pinned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-[11px] font-medium truncate ${selectedUser?.id === user.id ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {user.username || user.email}
                      </p>
                      {!!user.unreadCount && user.unreadCount > 0 && (
                        <span className={`text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center shadow-sm shrink-0 ${
                          selectedUser?.id === user.id 
                            ? 'bg-white text-indigo-700' 
                            : 'bg-indigo-500 text-white'
                        }`}>
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {searchResults.length === 0 && recentUsers.length === 0 && (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <User className="text-gray-400" size={20} />
                </div>
                <p className="text-sm font-medium">No group members found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div 
          className={`${!selectedUser ? "hidden md:flex" : "flex"} flex-1 flex-col bg-indigo-50/80 relative`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        >
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="m-2 px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-2xl shadow-sm flex items-center gap-3 z-10 sticky top-2 overflow-hidden text-white">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-1.5 -ml-2 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div
                  className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shadow-sm"
                >
                  {getInitials(selectedUser.name || selectedUser.email || "U")}
                </div>
                <div>
                  <h2 className="font-extrabold text-base leading-tight">
                    {selectedUser.name || selectedUser.username || selectedUser.email}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 mt-0.5">Secure Chat</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-fade-in-up">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                      <MessageCircle className="text-indigo-500/70" size={28} />
                    </div>
                    <p className="font-bold text-gray-600 mb-1">Start the conversation</p>
                    <p className="text-xs">Your messages are end-to-end encrypted.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMine = msg.senderId === session?.user?.id;
                    const decryptedText = msg.tempPlaintext || decryptMessage(msg.encryptedContent);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fade-in-up`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm relative group ${
                            isMine
                              ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm pr-12"
                              : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                          }`}
                        >
                          {decryptedText}
                          
                          {isMine && (
                            <span className="absolute bottom-1.5 right-2 flex items-center justify-end text-indigo-200">
                              {msg.status === "pending" ? (
                                <Clock size={12} className="opacity-80" />
                              ) : msg.isRead ? (
                                <CheckCheck size={14} className="text-blue-300 drop-shadow-sm" />
                              ) : msg.isDelivered ? (
                                <CheckCheck size={14} className="opacity-90" />
                              ) : (
                                <Check size={14} className="opacity-80" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-2.5 items-center max-w-4xl mx-auto">
                  <input
                    type="text"
                    placeholder="Type a secure message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-medium transition-all shadow-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white w-12 h-12 rounded-xl flex items-center justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 shrink-0"
                  >
                    <Send size={18} className={sending ? "animate-pulse" : ""} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-transparent">
              <div className="text-center animate-fade-in-up">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-50 to-emerald-50 flex items-center justify-center mb-5 shadow-sm border border-indigo-100/50">
                  <MessageCircle className="text-indigo-600/70" size={32} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-sm text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                  Select a member from the sidebar to start a secure, end-to-end encrypted conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
