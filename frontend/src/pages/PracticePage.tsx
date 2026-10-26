import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { PracticeComparison } from '../types';
import {
  Send, ArrowLeft, TrendingUp, AlertCircle,
} from 'lucide-react';

const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 28,
};

export const PracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('question_id');

  const [revisedAnswer, setRevisedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comparison, setComparison] = useState<PracticeComparison | null>(null);
  const [error, setError] = useState('');

  const handleSubmitRetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId) { setError('Please select a question from a completed report to practice.'); return; }
    if (!revisedAnswer.trim()) { setError('Please provide a revised answer to evaluate.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.retryQuestion(questionId, { text_answer: revisedAnswer });
      setComparison(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit practice retry.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs mb-2 cursor-target"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Practice &amp; Coaching Lab
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Refine your answers to weak questions and receive immediate comparative score improvements.
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-[14px] text-xs flex items-center gap-2"
          style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Answer revision */}
      <div style={card} className="space-y-5">
        <div>
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Submit Revised Answer
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Incorporate missing concepts and structure your reasoning clearly using the STAR framework.
          </p>
        </div>

        <form onSubmit={handleSubmitRetry} className="space-y-4">
          <textarea
            rows={5}
            value={revisedAnswer}
            onChange={(e) => setRevisedAnswer(e.target.value)}
            placeholder="Type your revised, improved answer incorporating trade-offs and edge cases…"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              lineHeight: 1.6,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-[999px] font-semibold text-xs flex items-center gap-2 transition-base hover:opacity-90 disabled:opacity-50 cursor-target"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Re-evaluating…' : 'Submit Revision for Coaching Evaluation'}
          </button>
        </form>
      </div>

      {/* Score comparison */}
      {comparison && (
        <div style={{ ...card, borderColor: 'var(--info)' }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--info)' }}>
                Practice Attempt #{comparison.attempt_number}
              </span>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Score Improvement Comparison
              </h3>
            </div>
            <div
              className="px-3 py-1 rounded-[999px] text-xs font-bold flex items-center gap-1.5"
              style={{ background: '#DCFCE7', color: '#15803D' }}
            >
              <TrendingUp className="h-4 w-4" /> Evaluated
            </div>
          </div>

          <p
            className="text-xs p-3 rounded-[12px]"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            {comparison.feedback}
          </p>

          <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs" style={{ color: 'var(--text-secondary)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  <th className="px-4 py-3 uppercase text-[10px] font-semibold">Competency Dimension</th>
                  <th className="px-4 py-3 uppercase text-[10px] font-semibold">Original Score</th>
                  <th className="px-4 py-3 uppercase text-[10px] font-semibold">Revised Score</th>
                  <th className="px-4 py-3 uppercase text-[10px] font-semibold">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(comparison.new_scores).map((dim, idx) => {
                  const orig = comparison.original_scores[dim] || 0;
                  const rev = comparison.new_scores[dim] || 0;
                  const delta = rev - orig;
                  return (
                    <tr
                      key={dim}
                      className="transition-base hover:bg-[var(--bg-muted)]"
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : undefined }}
                    >
                      <td className="px-4 py-3 font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {dim}
                      </td>
                      <td className="px-4 py-3">{orig} / 5</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--info)' }}>{rev} / 5</td>
                      <td className="px-4 py-3 font-bold">
                        {delta > 0 ? (
                          <span style={{ color: 'var(--success)' }}>+{delta}</span>
                        ) : delta === 0 ? (
                          <span style={{ color: 'var(--text-secondary)' }}>0</span>
                        ) : (
                          <span style={{ color: 'var(--danger)' }}>{delta}</span>
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

export default PracticePage;
