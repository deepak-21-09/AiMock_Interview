import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  LayoutDashboard,
  PlayCircle,
  FileSearch,
  FileText,
  History,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
  Plus,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  plus?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Start Interview', path: '/setup', icon: <PlayCircle className="h-5 w-5" />, plus: true },
  { label: 'History', path: '/history', icon: <History className="h-5 w-5" />, plus: true },
  { label: 'Resumes', path: '/resumes', icon: <FileText className="h-5 w-5" /> },
  { label: 'ATS Checker', path: '/ats-checker', icon: <FileSearch className="h-5 w-5" /> },
  { label: 'Profile', path: '/profile', icon: <User className="h-5 w-5" /> },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo mb-8 flex items-center gap-2.5">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            AdaptAI
          </span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-base
                  ${active
                    ? 'font-semibold'
                    : 'hover:bg-[var(--bg-muted)]'
                  }
                `}
                style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-muted)' : undefined,
                }}
              >
                <span
                  className="shrink-0 transition-base"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.plus && (
                  <span
                    className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                  >
                    <Plus className="h-3 w-3" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Promo card */}
        <div
          className="sidebar-promo mt-6 p-4 rounded-[20px] flex flex-col gap-2"
          style={{ background: 'var(--bg-muted)' }}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Upgrade to Pro
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Unlock unlimited mock sessions and PDF reports
          </p>
          <button
            className="mt-1 px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-base hover:opacity-90"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            Upgrade
          </button>
        </div>

        {/* Bottom links */}
        <div className="sidebar-bottom mt-4 flex flex-col gap-0.5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-base hover:bg-[var(--bg-muted)] w-full text-left"
            style={{ color: 'var(--text-secondary)' }}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span>Help &amp; information</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-base hover:bg-[var(--bg-muted)] w-full text-left"
            style={{ color: 'var(--text-secondary)' }}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (hamburger) ─────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <Link to="/dashboard" className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>AdaptAI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg transition-base"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div
            className="relative w-64 h-full flex flex-col p-6"
            style={{ background: 'var(--bg-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-8">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>AdaptAI</span>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-base"
                    style={{
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: active ? 'var(--bg-muted)' : undefined,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-base hover:bg-[var(--bg-muted)] w-full text-left"
                style={{ color: 'var(--text-secondary)' }}
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
