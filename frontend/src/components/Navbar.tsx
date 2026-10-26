import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, User, FileText, History, LogOut, PlayCircle, FileSearch } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-cursor-label="Home" className="flex items-center gap-3 cursor-target">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Adaptive AI</span>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">Mock Interview</span>
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              to="/dashboard"
              data-cursor-label="Dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-target ${
                isActive('/dashboard') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/setup"
              data-cursor-label="Start"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-target ${
                isActive('/setup') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <PlayCircle className="h-4 w-4" /> Start Interview
            </Link>
            <Link
              to="/ats-checker"
              data-cursor-label="ATS Checker"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-target ${
                isActive('/ats-checker') ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSearch className="h-4 w-4 text-indigo-400" /> Resume ATS Checker
            </Link>
            <Link
              to="/resumes"
              data-cursor-label="Resumes"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-target ${
                isActive('/resumes') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileText className="h-4 w-4" /> Resumes
            </Link>
            <Link
              to="/history"
              data-cursor-label="History"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-target ${
                isActive('/history') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <History className="h-4 w-4" /> History
            </Link>
            <Link
              to="/profile"
              data-cursor-label="Profile"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-target ${
                isActive('/profile') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            <button
              onClick={handleLogout}
              data-cursor-label="Logout"
              className="ml-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-target"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              data-cursor-label="Sign In"
              className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition cursor-target"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              data-cursor-label="Get Started"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-blue-600/30 transition cursor-target"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
export default Navbar;
