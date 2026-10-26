import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CheckCircle, TrendingUp, Award,
  PlayCircle, FileText, FileSearch,
  Calendar, ChevronDown, Clock, MoreHorizontal,
  Phone, Video, MoreVertical, Paperclip, Smile, Mic,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  defs,
  linearGradient,
  stop,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';

/* ── helpers ──────────────────────────────────────────────────── */
const today = new Date();
const dateLabel = today.toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatScore(n: number | undefined) {
  return n !== undefined ? `${n}%` : 'N/A';
}

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span
      className={`text-xs font-semibold flex items-center gap-0.5 ${pos ? 'delta-up' : 'delta-down'}`}
      style={{ color: pos ? 'var(--success)' : 'var(--danger)' }}
    >
      {pos ? '+' : ''}{value}{suffix}
    </span>
  );
}

/* Status dot config */
const statusConfig: Record<string, { dot: string; label: string }> = {
  completed:   { dot: 'var(--success)', label: 'Done' },
  in_progress: { dot: 'var(--warning)', label: 'In progress' },
  pending:     { dot: 'var(--info)',    label: 'On hold' },
};

/* Custom chart tooltip */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-4 py-3 rounded-2xl shadow-xl text-white text-xs"
      style={{ background: 'var(--tooltip-bg)', minWidth: 160 }}
    >
      <p className="font-semibold mb-2" style={{ color: '#94A3B8' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: '#CBD5E1' }}>{p.name}</span>
          <span className="ml-auto font-bold">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

