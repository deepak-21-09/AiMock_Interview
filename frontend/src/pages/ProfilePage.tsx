import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Briefcase, GraduationCap, Clock, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [education, setEducation] = useState('');
  const [yearsOfExp, setYearsOfExp] = useState<number>(0);
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.full_name || '');
      setEducation(user.profile.education || '');
      setYearsOfExp(user.profile.years_of_experience || 0);
      setCurrentRole(user.profile.current_role || '');
      setTargetRole(user.profile.target_role || '');
      setBio(user.profile.bio || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await api.updateProfile({
        full_name: fullName,
        education,
        years_of_experience: Number(yearsOfExp),
        current_role: currentRole,
        target_role: targetRole,
        bio,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full px-4 py-2.5 rounded-[12px] text-sm outline-none transition-base
    focus:ring-2
  `;

  const inputStyle = {
    background: 'var(--bg-muted)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: 6,
    color: 'var(--text-secondary)',
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Candidate Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Manage your background and target career objectives to personalise interview questions.
        </p>
      </div>

      {saved && (
        <div
          className="p-3.5 rounded-[14px] text-sm flex items-center gap-2"
          style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
        >
          <CheckCircle2 className="h-4 w-4" /> Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label style={labelStyle}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Education</label>
            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.S. in Computer Science"
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Years of Experience</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="number"
                step="0.5"
                value={yearsOfExp}
                onChange={(e) => setYearsOfExp(parseFloat(e.target.value) || 0)}
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Current Role / Status</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. Junior Developer, Student"
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Target Career Role</label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Professional Bio &amp; Notes</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Highlight specialisations, preferred stacks, or target domains…"
            className={inputClass}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-[999px] text-sm font-semibold transition-base hover:opacity-90 disabled:opacity-50 cursor-target"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
        >
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
