import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { InterviewReport } from '../types';
import {
  Award, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Bot, Quote,
  Printer, Shield, AlertOctagon, CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

/* ── Shared styles ─────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 24,
};

const cardMuted: React.CSSProperties = {
  background: 'var(--bg-muted)',
  borderRadius: 16,
  padding: 16,
};

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
      setDownloadError(err.response?.data?.detail || 'Failed to download report PDF.');
    } finally { setDownloading(false); }
  };

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Bot className="h-10 w-10 animate-pulse" style={{ color: 'var(--info)' }} />
        Generating evidence-based performance report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 mx-auto" style={{ color: 'var(--warning)' }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Report Not Found</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The evaluation report could not be retrieved.</p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 rounded-[999px] text-xs font-semibold cursor-target"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const chartData = [
    { name: 'Technical',      score: report.dimension_scores.technical },
    { name: 'Relevance',      score: report.dimension_scores.relevance },
    { name: 'Completeness',   score: report.dimension_scores.completeness },
    { name: 'Problem Solving', score: report.dimension_scores.problem_solving },
    { name: 'Communication',  score: report.dimension_scores.communication },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs mb-2 cursor-target"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Interview Performance Report
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Target Track: {report.target_role}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-[12px] text-xs font-semibold flex items-center gap-1.5 transition-base hover:opacity-80 cursor-target"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2.5 rounded-[12px] text-xs font-semibold flex items-center gap-2 transition-base hover:opacity-90 disabled:opacity-50 cursor-target"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading PDF…' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      {downloadError && (
        <div
          className="p-3.5 rounded-[12px] text-xs flex items-center gap-2"
          style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" /> {downloadError}
        </div>
      )}

      {/* Score + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div style={card} className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Overall Performance Score
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black" style={{ color: 'var(--info)' }}>
                {report.overall_score}%
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/ 100</span>
            </div>
            <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {report.summary}
            </p>
          </div>
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
              {report.disclaimer}
            </span>
          </div>
        </div>

        <div style={card} className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Core Rubric Dimension Breakdown
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Scored on a 0.0 to 5.0 scale
            </p>
          </div>
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis domain={[0, 5]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                  itemStyle={{ color: 'var(--color-accent)' }}
                />
                <Bar dataKey="score" fill="var(--info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div style={card} className="space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--success)' }}>
            <CheckCircle2 className="h-4 w-4" /> Key Strengths
          </h3>
          <ul className="space-y-2">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>•</span> {str}
              </li>
            ))}
          </ul>
        </div>

        <div style={card} className="space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--warning)' }}>
            <AlertTriangle className="h-4 w-4" /> Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {report.weaknesses.map((w, idx) => (
              <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>•</span> {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div style={card} className="space-y-4">
        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          Actionable Revision Plan &amp; Coaching Exercises
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold block mb-2" style={{ color: 'var(--info)' }}>
              Technical Revision Topics:
            </span>
            <div className="flex flex-wrap gap-2">
              {report.revision_topics.map((t, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-[999px] text-xs"
                  style={{ background: 'var(--color-accent-soft)', color: 'var(--link)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold block mb-2" style={{ color: 'var(--warning)' }}>
              Recommended Practice Exercises:
            </span>
            <div className="space-y-1.5">
              {report.practice_exercises.map((ex, idx) => (
                <p key={idx} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {ex}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring */}
      {report.proctoring && (
        <div
          style={{
            ...card,
            background: report.proctoring.is_terminated ? '#FFF1F2' : report.proctoring.warning_count > 0 ? '#FFFBEB' : 'var(--bg-surface)',
            borderColor: report.proctoring.is_terminated ? '#FECDD3' : report.proctoring.warning_count > 0 ? '#FDE68A' : 'var(--border)',
          }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield className="h-5 w-5" style={{ color: report.proctoring.is_terminated ? 'var(--danger)' : report.proctoring.warning_count > 0 ? 'var(--warning)' : 'var(--success)' }} />
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Interview Integrity &amp; Proctoring Log
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Client-side computer vision heuristics &amp; session activity
                </p>
              </div>
            </div>
            {report.proctoring.is_terminated ? (
              <span className="px-3 py-1 rounded-[999px] text-xs font-semibold flex items-center gap-1.5" style={{ background: '#FEE2E2', color: 'var(--danger)' }}>
                <AlertOctagon className="h-3.5 w-3.5" /> Session Halted Early
              </span>
            ) : report.proctoring.warning_count > 0 ? (
              <span className="px-3 py-1 rounded-[999px] text-xs font-semibold flex items-center gap-1.5" style={{ background: '#FEF9C3', color: '#A16207' }}>
                <AlertTriangle className="h-3.5 w-3.5" /> Warnings Logged ({report.proctoring.warning_count})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-[999px] text-xs font-semibold flex items-center gap-1.5" style={{ background: '#DCFCE7', color: '#15803D' }}>
                <CheckCircle className="h-3.5 w-3.5" /> Solitary Session Verified
              </span>
            )}
          </div>

          {report.proctoring.is_terminated && report.proctoring.termination_reason && (
            <div className="p-3.5 rounded-[12px] text-xs" style={{ background: '#FEE2E2', color: 'var(--danger)' }}>
              <strong className="block mb-0.5">Termination Reason:</strong>
              {report.proctoring.termination_reason}
            </div>
          )}

          {report.proctoring.events && report.proctoring.events.length > 0 ? (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Recorded Activity Log:</span>
              <div className="space-y-1.5">
                {report.proctoring.events.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[10px] text-xs flex items-center justify-between gap-3"
                    style={{ background: 'var(--bg-muted)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                        style={{
                          background: ev.severity === 'terminal' || ev.severity === 'critical' ? '#FEE2E2' : '#FEF9C3',
                          color: ev.severity === 'terminal' || ev.severity === 'critical' ? 'var(--danger)' : '#A16207',
                        }}
                      >
                        {ev.event_type.replace('_', ' ')}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{ev.explanation || 'Activity flagged'}</span>
                    </div>
                    <span className="text-[11px] shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Zero proctoring warnings or integrity anomalies were observed during this interview session.
            </p>
          )}

          <div className="pt-2 text-[11px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Note: Client-side vision heuristics are recorded for integrity review and do not penalize candidate technical dimension scores.
          </div>
        </div>
      )}

      {/* Question Reviews */}
      <div style={card} className="space-y-4">
        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          Question-by-Question Transcript &amp; Evidence Review
        </h3>

        <div className="space-y-3">
          {report.questions.map((q) => {
            const isExp = expandedQuestion === q.question_id;
            return (
              <div
                key={q.question_id}
                className="rounded-[14px] overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExp ? null : q.question_id)}
                  className="w-full p-4 flex items-center justify-between text-left transition-base hover:bg-[var(--bg-muted)] cursor-target"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-[999px] font-semibold uppercase"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                      >
                        {q.round_type}
                      </span>
                      {q.is_followup && (
                        <span className="text-[10px] px-2 py-0.5 rounded-[999px]" style={{ background: '#FFFBEB', color: '#A16207' }}>
                          Follow-up
                        </span>
                      )}
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Difficulty: Level {q.difficulty}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {q.question_text}
                    </h4>
                  </div>
                  {isExp
                    ? <ChevronUp className="h-5 w-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                    : <ChevronDown className="h-5 w-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                  }
                </button>

                {isExp && (
                  <div
                    className="p-4 space-y-4 text-xs"
                    style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }}
                  >
                    <div>
                      <span className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Candidate Answer Transcript:
                      </span>
                      <p
                        className="p-3 rounded-[10px] italic"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                      >
                        "{q.transcript || 'No transcript recorded.'}"
                      </p>
                    </div>

                    {q.scores && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        {[
                          ['Technical', q.scores.technical],
                          ['Relevance', q.scores.relevance],
                          ['Completeness', q.scores.completeness],
                          ['Problem Solving', q.scores.problem_solving],
                          ['Communication', q.scores.communication],
                        ].map(([label, val]) => (
                          <div key={String(label)} className="p-2 rounded-[10px]" style={{ background: 'var(--bg-surface)' }}>
                            <span className="text-[10px] block" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{val} / 5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.evidence_quotes && q.evidence_quotes.length > 0 && (
                      <div>
                        <span className="font-semibold block mb-1" style={{ color: 'var(--success)' }}>Evidence Quotes:</span>
                        <div className="space-y-1">
                          {q.evidence_quotes.map((quote, qi) => (
                            <p key={qi} className="flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                              <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                              "{quote}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.missing_concepts && q.missing_concepts.length > 0 && (
                      <div>
                        <span className="font-semibold block mb-1" style={{ color: 'var(--warning)' }}>
                          Missing Concepts / Gaps:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {q.missing_concepts.map((mc, mci) => (
                            <span
                              key={mci}
                              className="px-2 py-0.5 rounded text-[11px]"
                              style={{ background: '#FFFBEB', color: '#A16207' }}
                            >
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
