import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Resume } from '../types';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle,
  Plus, X, Trash2, ArrowRight,
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
      if (data.length > 0 && !activeResume) setActiveResume(data[0]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadResumes(); }, []);

  const handleFileUpload = async (file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') { setError('Please upload a PDF or DOCX file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File exceeds the 5 MB size limit.'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.uploadResume(formData);
      setResumes(prev => [res, ...prev]);
      setActiveResume(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleAddSkill = async () => {
    if (!activeResume || !newSkill.trim()) return;
    const updated = Array.from(new Set([...(activeResume.parsed_skills || []), newSkill.trim()]));
    try {
      const res = await api.updateResumeSkills(activeResume.id, updated);
      setActiveResume(res);
      setResumes(prev => prev.map(r => r.id === res.id ? res : r));
      setNewSkill('');
    } catch (err) { console.error(err); }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!activeResume) return;
    const updated = activeResume.parsed_skills.filter(s => s !== skillToRemove);
    try {
      const res = await api.updateResumeSkills(activeResume.id, updated);
      setActiveResume(res);
      setResumes(prev => prev.map(r => r.id === res.id ? res : r));
    } catch (err) { console.error(err); }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      await api.deleteResume(id);
      const remaining = resumes.filter(r => r.id !== id);
      setResumes(remaining);
      setActiveResume(remaining.length > 0 ? remaining[0] : null);
    } catch (err) { console.error(err); }
  };

  const cardStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: 24,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Resume Upload &amp; Analysis
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Our Resume Analysis Agent extracts skills, projects, and domains to personalise your interview questions.
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-[14px] text-sm flex items-center gap-2"
          style={{ background: '#FEE2E2', color: 'var(--danger)', border: '1px solid #FECACA' }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-10 rounded-[24px] flex flex-col items-center justify-center text-center cursor-pointer transition-base"
        style={{
          border: `2px dashed ${uploading ? 'var(--info)' : 'var(--border)'}`,
          background: uploading ? 'var(--color-accent-soft)' : 'var(--bg-muted)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
        />
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
        >
          <UploadCloud className="h-8 w-8" />
        </div>
        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
          {uploading ? 'Parsing and analysing resume…' : 'Drag & drop your resume here'}
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Accepts PDF and DOCX up to 5 MB
        </p>
        <button
          type="button"
          disabled={uploading}
          className="mt-4 px-5 py-2 rounded-[999px] text-xs font-semibold transition-base hover:opacity-80 cursor-target"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          Browse Files
        </button>
      </div>

      {/* Resumes list & extracted details */}
      {resumes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div style={cardStyle} className="space-y-4">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Uploaded Resumes
            </h3>
            <div className="space-y-2">
              {resumes.map(r => (
                <div
                  key={r.id}
                  onClick={() => setActiveResume(r)}
                  className="p-3 rounded-[12px] cursor-pointer transition-base flex items-center justify-between"
                  style={{
                    background: activeResume?.id === r.id ? 'var(--color-accent-soft)' : 'var(--bg-muted)',
                    border: `1px solid ${activeResume?.id === r.id ? 'var(--info)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--info)' }} />
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.file_name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteResume(r.id); }}
                    className="p-1 cursor-target transition-base hover:opacity-70"
                    title="Delete resume"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {activeResume && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                  to={`/setup?resume_id=${activeResume.id}`}
                  className="w-full py-2.5 rounded-[999px] text-xs font-semibold flex items-center justify-center gap-2 transition-base hover:opacity-90 cursor-target"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
                >
                  Use for Mock Interview <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Active resume details */}
          {activeResume && (
            <div className="lg:col-span-2 space-y-6">
              {activeResume.is_scanned && (
                <div
                  className="p-4 rounded-[14px] text-xs flex items-center gap-3"
                  style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  Scanned document detected with limited extractable text. Please verify or manually add skills below.
                </div>
              )}

              {/* Skills */}
              <div style={cardStyle} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      Extracted Skills
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Extraction confidence: {Math.round(activeResume.confidence_score * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeResume.parsed_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-[999px] text-xs font-medium flex items-center gap-1.5"
                      style={{ background: 'var(--color-accent-soft)', color: 'var(--link)', border: '1px solid var(--color-accent)' }}
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="cursor-target hover:opacity-70"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add missing skill (e.g. GraphQL, Kubernetes)…"
                    className="flex-1 px-4 py-2 rounded-[12px] text-xs outline-none transition-base"
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                  />
                  <button
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-[12px] text-xs font-semibold flex items-center gap-1 transition-base hover:opacity-80 cursor-target"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Projects */}
              <div style={cardStyle} className="space-y-4">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Parsed Technical Projects
                </h3>
                <div className="space-y-3">
                  {activeResume.parsed_projects.length > 0 ? (
                    activeResume.parsed_projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-[14px] space-y-1.5"
                        style={{ background: 'var(--bg-muted)' }}
                      >
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {proj.name}
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {proj.description}
                        </p>
                        {proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proj.technologies.map(t => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded"
                                style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      No explicit projects section detected.
                    </p>
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

export default ResumeUploadPage;
