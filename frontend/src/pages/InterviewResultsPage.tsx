import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { InterviewReport } from '../types';
import {
  Award, Download, RefreshCw, ArrowLeft, CheckCircle2,
  AlertTriangle, FileText, ChevronDown, ChevronUp, Bot, Quote
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export const InterviewResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) return;
      try {
        const data = await api.getReport(sessionId);
        setReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

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

        <div className="flex items-center gap-3">
          <a
            href={`/api/v1/interviews/${report.session_id}/report/pdf`}
            download
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <Download className="h-4 w-4" /> Download PDF Report
          </a>
        </div>
      </div>

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
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Assessment Model</span>
            <span className="text-xs font-semibold text-slate-400">Adaptive Evaluator Agent v1.2</span>
          </div>
        </div>

        {/* 5-Dimension Competency Chart */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <h3 className="font-bold text-white text-base mb-1">Competency Dimensions Breakdown</h3>
          <p className="text-slate-400 text-xs mb-4">Evaluated on a strict 0 to 5.0 integer & fractional evidence scale</p>

          <div className="h-60 w-full">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-emerald-400 text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Demonstrated Strengths
          </h3>
          <ul className="space-y-2">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                • {str}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Areas For Improvement
          </h3>
          <ul className="space-y-2">
            {report.weaknesses.map((wk, idx) => (
              <li key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                • {wk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Question-By-Question Analysis */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Question-by-Question Evidence Analysis</h3>
        <p className="text-slate-400 text-xs">
          Inspect transcript evidence quotes, missing expected concepts, and individual rubric scores.
        </p>

        <div className="space-y-3">
          {report.questions.map((q) => {
            const isExpanded = expandedQuestion === q.question_id;
            return (
              <div key={q.question_id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                  className="p-5 cursor-pointer flex items-center justify-between hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase">
                      {q.round_type}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{q.question_text}</h4>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-300">
                      Difficulty: Level {q.difficulty}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-0 space-y-5 border-t border-slate-800/80">
                    {/* Transcript Quote */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Quote className="h-3.5 w-3.5 text-blue-400" /> Candidate Spoken Transcript
                      </span>
                      <p className="text-xs text-slate-200 italic">
                        "{q.transcript || 'No transcript recorded.'}"
                      </p>
                    </div>

                    {/* Scores row */}
                    {q.scores && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {Object.entries(q.scores).map(([dim, score]) => (
                          <div key={dim} className="p-3 rounded-xl bg-slate-800/40 text-center border border-slate-700/40">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{dim}</span>
                            <span className="text-sm font-bold text-blue-400 mt-1 block">{score} / 5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Missing Concepts */}
                    {q.missing_concepts.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          Missing Expected Concepts
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {q.missing_concepts.map((mc, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              {mc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence Quotes */}
                    {q.evidence_quotes.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                          Transcript Evidence Citations
                        </span>
                        <div className="space-y-1">
                          {q.evidence_quotes.map((quote, idx) => (
                            <p key={idx} className="text-xs text-slate-300 bg-slate-800/30 p-2 rounded border border-slate-800">
                              "{quote}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Practice Retry Action */}
                    <div className="pt-2 flex justify-end">
                      <Link
                        to={`/practice?question_id=${q.question_id}`}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Practice / Retry This Question
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ethical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
        <p className="text-xs text-slate-500 italic">{report.disclaimer}</p>
      </div>
    </div>
  );
};
