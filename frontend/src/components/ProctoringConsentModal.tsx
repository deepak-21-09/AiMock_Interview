import React from 'react';
import { Shield, Eye, Users, AlertCircle, Check } from 'lucide-react';

interface ProctoringConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
}

export const ProctoringConsentModal: React.FC<ProctoringConsentModalProps> = ({ isOpen, onConsent }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Automated Interview Integrity Monitoring</h2>
            <p className="text-xs text-slate-400">Client-Side Verification & Privacy Notice</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          To maintain fairness and simulate realistic assessment conditions, this mock interview utilizes lightweight client-side computer vision heuristics to verify test environment integrity:
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <Users className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Solitary Testing Environment</div>
              <div className="text-xs text-slate-400">Only the candidate should be visible in frame during active questions.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <Eye className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Camera Presence & Focus</div>
              <div className="text-xs text-slate-400">Please stay positioned before your camera and maintain attention on screen.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Active Window Policy</div>
              <div className="text-xs text-slate-400">Switching away from the interview tab is tracked and limited to 3 switches.</div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 mb-6 leading-relaxed">
          <span className="font-semibold text-blue-200">Privacy Guarantee: </span>
          All vision detection operates 100% locally in your browser using MediaPipe. No raw webcam video, biometrics, or facial templates are stored or uploaded to any server.
        </div>

        <button
          onClick={onConsent}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
        >
          <Check className="w-4 h-4" />
          I Understand & Agree to Proceed
        </button>
      </div>
    </div>
  );
};
