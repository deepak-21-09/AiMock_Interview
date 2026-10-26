import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { InterviewReport } from '../types';
import {
  Award, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, FileText, ChevronDown, ChevronUp, Bot, Quote,
  Printer, Sparkles, Shield, AlertOctagon, CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export const InterviewResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) return;
      try {
        const data = await api.getReport(sessionId);
        setReport(data);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  const handleDownloadPdf = async () => {
    if (!report || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const fileName = `Interview_Report_${report.target_role.replace(/\s+/g, '_')}_${report.session_id.slice(0, 8)}.pdf`;
      await api.downloadReportPdf(report.session_id, fileName);
    } catch (err: any) {
      console.error('PDF download error:', err);
      setDownloadError(err.response?.data?.detail || 'Failed to download report PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-400 text-sm">
        <Bot className="h-10 w-10 text-blue-500 animate-pulse mb-3" />
        Generating evidence-based performance report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-sm text-slate-400">The evaluation report could not be retrieved.</p>
        <Link to="/dashboard" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const chartData = [
    { name: 'Technical', score: report.dimension_scores.technical },
    { name: 'Relevance', score: report.dimension_scores.relevance },
    { name: 'Completeness', score: report.dimension_scores.completeness },
    { name: 'Problem Solving', score: report.dimension_scores.problem_solving },
    { name: 'Communication', score: report.dimension_scores.communication },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Interview Performance Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Target Track: {report.target_role}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading PDF...' : 'Download Report as PDF'}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Overall Score Banner & Dimension Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Overall Performance Score</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                {report.overall_score}%
              </span>
              <span className="text-slate-400 text-xs">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed">{report.summary}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="text-[11px] text-slate-500 block leading-tight">
              {report.disclaimer}
            </span>
          </div>
        </div>

        {/* 5-Dimension Bar Chart */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Core Rubric Dimension Breakdown</h3>
            <p className="text-slate-400 text-xs mt-0.5">Scored on a rigorous 0.0 to 5.0 scale</p>
          </div>

          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 5]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Key Demonstrated Strengths
          </h3>
          <ul className="space-y-2">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-amber-400 text-sm uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Priority Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {report.weaknesses.map((w, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Targeted Recommendations */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base">Actionable Revision Plan & Coaching Exercises</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-400 block mb-2">Technical Revision Topics:</span>
            <div className="flex flex-wrap gap-2">
              {report.revision_topics.map((t, idx) => (
                <span key={idx} className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-indigo-400 block mb-2">Recommended Practice Exercises:</span>
            <div className="space-y-1.5">
              {report.practice_exercises.map((ex, idx) => (
                <p key={idx} className="text-xs text-slate-300">• {ex}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring & Session Integrity Card */}
      {report.proctoring && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          report.proctoring.is_terminated
            ? 'bg-rose-950/20 border-rose-800/60'
            : report.proctoring.warning_count > 0
            ? 'bg-amber-950/20 border-amber-800/60'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield className={`h-5 w-5 ${
                report.proctoring.is_terminated
                  ? 'text-rose-400'
                  : report.proctoring.warning_count > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`} />
              <div>
                <h3 className="font-bold text-white text-base">Interview Integrity & Automated Proctoring Log</h3>
                <p className="text-slate-400 text-xs">Client-side computer vision heuristics & session activity</p>
              </div>
            </div>

            <div>
              {report.proctoring.is_terminated ? (
                <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5" /> Session Halted Early
                </span>
              ) : report.proctoring.warning_count > 0 ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Warnings Logged ({report.proctoring.warning_count})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Solitary Session Verified
                </span>
              )}
            </div>
          </div>

          {report.proctoring.is_terminated && report.proctoring.termination_reason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
              <strong className="text-rose-100 block mb-0.5">Termination Reason:</strong>
              {report.proctoring.termination_reason}
            </div>
          )}

          {report.proctoring.events && report.proctoring.events.length > 0 ? (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 block">Recorded Activity Log:</span>
              <div className="space-y-1.5">
                {report.proctoring.events.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        ev.severity === 'terminal' || ev.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {ev.event_type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300">{ev.explanation || 'Activity flagged'}</span>
                    </div>
                    <span className="text-slate-500 text-[11px] shrink-0">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Zero proctoring warnings or integrity anomalies were observed during this interview session.
            </p>
          )}

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            Note: Client-side vision heuristics are recorded to assist interview integrity review and do not alter or penalize candidate technical dimension scores.
          </div>
        </div>
      )}

      {/* Question Reviews */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base">Question-by-Question Transcript & Evidence Review</h3>

        <div className="space-y-3">
          {report.questions.map((q) => {
            const isExp = expandedQuestion === q.question_id;
            return (
              <div key={q.question_id} className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExp ? null : q.question_id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/40 transition"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase">
                        {q.round_type}
                      </span>
                      {q.is_followup && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                          Follow-up
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">Difficulty: Level {q.difficulty}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{q.question_text}</h4>
                  </div>
                  {isExp ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
                </button>

                {isExp && (
                  <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/30 text-xs">
                    {/* Candidate Transcript */}
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Candidate Answer Transcript:</span>
                      <p className="p-3 rounded-lg bg-slate-950 text-slate-300 italic">
                        "{q.transcript || 'No transcript recorded.'}"
                      </p>
                    </div>

                    {/* Dimension Scores */}
                    {q.scores && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="p-2 rounded bg-slate-950">
                          <span className="text-[10px] text-slate-400 block">Technical</span>
                          <span className="text-sm font-bold text-white">{q.scores.technical} / 5</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950">
                          <span className="text-[10px] text-slate-400 block">Relevance</span>
                          <span className="text-sm font-bold text-white">{q.scores.relevance} / 5</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950">
                          <span className="text-[10px] text-slate-400 block">Completeness</span>
                          <span className="text-sm font-bold text-white">{q.scores.completeness} / 5</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950">
                          <span className="text-[10px] text-slate-400 block">Problem Solving</span>
                          <span className="text-sm font-bold text-white">{q.scores.problem_solving} / 5</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950">
                          <span className="text-[10px] text-slate-400 block">Communication</span>
                          <span className="text-sm font-bold text-white">{q.scores.communication} / 5</span>
                        </div>
                      </div>
                    )}

                    {/* Evidence Quotes */}
                    {q.evidence_quotes && q.evidence_quotes.length > 0 && (
                      <div>
                        <span className="font-semibold text-emerald-400 block mb-1">Evidence Quotes:</span>
                        <div className="space-y-1">
                          {q.evidence_quotes.map((quote, qi) => (
                            <p key={qi} className="text-slate-300 flex items-start gap-1.5">
                              <Quote className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>"{quote}"</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Concepts */}
                    {q.missing_concepts && q.missing_concepts.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-400 block mb-1">Missing Concepts / Gaps:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {q.missing_concepts.map((mc, mci) => (
                            <span key={mci} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[11px]">
                              {mc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default InterviewResultsPage;
