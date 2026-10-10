import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Resume, InterviewPlan } from '../types';
import {
  Sliders, Mic, Layers, Clock, ShieldCheck,
  Bot, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';

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
        if (data.length > 0 && !selectedResumeId) {
          setSelectedResumeId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchResumes();
  }, [selectedResumeId]);

  const toggleRound = (roundName: string) => {
    if (rounds.includes(roundName)) {
      if (rounds.length === 1) return; // Keep at least one round
      setRounds(rounds.filter(r => r !== roundName));
    } else {
      setRounds([...rounds, roundName]);
    }
  };

  const handleGeneratePlan = async () => {
    setError('');
    if (!targetRole.trim()) {
      setError('Please provide a target job role.');
      return;
    }
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
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndProceed = () => {
    if (!generatedPlan) return;
    navigate(`/device-check?session_id=${generatedPlan.session_id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Interview Setup & Planning</h1>
        <p className="text-slate-400 text-sm mt-1">
          Customize your mock session parameters to receive tailored questions from the Interview Planner Agent.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'configure' ? (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          {/* Target Role & JD */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Target Job Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, DevOps Engineer"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Associated Resume (Optional)</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">No Resume (General Questions)</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.file_name} ({r.parsed_skills.length} skills extracted)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Job Description Snippet (Optional)</label>
              <textarea
                rows={3}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target requirements or tech stack to tailor questions precisely..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Rounds Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-slate-300">Interview Rounds</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'technical', label: 'Technical' },
                { id: 'behavioral', label: 'Behavioral' },
                { id: 'situational', label: 'Situational' },
                { id: 'hr', label: 'HR / Culture' }
              ].map(rnd => (
                <button
                  key={rnd.id}
                  type="button"
                  onClick={() => toggleRound(rnd.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition text-center ${
                    rounds.includes(rnd.id)
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {rnd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Question Count</label>
                <span className="text-xs font-bold text-blue-400">{numQuestions}</span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Starting Difficulty</label>
                <span className="text-xs font-bold text-indigo-400">Level {startingDiff}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={startingDiff}
                onChange={(e) => setStartingDiff(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Duration</label>
                <span className="text-xs font-bold text-cyan-400">{durationMinutes} mins</span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                className="w-full accent-cyan-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bot className="h-5 w-5" />
              {loading ? 'Generating Personalized Plan...' : 'Generate Interview Plan'}
            </button>
          </div>
        </div>
      ) : (
        /* Review Screen */
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-lg">Review Planned Interview</h3>
            <button
              onClick={() => setStep('configure')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Edit Setup
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Target Role</span>
              <span className="font-semibold text-white">{generatedPlan?.target_role}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Planned Questions</span>
              <span className="font-semibold text-white">{generatedPlan?.total_questions}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Starting Difficulty</span>
              <span className="font-semibold text-white">Level {generatedPlan?.starting_difficulty} / 5</span>
            </div>
            <div>
              <span className="text-slate-400 block">Approx Duration</span>
              <span className="font-semibold text-white">{generatedPlan?.duration_minutes} Minutes</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-slate-300">Generated Question Outline</h4>
            <div className="space-y-2">
              {generatedPlan?.questions.map((q) => (
                <div key={q.id} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold uppercase shrink-0">
                    {q.round_type}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">{q.question_text}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Competency: {q.competency_focus} • Difficulty: Level {q.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-white block">Device Requirements:</span>
            <p>A functional webcam and microphone are recommended. You will preview both on the next screen.</p>
          </div>

          <button
            onClick={handleConfirmAndProceed}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            Confirm & Proceed to Device Check <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
