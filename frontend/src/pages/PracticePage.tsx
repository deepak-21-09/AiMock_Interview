import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { PracticeComparison } from '../types';
import {
  RefreshCw, Award, ArrowLeft, Send,
  TrendingUp, CheckCircle2, AlertCircle, Bot
} from 'lucide-react';

export const PracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('question_id');

  const [revisedAnswer, setRevisedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comparison, setComparison] = useState<PracticeComparison | null>(null);
  const [error, setError] = useState('');

  const handleSubmitRetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId) {
      setError('Please select a question from a completed report to practice.');
      return;
    }
    if (!revisedAnswer.trim()) {
      setError('Please provide a revised answer to evaluate.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.retryQuestion(questionId, { text_answer: revisedAnswer });
      setComparison(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit practice retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Practice & Coaching Lab</h1>
        <p className="text-slate-400 text-sm mt-1">
          Refine your answers to weak questions and receive immediate comparative score improvements without altering your original interview report.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer Revision Box */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h3 className="font-bold text-white text-base">Submit Revised Answer</h3>
          <p className="text-xs text-slate-400 mt-1">
            Incorporate missing concepts and structure your reasoning clearly using the STAR framework.
          </p>
        </div>

        <form onSubmit={handleSubmitRetry} className="space-y-4">
          <textarea
            rows={5}
            value={revisedAnswer}
            onChange={(e) => setRevisedAnswer(e.target.value)}
            placeholder="Type your revised, improved answer incorporating trade-offs and edge cases..."
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Re-evaluating Turn...' : 'Submit Revision for Coaching Evaluation'}
          </button>
        </form>
      </div>

      {/* Score Comparison Results */}
      {comparison && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-blue-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">Practice Attempt #{comparison.attempt_number}</span>
              <h3 className="font-bold text-white text-lg">Score Improvement Comparison</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Evaluated
            </div>
          </div>

          <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            {comparison.feedback}
          </p>

          {/* Comparative Table */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase font-semibold text-slate-400 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Competency Dimension</th>
                  <th className="px-4 py-3">Original Score</th>
                  <th className="px-4 py-3">Revised Score</th>
                  <th className="px-4 py-3">Improvement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Object.keys(comparison.new_scores).map((dim) => {
                  const orig = comparison.original_scores[dim] || 0;
                  const rev = comparison.new_scores[dim] || 0;
                  const delta = rev - orig;
                  return (
                    <tr key={dim} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-white capitalize">{dim}</td>
                      <td className="px-4 py-3">{orig} / 5</td>
                      <td className="px-4 py-3 font-bold text-blue-400">{rev} / 5</td>
                      <td className="px-4 py-3 font-bold">
                        {delta > 0 ? (
                          <span className="text-emerald-400">+{delta}</span>
                        ) : delta === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : (
                          <span className="text-rose-400">{delta}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
