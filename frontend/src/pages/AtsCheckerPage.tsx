import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Resume, ATSAnalysisResponse } from '../types';
import {
  FileSearch, CheckCircle2, AlertTriangle, ArrowRight,
  UploadCloud, FileText, Sparkles, RefreshCw, Printer,
  ArrowLeft, CheckCircle, XCircle, Info, ChevronRight,
  TrendingUp, Award, Layers, ShieldCheck
} from 'lucide-react';

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

  // Load candidate resumes
  const loadResumes = async () => {
    try {
      const data = await api.listResumes();
      setResumes(data);
      if (data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileUpload = async (file: File) => {
    setValidationError('');
    setAnalysisError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      setValidationError('Please upload a PDF or DOCX file format.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('File exceeds the 5 MB maximum size limit.');
      return;
    }

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadResume(formData);
      setResumes(prev => [res, ...prev]);
      setSelectedResumeId(res.id);
    } catch (err: any) {
      setValidationError(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setAnalysisError('');

    if (!selectedResumeId) {
      setValidationError('Please select or upload a resume to analyze.');
      return;
    }

    const trimmedJd = jobDescription.trim();
    if (!trimmedJd) {
      setValidationError('Job Description is required. Please paste the target job specification.');
      return;
    }

    if (trimmedJd.length < 30) {
      setValidationError('Please provide a more comprehensive job description (at least 30 characters).');
      return;
    }

    setAnalyzing(true);
    try {
      const data = await api.checkAts({
        resume_id: selectedResumeId,
        job_description: trimmedJd,
      });
      setResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setAnalysisError(
        err.response?.data?.detail || 'Failed to complete ATS analysis. Please verify your inputs and try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnalysisError('');
    setValidationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileSearch className="h-4 w-4" /> AI Resume ATS Checker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Resume & Job Description ATS Match Analysis
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Evaluate how closely your resume aligns with employer expectations. Identify matching strengths,
            discover missing keywords or underrepresented skills, and receive actionable resume optimization guidance.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Input Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Resume Selection & Upload */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" /> 1. Select Resume
            </h2>
            <span className="text-xs text-slate-400">{resumes.length} available</span>
          </div>

          {loadingResumes ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading stored resumes...</div>
          ) : resumes.length > 0 ? (
            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-300 block">Choose an existing resume:</label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {resumes.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedResumeId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                      selectedResumeId === r.id
                        ? 'bg-blue-600/15 border-blue-500 text-white font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate">{r.file_name}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {r.parsed_skills?.length || 0} skills identified • {(r.file_size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    {selectedResumeId === r.id && <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No resumes uploaded yet. Upload your first resume below.
            </div>
          )}

          {/* Upload New Resume */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="text-xs font-medium text-slate-300 block">Or upload a new resume version:</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".pdf,.docx,.doc"
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingResume}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/40 hover:bg-slate-950 text-slate-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <UploadCloud className="h-4 w-4 text-blue-400" />
              {uploadingResume ? 'Uploading & Parsing...' : 'Upload PDF or DOCX (Max 5MB)'}
            </button>
          </div>

          {selectedResume && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
              <span className="font-semibold block text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> Active Resume Selected
              </span>
              <p className="truncate text-slate-300">{selectedResume.file_name}</p>
            </div>
          )}
        </div>

        {/* Right Columns (2-Span): Job Description Input */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> 2. Target Job Description
              </h2>
              <span className={`text-xs ${jobDescription.length > 14000 ? 'text-amber-400' : 'text-slate-400'}`}>
                {jobDescription.length.toLocaleString()} / 15,000 characters
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Paste the full job posting below, including required skills, qualifications, day-to-day responsibilities, and preferred technologies.
            </p>

            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here, including responsibilities, required skills, qualifications, experience, and preferred technologies..."
              rows={11}
              maxLength={15000}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
            />

            {validationError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                {validationError}
              </div>
            )}

            {analysisError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                {analysisError}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Client-side encrypted & secure transmission
            </span>

            <button
              type="button"
              disabled={analyzing || !selectedResumeId || !jobDescription.trim()}
              onClick={handleAnalyze}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing Resume Against Job Description...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4" />
                  Analyze Resume Against Job Description
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div ref={resultsRef} className="space-y-8 pt-6 border-t border-slate-800">
          {/* Results Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Analysis Completed For:</span>
              <h3 className="text-sm font-bold text-white truncate">{result.resume_file_name}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Save Report
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Analyze Another Job Description
              </button>
            </div>
          </div>

          {/* Section A: ATS Match Score & Disclaimer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Estimated ATS Match Score</span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`text-6xl font-black ${
                    result.match_score >= 80 ? 'text-emerald-400' : (result.match_score >= 60 ? 'text-blue-400' : 'text-amber-400')
                  }`}>
                    {result.match_score}%
                  </span>
                  <span className="text-slate-400 text-xs">/ 100 benchmark</span>
                </div>

                <div className="mt-4 h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      result.match_score >= 80 ? 'bg-emerald-500' : (result.match_score >= 60 ? 'bg-blue-500' : 'bg-amber-500')
                    }`}
                    style={{ width: `${result.match_score}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-6 leading-relaxed">
                {result.score_explanation}
              </p>
            </div>

            <div className="lg:col-span-2 p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                  <Info className="h-4 w-4" /> Understanding Your ATS Match Indicator
                </div>
                <h4 className="text-lg font-bold text-white">How This Score is Calculated</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Applicant Tracking Systems parse candidate resumes and scan for core skills, job title alignment,
                  tools, and explicit project evidence specified in job descriptions. This audit inspects both technical
                  and soft requirements, providing transparency into where your resume excels and where critical keywords
                  are underrepresented.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-300 block mb-1">Standard Disclaimer:</span>
                {result.disclaimer}
              </div>
            </div>
          </div>

          {/* Section B & C: Matching Skills vs Missing / Underrepresented Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Matching Skills */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Matching Demonstrated Skills ({result.matching_skills.length})
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                  Found in Resume
                </span>
              </div>

              {result.matching_skills.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {result.matching_skills.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{m.skill}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                          Demonstrated
                        </span>
                      </div>
                      {m.evidence_snippet && (
                        <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                          "{m.evidence_snippet}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No explicit matching skills found for this JD.</p>
              )}
            </div>

            {/* Missing or Underrepresented Skills */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" /> Missing or Underrepresented Requirements ({result.missing_skills.length})
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                  Not in Resume
                </span>
              </div>

              {result.missing_skills.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {result.missing_skills.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{m.skill}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          m.requirement_type === 'Required'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-indigo-500/15 text-indigo-300'
                        }`}>
                          {m.requirement_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{m.why_it_matters}</p>
                      <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        Recommendation: {m.suggested_steps}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center">
                  Outstanding! All skills and requirements identified in this job description appear to be demonstrated in your resume.
                </div>
              )}
            </div>
          </div>

          {/* Section D: Job Requirement Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" /> Category-by-Category Requirement Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed comparison across core technical competency, infrastructure, soft skills, and qualifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.requirement_breakdown.map((cat, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">{cat.category}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        cat.status === 'Fully Met'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : (cat.status === 'Partially Met'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30')
                      }`}>
                        {cat.status}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {cat.demonstrated_items.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-emerald-400 block mb-1">Demonstrated:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.demonstrated_items.map((it, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px]">
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cat.missing_items.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-amber-400 block mb-1">Missing / Underrepresented:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.missing_items.map((it, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[11px]">
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section E: Actionable Resume Improvement Suggestions */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" /> Actionable Resume Improvement Suggestions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Concrete steps to improve ATS keyword indexing and recruiter impact before applying.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.improvement_suggestions.map((sug, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{sug.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      sug.impact === 'High' ? 'bg-rose-500/15 text-rose-300' : 'bg-blue-500/15 text-blue-300'
                    }`}>
                      {sug.impact} Impact
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{sug.suggestion}</p>
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
