import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, FileText, ArrowRight } from 'lucide-react';

interface ProctoringTerminatedModalProps {
  isOpen: boolean;
  sessionId: string;
  reason: string | null;
}

export const ProctoringTerminatedModal: React.FC<ProctoringTerminatedModalProps> = ({
  isOpen,
  sessionId,
  reason,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1">
          Interview Session Halted
        </h2>
        <p className="text-xs text-rose-400 uppercase tracking-wider font-semibold mb-4">
          Integrity Policy Violation Confirmed
        </p>

        <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-3.5 text-xs text-rose-200 text-left mb-5 leading-relaxed">
          <div className="font-semibold text-rose-100 mb-1">Reason for termination:</div>
          <div>{reason || 'A critical interview integrity rule was violated and persisted past the grace period.'}</div>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Per interview rules, this session has been locked and further answer submissions have been rejected. You may view your partial evaluation and proctoring log below.
        </p>

        <button
          onClick={() => navigate(`/interviews/${sessionId}/results`)}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-600 text-white rounded-xl font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          View Evaluation & Integrity Report
          <ArrowRight className="w-4 h-4 text-slate-400 ml-1" />
        </button>
      </div>
    </div>
  );
};
