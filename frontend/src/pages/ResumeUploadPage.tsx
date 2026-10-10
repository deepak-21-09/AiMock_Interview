import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Resume } from '../types';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle,
  Plus, X, Trash2, ArrowRight, Layers, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResumeUploadPage: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = async () => {
    try {
      const data = await api.listResumes();
      setResumes(data);
      if (data.length > 0 && !activeResume) {
        setActiveResume(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileUpload = async (file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5 MB size limit.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadResume(formData);
      setResumes(prev => [res, ...prev]);
      setActiveResume(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleAddSkill = async () => {
    if (!activeResume || !newSkill.trim()) return;
    const updated = Array.from(new Set([...(activeResume.parsed_skills || []), newSkill.trim()]));
    try {
      const res = await api.updateResumeSkills(activeResume.id, updated);
      setActiveResume(res);
      setResumes(prev => prev.map(r => r.id === res.id ? res : r));
      setNewSkill('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!activeResume) return;
    const updated = activeResume.parsed_skills.filter(s => s !== skillToRemove);
    try {
      const res = await api.updateResumeSkills(activeResume.id, updated);
      setActiveResume(res);
      setResumes(prev => prev.map(r => r.id === res.id ? res : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      await api.deleteResume(id);
      const remaining = resumes.filter(r => r.id !== id);
      setResumes(remaining);
      setActiveResume(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Resume Upload & Agent Analysis</h1>
        <p className="text-slate-400 text-sm mt-1">
          Our Resume Analysis Agent extracts verified skills, projects, and domains to personalize questions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 rounded-3xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
          uploading
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-slate-700 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
        <div className="h-16 w-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
          <UploadCloud className="h-8 w-8" />
        </div>
        <h3 className="font-bold text-white text-lg">
          {uploading ? 'Parsing and analyzing resume...' : 'Drag & drop your resume here'}
        </h3>
        <p className="text-slate-400 text-sm mt-1">Accepts PDF and DOCX up to 5 MB</p>
        <button
          type="button"
          disabled={uploading}
          className="mt-4 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          Browse Files
        </button>
      </div>

      {/* Resumes List & Extracted Details */}
      {resumes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resumes Sidebar */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Uploaded Resumes</h3>
            <div className="space-y-2">
              {resumes.map(r => (
                <div
                  key={r.id}
                  onClick={() => setActiveResume(r)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    activeResume?.id === r.id
                      ? 'bg-blue-600/10 border-blue-500 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                    <span className="text-xs font-semibold truncate">{r.file_name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteResume(r.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Delete resume"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {activeResume && (
              <div className="pt-4 border-t border-slate-800">
                <Link
                  to={`/setup?resume_id=${activeResume.id}`}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
                >
                  Use for Mock Interview <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Active Resume Extracted Details */}
          {activeResume && (
            <div className="lg:col-span-2 space-y-6">
              {activeResume.is_scanned && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>
                    Warning: Scanned document detected with limited extractable text. Please verify or manually add your skills below.
                  </span>
                </div>
              )}

              {/* Skills Area */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">Extracted Competencies & Skills</h3>
                    <p className="text-slate-400 text-xs">Extraction Confidence: {Math.round(activeResume.confidence_score * 100)}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeResume.parsed_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium flex items-center gap-1.5"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Manual Add Skill */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add missing skill (e.g. GraphQL, Kubernetes)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Projects Area */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-base">Parsed Technical Projects</h3>
                <div className="space-y-3">
                  {activeResume.parsed_projects.length > 0 ? (
                    activeResume.parsed_projects.map((proj, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{proj.name}</h4>
                        </div>
                        <p className="text-xs text-slate-300">{proj.description}</p>
                        {proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proj.technologies.map(t => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No explicit projects section detected.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
