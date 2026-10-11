import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  PlayCircle, Award, CheckCircle, TrendingUp,
  FileText, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.getHistory();
        setHistory(res.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const completedSessions = history.filter(s => s.status === 'completed');
  const latestSession = completedSessions.length > 0 ? completedSessions[0] : null;

  // Chart data
  const chartData = completedSessions
    .slice()
    .reverse()
    .map((s, idx) => ({
      name: `Session ${idx + 1}`,
      score: s.overall_score || 0,
      role: s.target_role,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Candidate Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, {user?.profile?.full_name || user?.email?.split('@')[0] || 'Candidate'}!
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Targeting: <span className="text-blue-300 font-medium">{user?.profile?.target_role || 'Software Engineer'}</span>. Practice with our adaptive AI agent to boost your technical delivery and communication.
          </p>
        </div>
        <Link
          to="/setup"
          className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0"
        >
          <PlayCircle className="h-5 w-5" /> Start New Interview
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Completed Interviews</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{completedSessions.length}</span>
            <span className="text-xs text-slate-400">sessions recorded</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Latest Score</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {latestSession?.overall_score ? `${latestSession.overall_score}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-400">0 to 100 benchmark</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Starting vs Adapted Difficulty</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {latestSession ? `Lvl ${latestSession.final_difficulty || 3}` : 'Level 3'}
            </span>
            <span className="text-xs text-slate-400">adaptive ceiling (max 5)</span>
          </div>
        </div>
      </div>

      {/* Performance Trends & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Performance Improvement Trend</h3>
              <p className="text-slate-400 text-xs">Score progression over consecutive mock attempts</p>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-6">
              <TrendingUp className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm font-medium">No completed interview sessions yet.</p>
              <p className="text-slate-500 text-xs mt-1">Complete your first mock interview to track progress.</p>
              <Link to="/setup" className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                Start First Mock Session
              </Link>
            </div>
          )}
        </div>

        {/* Competency Insights */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="font-bold text-white text-base">Key Competency Areas</h3>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Top Performing Dimension
              </span>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                Technical Correctness & Architecture Trade-offs
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                Opportunity For Growth
              </span>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                STAR Communication Structuring & Time Pacing
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-1">
                Recommended Revision
              </span>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                High-throughput distributed cache invalidation strategies
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <Link to="/resumes" className="text-slate-400 hover:text-white flex items-center gap-1">
              <FileText className="h-4 w-4" /> Manage Resumes
            </Link>
            <Link to="/history" className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
              View History <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">Recent Interview Sessions</h3>
          <Link to="/history" className="text-xs text-blue-400 hover:underline">See all</Link>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {history.slice(0, 4).map((s) => (
              <div key={s.session_id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{s.target_role}</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()} • {s.total_questions} Questions
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    s.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {s.status.toUpperCase()}
                  </span>
                  {s.has_report && (
                    <Link
                      to={`/reports/${s.session_id}`}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      View Report
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No recent sessions found.</p>
        )}
      </div>
    </div>
  );
};
