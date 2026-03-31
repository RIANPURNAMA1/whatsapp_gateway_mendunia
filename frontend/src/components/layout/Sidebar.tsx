import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Send,
  FileText,
  MessageSquareReply,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
  MessageSquare,
  Key,
  Link,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Update navItems
const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/devices", icon: Smartphone, label: "Perangkat WhatsApp" },
  { to: "/inbox", icon: MessageSquare, label: "Pesan Masuk" },
  { to: "/contacts", icon: Users, label: "Kontak" },
  { to: "/blast", icon: Send, label: "Blast Pesan" },
  { to: "/templates", icon: FileText, label: "Template Pesan" },
  { to: "/auto-reply", icon: MessageSquareReply, label: "Auto Reply" },
  { to: "/api-keys", icon: Key, label: "API Keys" },
  { to: "/external", icon: Link, label: "Integrasi External" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">
            Mendunia.id
          </p>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
            Official WhatsApp Blast
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active =
            location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <RouterLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn("sidebar-link", active && "active")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </RouterLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-7 h-7 text-slate-400 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-white border-r border-slate-100 shadow-xl transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
