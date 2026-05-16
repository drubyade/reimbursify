"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { 
  Building2, 
  FileText, 
  FileCheck,
  MessageSquare,
  ChevronDown, 
  LogOut, 
  Menu,
  X,
  ArrowLeft
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMINISTRATOR") {
      router.push("/trips");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!session || session.user?.role !== "ADMINISTRATOR") {
    return null;
  }

  const navigationItems = [
    { label: "Manage Groups", icon: Building2, href: "/admin/groups", key: "groups", colorClass: "bg-blue-500" },
    { label: "Form Templates", icon: FileText, href: "/admin/forms", key: "forms", colorClass: "bg-purple-500" },
    { label: "Submissions", icon: FileCheck, href: "/admin/submissions", key: "submissions", colorClass: "bg-teal-500" },
    { label: "Messages", icon: MessageSquare, href: "/admin/messages", key: "messages", colorClass: "bg-indigo-500" },
  ];

  let dynamicTitle = "Admin Dashboard";
  if (pathname?.startsWith("/admin/groups")) {
    dynamicTitle = "Manage Groups";
  } else if (pathname?.startsWith("/admin/forms")) {
    dynamicTitle = "Form Templates";
  } else if (pathname?.startsWith("/admin/submissions")) {
    dynamicTitle = "Submissions";
  } else if (pathname?.startsWith("/admin/messages")) {
    dynamicTitle = "Messages";
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Permanent Header */}
      <div className="z-50 bg-white">
        <Header title={dynamicTitle} showAuthButtons={false} hideLogoTitle={false} />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Button - Appears below header on mobile */}
        <div className="md:hidden absolute top-0 left-0 p-4 z-40">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-white rounded-md shadow-sm text-gray-600 hover:text-gray-900 border border-gray-200"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Desktop Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-slate-100 border-r border-gray-200 transition-all duration-300 hidden md:flex flex-col z-30 shadow-sm relative overflow-hidden`}
        >
          {/* Texture Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-60 z-0"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
          />

          <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 space-y-1">
            <div className={`mb-2 flex items-center justify-center ${!sidebarOpen ? "px-0" : "px-6"}`}>
              {sidebarOpen ? (
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase w-full">Administration</p>
              ) : (
                <div className="w-8 h-px bg-slate-300 mx-auto"></div>
              )}
            </div>
            
            {navigationItems.map((item) => {
              const isActive = pathname?.startsWith(item.href) || false;
              return (
                <NavLink
                  key={item.key}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  colorClass={item.colorClass}
                  sidebarOpen={sidebarOpen}
                  isActive={isActive}
                />
              );
            })}

          </nav>

          {/* Bottom Actions - pinned */}
          <div className="flex-shrink-0 border-t border-gray-100 p-3 space-y-2 bg-gray-50/50">
            <button
              onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/signin"; }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
                !sidebarOpen ? "justify-center" : ""
              }`}
              title={!sidebarOpen ? "Sign Out" : undefined}
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </div>

          {/* Toggle Button - pinned */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-full items-center justify-center h-12 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronDown
              size={18}
              className={`transform transition-transform duration-300 ${sidebarOpen ? "rotate-90" : "-rotate-90"}`}
            />
          </button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
              <div className="absolute top-0 right-0 -mr-12 pt-4">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-[var(--bg-secondary)]">
                <div className="w-10 h-10 rounded-full bg-[image:var(--gradient-primary)] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {session?.user?.name ? session.user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "A"}
                </div>
                <div>
                  <p className="font-bold text-[var(--primary)] text-sm">{session?.user?.name || "Administrator"}</p>
                  <p className="text-xs text-gray-600">{session?.user?.email}</p>
                </div>
              </div>

              <div className="flex-1 h-0 overflow-y-auto">
                <nav className="px-2 py-4 space-y-1">
                  <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Administration</p>
                  {navigationItems.map((item) => (
                    <MobileNavLink
                      key={item.key}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      colorClass={item.colorClass}
                      isActive={pathname?.startsWith(item.href) || false}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await signOut({ redirect: false });
                    window.location.href = "/auth/signin";
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 font-medium"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50/50 md:pt-0 pt-16 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  colorClass,
  sidebarOpen,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  colorClass: string;
  sidebarOpen: boolean;
  isActive: boolean;
}) {
  const textColor = colorClass.replace('bg-', 'text-');
  return (
    <Link
      href={href}
      className={`flex items-center transition-all duration-200 mx-3 rounded-xl overflow-hidden ${
        isActive 
          ? `${colorClass} text-white shadow-md font-bold` 
          : "text-slate-600 hover:bg-slate-200/50 font-medium"
      } ${
        !sidebarOpen ? "justify-center w-12 h-12 mx-auto mb-1" : "gap-3 py-2 px-3 mb-1"
      }`}
      title={!sidebarOpen ? label : undefined}
    >
      <div className={`flex items-center justify-center w-8 h-8 flex-shrink-0 shadow-sm rounded-lg transition-colors ${
        isActive ? `bg-white ${textColor}` : `${colorClass} text-white`
      }`}>
        <Icon size={18} />
      </div>
      {sidebarOpen && <span className={`truncate ${isActive ? "text-white" : ""}`}>{label}</span>}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
  colorClass,
  onClick,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  colorClass: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const textColor = colorClass.replace('bg-', 'text-');
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 py-2 px-3 mx-3 mb-1 transition-colors rounded-xl ${
        isActive 
          ? `${colorClass} text-white shadow-md font-bold` 
          : "text-slate-600 hover:bg-slate-200/50 font-medium"
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 flex-shrink-0 shadow-sm rounded-lg transition-colors ${
        isActive ? `bg-white ${textColor}` : `${colorClass} text-white`
      }`}>
        <Icon size={18} />
      </div>
      <span className={`truncate ${isActive ? "text-white" : ""}`}>{label}</span>
    </Link>
  );
}
