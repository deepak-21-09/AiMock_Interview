import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { HistoryItem } from '../types';
import {
  History, Trash2, FileText, CheckCircle2,
  PlayCircle, ShieldAlert,
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

  useEffect(() => { loadHistory(); }, []);

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
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Interview History
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Review past sessions, audit evaluation reports, and manage privacy settings.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleDeleteAllData}
            className="px-4 py-2 rounded-[12px] text-xs font-semibold flex items-center gap-1.5 transition-base hover:opacity-80 cursor-target"
            style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}
          >
            <ShieldAlert className="h-4 w-4" /> Erase All My Data
          </button>
        )}
      </div>

      {/* Success message */}
      {message && (
        <div
          className="p-4 rounded-[14px] text-xs flex items-center gap-2"
          style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-xs py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
          Loading interview history…
        </p>
      ) : history.length > 0 ? (
        <div className="rounded-[28px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {history.map((s, idx) => (
            <div
              key={s.session_id}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-base hover:bg-[var(--bg-muted)]"
              style={{
                borderTop: idx !== 0 ? '1px solid var(--border)' : undefined,
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {s.target_role}
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-[999px] font-bold uppercase"
                    style={{
                      background: s.status === 'completed' ? '#DCFCE7' : '#FEF9C3',
                      color: s.status === 'completed' ? '#15803D' : '#A16207',
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(s.created_at).toLocaleDateString()} · {s.total_questions} Questions · Difficulty Lvl {s.final_difficulty}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {s.overall_score !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                      Score
                    </span>
                    <span className="text-base font-extrabold" style={{ color: 'var(--info)' }}>
                      {s.overall_score}%
                    </span>
                  </div>
                )}

                {s.has_report && (
                  <Link
                    to={`/reports/${s.session_id}`}
                    className="px-4 py-2 rounded-[12px] text-xs font-semibold flex items-center gap-1.5 transition-base hover:opacity-90 cursor-target"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
                  >
                    <FileText className="h-3.5 w-3.5" /> View Report
                  </Link>
                )}

                <button
                  onClick={() => handleDeleteSession(s.session_id)}
                  className="p-2 rounded-lg transition-base cursor-target"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="p-12 rounded-[28px] text-center space-y-4"
          style={{ background: 'var(--bg-muted)' }}
        >
          <History className="h-12 w-12 mx-auto" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            No Interview History Yet
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            You haven't conducted any mock interviews yet. Set up a new session to get started.
          </p>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[999px] text-xs font-semibold transition-base hover:opacity-90 cursor-target"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <PlayCircle className="h-4 w-4" /> Start Interview Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default InterviewHistoryPage;
