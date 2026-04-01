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
  MessageSquare,
  SendHorizontal,
  Shield,
  MessageCircle, // Digunakan untuk Logo agar selaras dengan icon chat
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Update navItems sesuai kebutuhan Mendunia.id
const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/devices", icon: Smartphone, label: "Perangkat WhatsApp" },
  { to: "/inbox", icon: MessageSquare, label: "Pesan Masuk" },
  { to: "/contacts", icon: Users, label: "Kontak" },
  { to: "/send", icon: SendHorizontal, label: "Kirim Pesan" },
  { to: "/blast", icon: Send, label: "Blast Pesan" },
  { to: "/templates", icon: FileText, label: "Template Pesan" },
  { to: "/auto-reply", icon: MessageSquareReply, label: "Auto Reply" },
  { to: "/users", icon: Shield, label: "Kelola User", roles: ['superadmin', 'admin'] },
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
    <div className="flex flex-col h-full bg-white">
      {/* Logo Section - Branding Mendunia.id */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shadow-sm">
          {/* Menggunakan MessageCircle dengan fill agar identik dengan WhatsApp */}
          <MessageCircle className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">
            Mendunia.id
          </p>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
            Official WhatsApp Blast V2
          </p>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </p>
        {navItems.map(({ to, icon: Icon, label, roles }) => {
          // Role Protection
          if (roles && !roles.includes(user?.role || '')) return null;
          
          const active =
            location.pathname === to || location.pathname.startsWith(to + "/");
            
          return (
            <RouterLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                active 
                  ? "bg-green-50 text-[#25D366]" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                active ? "text-[#25D366]" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-70" />}
            </RouterLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.name || "User Name"}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email || "user@mail.com"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg shadow-md hover:bg-slate-50"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-white border-r border-slate-100 shadow-2xl transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 fixed left-0 top-0 bottom-0 z-30 shadow-sm">
        <SidebarContent />
      </aside>
    </>
  );
}