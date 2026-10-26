import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Resume, ATSAnalysisResponse } from '../types';
import {
  FileSearch, CheckCircle2, AlertTriangle,
  UploadCloud, FileText, Sparkles, RefreshCw, Printer,
  CheckCircle, Info, Award, Layers, ShieldCheck,
} from 'lucide-react';

/* ── Shared style helpers ────────────────────────────────────── */
const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 24,
} as React.CSSProperties;

const cardMuted = {
  ...card,
  background: 'var(--bg-muted)',
  border: 'none',
} as React.CSSProperties;

export const AtsCheckerPage: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState<boolean>(true);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');
  const [result, setResult] = useState<ATSAnalysisResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadResumes = async () => {
    try {
      const data = await api.listResumes();
      setResumes(data);
      if (data.length > 0 && !selectedResumeId) setSelectedResumeId(data[0].id);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => { loadResumes(); }, []);

  const handleFileUpload = async (file: File) => {
    setValidationError('');
    setAnalysisError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') { setValidationError('Please upload a PDF or DOCX file format.'); return; }
    if (file.size > 5 * 1024 * 1024) { setValidationError('File exceeds the 5 MB maximum size limit.'); return; }

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.uploadResume(formData);
      setResumes(prev => [res, ...prev]);
      setSelectedResumeId(res.id);
    } catch (err: any) {
      setValidationError(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally { setUploadingResume(false); }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setAnalysisError('');
    if (!selectedResumeId) { setValidationError('Please select or upload a resume to analyze.'); return; }
    const trimmedJd = jobDescription.trim();
    if (!trimmedJd) { setValidationError('Job Description is required.'); return; }
    if (trimmedJd.length < 30) { setValidationError('Please provide a more comprehensive job description (at least 30 characters).'); return; }

    setAnalyzing(true);
    try {
      const data = await api.checkAts({ resume_id: selectedResumeId, job_description: trimmedJd });
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setAnalysisError(err.response?.data?.detail || 'Failed to complete ATS analysis. Please verify your inputs and try again.');
    } finally { setAnalyzing(false); }
  };

  const handleReset = () => {
    setResult(null);
    setAnalysisError('');
    setValidationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '10px 16px',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-[999px] text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--link)' }}
        >
          <FileSearch className="h-4 w-4" /> AI Resume ATS Checker
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Resume &amp; Job Description ATS Match Analysis
        </h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Evaluate how closely your resume aligns with employer expectations. Identify matching strengths,
          discover missing keywords, and receive actionable optimisation guidance.
        </p>
      </div>

      {/* Input form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resume selection */}
        <div style={card} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileText className="h-5 w-5" style={{ color: 'var(--info)' }} /> 1. Select Resume
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{resumes.length} available</span>
          </div>

          {loadingResumes ? (
            <p className="py-8 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
              Loading stored resumes…
            </p>
          ) : resumes.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {resumes.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedResumeId(r.id)}
                  className="w-full text-left p-3 rounded-[12px] transition-base flex items-center justify-between cursor-target"
                  style={{
                    background: selectedResumeId === r.id ? 'var(--color-accent-soft)' : 'var(--bg-muted)',
                    border: `1px solid ${selectedResumeId === r.id ? 'var(--info)' : 'var(--border)'}`,
                  }}
                >
                  <div className="truncate pr-2">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.file_name}
                    </p>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {r.parsed_skills?.length || 0} skills · {(r.file_size_bytes / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  {selectedResumeId === r.id && <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--info)' }} />}
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 rounded-[12px] text-center text-xs" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
              No resumes uploaded yet.
            </p>
          )}

          {/* Upload */}
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Or upload a new resume version:
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              accept=".pdf,.docx,.doc"
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingResume}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-[12px] transition-base flex items-center justify-center gap-2 cursor-target text-xs font-medium"
              style={{
                border: '2px dashed var(--border)',
                background: 'var(--bg-muted)',
                color: 'var(--text-secondary)',
              }}
            >
              <UploadCloud className="h-4 w-4" style={{ color: 'var(--info)' }} />
              {uploadingResume ? 'Uploading & Parsing…' : 'Upload PDF or DOCX (Max 5 MB)'}
            </button>
          </div>

          {selectedResume && (
            <div
              className="p-3.5 rounded-[12px] text-xs space-y-1"
              style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
            >
              <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--info)' }} /> Active Resume
              </span>
              <p className="truncate" style={{ color: 'var(--text-secondary)' }}>{selectedResume.file_name}</p>
            </div>
          )}
        </div>

        {/* Job description */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }} className="lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="h-5 w-5" style={{ color: 'var(--warning)' }} /> 2. Target Job Description
              </h2>
              <span className="text-xs" style={{ color: jobDescription.length > 14000 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                {jobDescription.length.toLocaleString()} / 15,000
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Paste the full job posting below, including required skills, qualifications, and responsibilities.
            </p>

            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here…"
              rows={11}
              maxLength={15000}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }}
            />

            {validationError && (
              <div className="mt-3 p-3 rounded-[12px] text-xs flex items-center gap-2"
                style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}>
                <AlertTriangle className="h-4 w-4 shrink-0" /> {validationError}
              </div>
            )}
            {analysisError && (
              <div className="mt-3 p-3 rounded-[12px] text-xs flex items-center gap-2"
                style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}>
                <AlertTriangle className="h-4 w-4 shrink-0" /> {analysisError}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4" style={{ borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
            <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck className="h-4 w-4" style={{ color: 'var(--success)' }} /> Secure transmission
            </span>
            <button
              type="button"
              disabled={analyzing || !selectedResumeId || !jobDescription.trim()}
              onClick={handleAnalyze}
              className="w-full sm:w-auto px-8 py-3 rounded-[999px] font-semibold text-sm transition-base hover:opacity-90 disabled:opacity-50 cursor-target flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
            >
              {analyzing ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Analysing…</>
              ) : (
                <><FileSearch className="h-4 w-4" /> Analyse Resume Against JD</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div ref={resultsRef} className="space-y-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[16px]" style={cardMuted}>
            <div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Analysis completed for:</span>
              <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{result.resume_file_name}</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold transition-base hover:opacity-80 cursor-target flex items-center gap-1.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <Printer className="h-3.5 w-3.5" /> Print / Save
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold transition-base hover:opacity-90 cursor-target flex items-center gap-1.5"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Analyse Another
              </button>
            </div>
          </div>

          {/* Score + explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div style={card} className="flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Estimated ATS Match Score
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className="text-6xl font-black"
                    style={{ color: result.match_score >= 80 ? 'var(--success)' : result.match_score >= 60 ? 'var(--info)' : 'var(--warning)' }}
                  >
                    {result.match_score}%
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/ 100</span>
                </div>
                <div className="mt-4 h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${result.match_score}%`,
                      background: result.match_score >= 80 ? 'var(--success)' : result.match_score >= 60 ? 'var(--info)' : 'var(--warning)',
                    }}
                  />
                </div>
              </div>
              <p className="text-xs mt-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {result.score_explanation}
              </p>
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }} className="lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--info)' }}>
                <Info className="h-4 w-4" /> Understanding Your ATS Score
              </div>
              <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>How This Score is Calculated</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                ATS systems parse resumes for core skills, job title alignment, tools, and project evidence from job descriptions.
                This audit inspects both technical and soft requirements, showing where your resume excels and where keywords are underrepresented.
              </p>
              <div className="p-4 rounded-[14px] text-xs leading-relaxed" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                <span className="font-semibold block mb-1" style={{ color: 'var(--text-primary)' }}>Disclaimer:</span>
                {result.disclaimer}
              </div>
            </div>
          </div>

          {/* Matching vs Missing skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div style={card} className="space-y-4">
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} /> Matching Skills ({result.matching_skills.length})
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-[999px] font-semibold" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  Found in Resume
                </span>
              </div>
              {result.matching_skills.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.matching_skills.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-[12px] space-y-1.5" style={{ background: 'var(--bg-muted)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.skill}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-[999px] font-medium" style={{ background: '#DCFCE7', color: '#15803D' }}>
                          Demonstrated
                        </span>
                      </div>
                      {m.evidence_snippet && (
                        <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>"{m.evidence_snippet}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No explicit matching skills found for this JD.
                </p>
              )}
            </div>

            <div style={card} className="space-y-4">
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <AlertTriangle className="h-5 w-5" style={{ color: 'var(--warning)' }} /> Missing Requirements ({result.missing_skills.length})
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-[999px] font-semibold" style={{ background: '#FEF9C3', color: '#A16207' }}>
                  Not in Resume
                </span>
              </div>
              {result.missing_skills.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.missing_skills.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-[12px] space-y-1.5" style={{ background: 'var(--bg-muted)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.skill}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-[999px] font-medium"
                          style={{
                            background: m.requirement_type === 'Required' ? '#FEE2E2' : '#EEF2FF',
                            color: m.requirement_type === 'Required' ? 'var(--danger)' : '#4338CA',
                          }}
                        >
                          {m.requirement_type}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.why_it_matters}</p>
                      <p className="text-[11px] p-2 rounded-[8px]" style={{ background: '#FFFBEB', color: '#92400E' }}>
                        Recommendation: {m.suggested_steps}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-[12px] text-xs text-center" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  All skills in this JD appear to be demonstrated in your resume.
                </div>
              )}
            </div>
          </div>

          {/* Requirement breakdown */}
          <div style={card} className="space-y-6">
            <div className="pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Layers className="h-5 w-5" style={{ color: 'var(--info)' }} /> Category-by-Category Breakdown
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Detailed comparison across technical competency, infrastructure, soft skills, and qualifications.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.requirement_breakdown.map((cat, idx) => (
                <div key={idx} className="p-5 rounded-[16px] space-y-4" style={{ background: 'var(--bg-muted)' }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{cat.category}</h4>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-[999px] font-semibold"
                      style={{
                        background: cat.status === 'Fully Met' ? '#DCFCE7' : cat.status === 'Partially Met' ? '#DBEAFE' : '#FEF9C3',
                        color: cat.status === 'Fully Met' ? '#15803D' : cat.status === 'Partially Met' ? '#1D4ED8' : '#A16207',
                      }}
                    >
                      {cat.status}
                    </span>
                  </div>
                  <div className="space-y-3 text-xs">
                    {cat.demonstrated_items.length > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--success)' }}>Demonstrated:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.demonstrated_items.map((it, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[11px]" style={{ background: '#DCFCE7', color: '#15803D' }}>{it}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {cat.missing_items.length > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--warning)' }}>Missing:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.missing_items.map((it, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[11px]" style={{ background: '#FEF9C3', color: '#A16207' }}>{it}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvement suggestions */}
          <div style={card} className="space-y-6">
            <div className="pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Award className="h-5 w-5" style={{ color: 'var(--warning)' }} /> Actionable Improvement Suggestions
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Concrete steps to improve ATS keyword indexing and recruiter impact.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.improvement_suggestions.map((sug, idx) => (
                <div key={idx} className="p-4 rounded-[14px] space-y-2" style={{ background: 'var(--bg-muted)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--info)' }}>{sug.category}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-[999px] font-semibold"
                      style={{
                        background: sug.impact === 'High' ? '#FEE2E2' : '#DBEAFE',
                        color: sug.impact === 'High' ? 'var(--danger)' : '#1D4ED8',
                      }}
                    >
                      {sug.impact} Impact
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{sug.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtsCheckerPage;