/* ── Page component ────────────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then((res) => setHistory(res.history || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completed = history.filter((s) => s.status === 'completed');
  const latest = completed[0];
  const prevScore = completed[1]?.overall_score;
  const scoreDelta =
    latest?.overall_score !== undefined && prevScore !== undefined
      ? latest.overall_score - prevScore
      : null;

  const totalSessions = history.length;

  /* Build chart data: last 7 completed sessions */
  const chartData = completed
    .slice(0, 7)
    .reverse()
    .map((s, idx) => ({
      name: `S${idx + 1}`,
      'This run': s.overall_score ?? 0,
      'Avg target': 75,
    }));

  /* Pad to 7 points if fewer */
  while (chartData.length < 7) {
    chartData.push({ name: `S${chartData.length + 1}`, 'This run': 0, 'Avg target': 75 });
  }

  const firstName =
    user?.profile?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  return (
    <div className="flex gap-8">
      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-extrabold leading-tight"
              style={{ color: 'var(--text-primary)', fontSize: 34 }}
            >
              Hello, {firstName}!
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {user?.profile?.target_role
                ? `Targeting ${user.profile.target_role} · practice to boost your score`
                : 'Track your mock interview progress here'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{dateLabel}</span>
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center transition-base hover:opacity-80 cursor-target"
              style={{ background: 'var(--bg-muted)' }}
              aria-label="Open calendar"
            >
              <Calendar className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div
          className="rounded-[20px] overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-3 divide-x" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
            {/* KPI 1 – Sessions */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-muted)' }}
              >
                <CheckCircle className="h-6 w-6" style={{ color: 'var(--info)' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Completed
                </p>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {completed.length}
                </p>
                {completed.length > 0 && <DeltaBadge value={1} suffix=" sessions" />}
              </div>
            </div>

            {/* KPI 2 – Latest score */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-muted)' }}
              >
                <Award className="h-6 w-6" style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Latest Score
                </p>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {formatScore(latest?.overall_score)}
                </p>
                {scoreDelta !== null && <DeltaBadge value={scoreDelta} suffix=" pts" />}
              </div>
            </div>

            {/* KPI 3 – Difficulty ceiling */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-muted)' }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Difficulty
                </p>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {latest ? `Lvl ${latest.final_difficulty ?? 3}` : 'Lvl 3'}
                </p>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  adaptive / 5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance chart */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Performance
            </h2>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[999px] text-xs font-medium transition-base hover:opacity-80 cursor-target"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
            >
              Last 7 sessions <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {chartData.some((d) => d['This run'] > 0) ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F8FE0" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4F8FE0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'var(--text-secondary)', strokeDasharray: '4 4', strokeWidth: 1 }}
                  />
                  {/* Avg target – orange line, no fill */}
                  <Area
                    type="monotone"
                    dataKey="Avg target"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--warning)' }}
                  />
                  {/* This run – blue with gradient fill */}
                  <Area
                    type="monotone"
                    dataKey="This run"
                    stroke="var(--info)"
                    strokeWidth={2.5}
                    fill="url(#scoreGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--info)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="h-52 rounded-[20px] flex flex-col items-center justify-center gap-3 text-center"
              style={{ background: 'var(--bg-muted)' }}
            >
              <TrendingUp className="h-8 w-8" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No interview data yet
              </p>
              <Link
                to="/setup"
                className="px-4 py-2 rounded-[999px] text-xs font-semibold transition-base hover:opacity-90 cursor-target"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
              >
                Start first mock session
              </Link>
            </div>
          )}
        </div>

        {/* Current Sessions (task-list style) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Recent Sessions
              </h2>
              <span
                className="text-xs"
                style={{ color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)', paddingLeft: 16 }}
              >
                {completed.length > 0
                  ? `Done ${Math.round((completed.length / Math.max(history.length, 1)) * 100)}%`
                  : 'No sessions yet'}
              </span>
            </div>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[999px] text-xs font-medium transition-base hover:opacity-80 cursor-target"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
            >
              All Time <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {history.length === 0 ? (
            <div
              className="py-10 rounded-[20px] flex flex-col items-center gap-3 text-center"
              style={{ background: 'var(--bg-muted)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No sessions recorded yet.
              </p>
              <Link
                to="/setup"
                className="px-5 py-2 rounded-[999px] text-xs font-semibold transition-base hover:opacity-90 cursor-target inline-flex items-center gap-2"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
              >
                <PlayCircle className="h-4 w-4" /> Start Interview
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {history.slice(0, 5).map((s) => {
                const cfg = statusConfig[s.status] ?? statusConfig['pending'];
                const role = s.target_role || 'Mock Interview';
                const iconBg =
                  s.status === 'completed'
                    ? 'var(--color-accent-soft)'
                    : s.status === 'in_progress'
                    ? '#FFF3E6'
                    : '#EEF2FF';

                return (
                  <div
                    key={s.session_id}
                    className="flex items-center gap-4 px-3 py-3.5 rounded-[16px] transition-base hover:bg-[var(--bg-muted)] group"
                  >
                    {/* Icon */}
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: iconBg }}
                    >
                      <Award className="h-4 w-4" style={{ color: 'var(--info)' }} />
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {role}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(s.created_at).toLocaleDateString()} · {s.total_questions ?? 0} questions
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: cfg.dot }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-1.5 shrink-0 min-w-[48px]">
                      <Award className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {s.overall_score !== undefined ? `${s.overall_score}%` : '—'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s.has_report && (
                        <Link
                          to={`/reports/${s.session_id}`}
                          className="text-xs px-3 py-1 rounded-[999px] font-medium transition-base hover:opacity-80 cursor-target"
                          style={{ background: 'var(--color-accent-soft)', color: 'var(--link)' }}
                        >
                          Report
                        </Link>
                      )}
                      <button
                        className="p-1.5 rounded-lg transition-base opacity-0 group-hover:opacity-100"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {history.length > 5 && (
            <div className="mt-4 text-center">
              <Link
                to="/history"
                className="text-xs font-semibold transition-base hover:opacity-80"
                style={{ color: 'var(--link)' }}
              >
                View all sessions →
              </Link>
            </div>
          )}
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Link
            to="/setup"
            className="p-5 rounded-[20px] flex items-center gap-4 group transition-base hover:opacity-90 cursor-target"
            style={{ background: 'var(--color-accent-soft)' }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
            >
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Start Interview</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Launch a new mock session</p>
            </div>
          </Link>

          <Link
            to="/ats-checker"
            className="p-5 rounded-[20px] flex items-center gap-4 group transition-base hover:opacity-90 cursor-target"
            style={{ background: 'var(--bg-muted)' }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#E0E7FF', color: '#4F46E5' }}
            >
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ATS Checker</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Match resume to JD</p>
            </div>
          </Link>

          <Link
            to="/resumes"
            className="p-5 rounded-[20px] flex items-center gap-4 group transition-base hover:opacity-90 cursor-target"
            style={{ background: 'var(--bg-muted)' }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#DCFCE7', color: '#16A34A' }}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Resumes</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Manage documents</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Right panel (visible ≥1280px) ───────────────────── */}
      <aside
        className="hidden xl:flex flex-col gap-6 shrink-0"
        style={{ width: 260 }}
      >
        {/* Profile card */}
        <div
          className="p-5 rounded-[28px] flex flex-col items-center gap-3"
          style={{ background: 'var(--bg-muted)' }}
        >
          {/* Avatar */}
          <div className="relative">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, var(--info) 0%, var(--color-accent) 100%)' }}
            >
              {(user?.profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <span
              className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
              style={{ background: 'var(--success)' }}
            />
          </div>

          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {user?.profile?.full_name || 'Candidate'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              @{user?.email?.split('@')[0] || 'user'}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center transition-base hover:opacity-80 cursor-target"
              style={{ background: 'var(--bg-surface)' }}
              aria-label="Call"
            >
              <Phone className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center transition-base hover:opacity-80 cursor-target"
              style={{ background: 'var(--bg-surface)' }}
              aria-label="Video"
            >
              <Video className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center transition-base hover:opacity-80 cursor-target"
              style={{ background: 'var(--bg-surface)' }}
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Activity section */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Activity header */}
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Activity
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Activity feed */}
          <div className="space-y-5 flex-1">
            {history.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                No activity yet. Start an interview!
              </p>
            ) : (
              history.slice(0, 3).map((s) => {
                const initial = (s.target_role?.[0] || 'A').toUpperCase();
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(s.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })();

                return (
                  <div key={s.session_id} className="flex flex-col gap-2">
                    {/* Avatar + time row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{
                              background:
                                s.status === 'completed'
                                  ? 'var(--info)'
                                  : 'var(--warning)',
                            }}
                          >
                            {initial}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white"
                            style={{
                              background:
                                s.status === 'completed'
                                  ? 'var(--success)'
                                  : 'var(--warning)',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                          {s.target_role || 'Interview'}
                        </span>
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {timeAgo}
                      </span>
                    </div>

                    {/* Action line */}
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Session{' '}
                      <span className="font-medium" style={{ color: 'var(--link)' }}>
                        {s.status === 'completed' ? 'completed' : 'started'}
                      </span>{' '}
                      · {s.total_questions ?? 0} questions
                    </p>

                    {/* Message bubble (for completed with score) */}
                    {s.status === 'completed' && s.overall_score !== undefined && (
                      <div
                        className="relative p-3 rounded-[14px] text-xs"
                        style={{ background: 'var(--color-accent-soft)', color: 'var(--text-primary)' }}
                      >
                        Scored{' '}
                        <span className="font-bold" style={{ color: 'var(--info)' }}>
                          {s.overall_score}%
                        </span>
                        {' '}· Difficulty Lvl {s.final_difficulty ?? 3}
                        {s.has_report && (
                          <Link
                            to={`/reports/${s.session_id}`}
                            className="block mt-1 font-semibold"
                            style={{ color: 'var(--link)' }}
                          >
                            View full report →
                          </Link>
                        )}
                        {/* Reaction badge */}
                        <span
                          className="absolute -bottom-2 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-sm border-2 border-white"
                          style={{ background: 'var(--bg-muted)' }}
                          aria-hidden
                        >
                          🎯
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Message input */}
          <div
            className="mt-auto flex items-center gap-2 px-4 py-3 rounded-[999px]"
            style={{ background: 'var(--bg-muted)' }}
          >
            <button
              className="shrink-0 cursor-target"
              aria-label="Attach file"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder="Write a message…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-secondary)]"
              style={{ color: 'var(--text-primary)' }}
            />
            <button className="shrink-0 cursor-target" aria-label="Emoji" style={{ color: 'var(--text-secondary)' }}>
              <Smile className="h-4 w-4" />
            </button>
            <button className="shrink-0 cursor-target" aria-label="Voice" style={{ color: 'var(--text-secondary)' }}>
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DashboardPage;
