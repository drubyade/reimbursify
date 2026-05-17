"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface HeaderProps {
  title: string;
  showAuthButtons?: boolean;
  actionButtons?: ActionButton[];
  hideLogoTitle?: boolean;
}

export function Header({ title, showAuthButtons = true, actionButtons = [], hideLogoTitle = false }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowInstall(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstall(false);
        if (typeof window !== 'undefined') (window as any).deferredPrompt = null;
      }
    } else {
      alert("To install Reimbursify: open your browser's menu (or the Share menu on iOS) and tap 'Add to Home Screen'.");
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <header className="px-4 py-3 md:px-8 md:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 shadow-md text-white flex justify-between items-center z-50 relative overflow-hidden shrink-0">
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
      />
      
      {/* Left Side - Logo and Title */}
      <div className="flex items-center gap-4 relative z-10">
        {!hideLogoTitle && (
          <Link
            href="/"
            className="flex items-center gap-3 text-white no-underline group"
          >
            <div className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xl font-black shadow-sm group-hover:scale-105 transition-transform">
              ₹$
            </div>
            <h1 className="text-2xl font-black m-0 text-white tracking-tight">
              Reimbursify
            </h1>
          </Link>
        )}
        {title && (
          <div key={title} className="animate-fade-in text-emerald-100 font-bold text-lg ml-6 tracking-wide">
            {title}
          </div>
        )}
      </div>

      {/* Right Side - Buttons */}
      <div className="flex items-center gap-4 relative z-10">
        {/* Action Buttons - Vertical List */}
        {actionButtons.length > 0 && (
          <div className="flex flex-col gap-3">
            {actionButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                className="px-5 py-3 text-sm font-bold bg-white text-emerald-700 rounded-xl cursor-pointer transition-all shadow-sm whitespace-nowrap min-w-[120px] text-center hover:-translate-y-0.5 hover:shadow-md"
              >
                {btn.icon && <span className="mr-2">{btn.icon}</span>}
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Vertical Divider */}
        {actionButtons.length > 0 && showAuthButtons && (
          <div className="w-px h-8 bg-emerald-500/50" />
        )}

        {/* Install App Button */}
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 bg-white/10 text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all hover:bg-white hover:text-emerald-700 shadow-sm"
          title="Install Reimbursify for faster access and offline support"
        >
          <Download size={16} />
          Install App
        </button>

        {/* User Info - Top Right */}
        {session?.user && (
          <Link href="/trips/analytics" className="flex items-center gap-3 ml-2 pl-4 border-l border-emerald-500/40 text-white no-underline group hover:opacity-80 transition-opacity">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white tracking-tight">
                {session.user.name || "User"}
              </span>
              <span className="text-xs font-medium text-emerald-100">
                {session.user.email}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {session.user.name ? session.user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "U"}
            </div>
          </Link>
        )}

        {/* Auth Buttons */}
        {showAuthButtons && (
          <div className="flex items-center gap-3">
            {session?.user ? (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-xs font-bold bg-white/10 text-white border border-white/30 rounded-xl cursor-pointer transition-all hover:bg-white hover:text-emerald-700 shadow-sm ml-2"
              >
                Sign Out
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <Link
                  href="/auth/signin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: "white",
                    color: "#0077b6",
                    border: "2px solid #0077b6",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    minWidth: "100px",
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e8f5f1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signin?mode=signup"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                    color: "white",
                    border: "2px solid transparent",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    minWidth: "100px",
                    textAlign: "center",
                    boxSizing: "border-box",
                    boxShadow: "0 2px 8px rgba(3, 105, 161, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(3, 105, 161, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(3, 105, 161, 0.25)";
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
