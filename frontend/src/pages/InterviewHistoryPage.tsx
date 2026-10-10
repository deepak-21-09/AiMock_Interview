import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { HistoryItem } from '../types';
import {
  History, Trash2, FileText, AlertCircle,
  PlayCircle, ShieldAlert, CheckCircle2, ArrowRight
} from 'lucide-react';

export const InterviewHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Delete this interview session and all associated recordings?')) return;
    try {
      await api.deleteInterview(sessionId);
      setHistory(prev => prev.filter(s => s.session_id !== sessionId));
      setMessage('Session successfully deleted.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('WARNING: This will permanently delete all your resumes, interview recordings, and reports. Continue?')) return;
    try {
      await api.deleteAccountData();
      setHistory([]);
      setMessage('All user data and recordings permanently erased.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Interview History & Audit Trail</h1>
          <p className="text-slate-400 text-sm mt-1">Review past sessions, audit evaluation reports, and manage privacy settings.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleDeleteAllData}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ShieldAlert className="h-4 w-4" /> Erase All My Data
          </button>
        )}
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500 py-10 text-center">Loading interview history...</p>
      ) : history.length > 0 ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800">
            {history.map((s) => (
              <div key={s.session_id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{s.target_role}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      s.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Recorded on {new Date(s.created_at).toLocaleDateString()} • {s.total_questions} Questions • Difficulty Lvl {s.final_difficulty}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {s.overall_score !== undefined && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Score</span>
                      <span className="text-base font-extrabold text-blue-400">{s.overall_score}%</span>
                    </div>
                  )}

                  {s.has_report && (
                    <Link
                      to={`/reports/${s.session_id}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Report
                    </Link>
                  )}

                  <button
                    onClick={() => handleDeleteSession(s.session_id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <History className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Interview History Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't conducted any mock interviews yet. Set up a new session to get started.
          </p>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            <PlayCircle className="h-4 w-4" /> Start Interview Now
          </Link>
        </div>
      )}
    </div>
  );
};
