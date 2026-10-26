import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Resume, InterviewPlan } from '../types';
import {
  Bot, ArrowRight, CheckCircle2, AlertCircle,
} from 'lucide-react';

/* ── Shared styles ─────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 24,
  padding: 32,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-muted)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
  color: 'var(--text-secondary)',
};

export const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedResumeId = searchParams.get('resume_id');

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(preselectedResumeId || '');
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [rounds, setRounds] = useState<string[]>(['technical', 'behavioral', 'situational', 'hr']);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [startingDiff, setStartingDiff] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [interactionMode, setInteractionMode] = useState<'voice' | 'text'>('voice');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [generatedPlan, setGeneratedPlan] = useState<InterviewPlan | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const data = await api.listResumes();
        setResumes(data);
        if (data.length > 0 && !selectedResumeId) setSelectedResumeId(data[0].id);
      } catch (err) { console.error(err); }
    };
    fetchResumes();
  }, [selectedResumeId]);

  const toggleRound = (roundName: string) => {
    if (rounds.includes(roundName)) {
      if (rounds.length === 1) return;
      setRounds(rounds.filter(r => r !== roundName));
    } else {
      setRounds([...rounds, roundName]);
    }
  };

  const handleGeneratePlan = async () => {
    setError('');
    if (!targetRole.trim()) { setError('Please provide a target job role.'); return; }
    setLoading(true);
    try {
      const plan = await api.planInterview({
        resume_id: selectedResumeId || undefined,
        target_role: targetRole,
        job_description: jobDescription || undefined,
        rounds,
        num_questions: numQuestions,
        starting_difficulty: startingDiff,
        duration_minutes: durationMinutes,
        interaction_mode: interactionMode,
      });
      setGeneratedPlan(plan);
      setStep('review');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate interview plan.');
    } finally { setLoading(false); }
  };

  const handleConfirmAndProceed = () => {
    if (!generatedPlan) return;
    navigate(`/device-check?session_id=${generatedPlan.session_id}`);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Interview Setup &amp; Planning
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Customise your mock session parameters to receive tailored questions from the Interview Planner Agent.
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-[14px] text-sm flex items-center gap-2"
          style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}
        >
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {step === 'configure' ? (
        <div style={card} className="space-y-6">
          {/* Role & JD */}
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Target Job Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, DevOps Engineer"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Associated Resume (Optional)</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                style={inputStyle}
              >
                <option value="">No Resume (General Questions)</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.file_name} ({r.parsed_skills.length} skills)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Job Description Snippet (Optional)</label>
              <textarea
                rows={3}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target requirements or tech stack to tailor questions precisely…"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Rounds */}
          <div className="space-y-2">
            <label style={labelStyle}>Interview Rounds</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'technical', label: 'Technical' },
                { id: 'behavioral', label: 'Behavioral' },
                { id: 'situational', label: 'Situational' },
                { id: 'hr', label: 'HR / Culture' },
              ].map(rnd => (
                <button
                  key={rnd.id}
                  type="button"
                  onClick={() => toggleRound(rnd.id)}
                  className="p-3 rounded-[12px] text-xs font-semibold transition-base text-center cursor-target"
                  style={{
                    background: rounds.includes(rnd.id) ? 'var(--color-accent-soft)' : 'var(--bg-muted)',
                    border: `1px solid ${rounds.includes(rnd.id) ? 'var(--info)' : 'var(--border)'}`,
                    color: rounds.includes(rnd.id) ? 'var(--link)' : 'var(--text-secondary)',
                  }}
                >
                  {rnd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            {[
              { label: 'Question Count', value: numQuestions, min: 3, max: 12, step: 1, display: String(numQuestions), set: setNumQuestions },
              { label: 'Starting Difficulty', value: startingDiff, min: 1, max: 5, step: 1, display: `Level ${startingDiff}`, set: setStartingDiff },
              { label: 'Duration', value: durationMinutes, min: 15, max: 60, step: 5, display: `${durationMinutes} mins`, set: setDurationMinutes },
            ].map(sl => (
              <div key={sl.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <label style={labelStyle}>{sl.label}</label>
                  <span className="text-xs font-bold" style={{ color: 'var(--info)' }}>{sl.display}</span>
                </div>
                <input
                  type="range"
                  min={sl.min}
                  max={sl.max}
                  step={sl.step}
                  value={sl.value}
                  onChange={(e) => sl.set(parseInt(e.target.value))}
                  className="w-full accent-blue-400"
                />
              </div>
            ))}
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full py-3.5 rounded-[999px] font-semibold text-sm transition-base hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 cursor-target"
              style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
            >
              <Bot className="h-5 w-5" />
              {loading ? 'Generating Personalised Plan…' : 'Generate Interview Plan'}
            </button>
          </div>
        </div>
      ) : (
        /* Review step */
        <div style={card} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Review Planned Interview
            </h3>
            <button
              onClick={() => setStep('configure')}
              className="text-xs transition-base hover:opacity-70 cursor-target"
              style={{ color: 'var(--link)' }}
            >
              Edit Setup
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[14px] text-xs" style={{ background: 'var(--bg-muted)' }}>
            {[
              { label: 'Target Role', val: generatedPlan?.target_role },
              { label: 'Questions', val: generatedPlan?.total_questions },
              { label: 'Difficulty', val: `Level ${generatedPlan?.starting_difficulty} / 5` },
              { label: 'Duration', val: `${generatedPlan?.duration_minutes} min` },
            ].map(item => (
              <div key={item.label}>
                <span className="block" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.val}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label style={labelStyle}>Generated Question Outline</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {generatedPlan?.questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-[12px] flex items-start gap-3"
                  style={{ background: 'var(--bg-muted)' }}
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded-[999px] font-semibold uppercase shrink-0"
                    style={{ background: 'var(--color-accent-soft)', color: 'var(--link)' }}
                  >
                    {q.round_type}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {q.question_text}
                    </p>
                    <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
                      Competency: {q.competency_focus} · Difficulty: Level {q.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="p-4 rounded-[14px] text-xs space-y-1"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
          >
            <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
              Device Requirements:
            </span>
            <p style={{ color: 'var(--text-secondary)' }}>
              A functional webcam and microphone are recommended. You will preview both on the next screen.
            </p>
          </div>

          <button
            onClick={handleConfirmAndProceed}
            className="w-full py-3.5 rounded-[999px] font-semibold text-sm transition-base hover:opacity-90 flex items-center justify-center gap-2 cursor-target"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            Confirm &amp; Proceed to Device Check <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewSetupPage;
