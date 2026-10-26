import React from 'react';
import { ProctoringState } from '../services/proctoring/proctoringEngine';
import { Shield, AlertTriangle, VideoOff, CheckCircle } from 'lucide-react';

interface ProctoringIndicatorProps {
  state: ProctoringState;
}

export const ProctoringIndicator: React.FC<ProctoringIndicatorProps> = ({ state }) => {
  const { status, activeWarningMessage, graceSecondsRemaining, detectorReady, tabSwitchCount } = state;

  return (
    <>
      {/* Top Banner Alert when active warning or grace countdown */}
      {activeWarningMessage && status !== 'terminated' && (
        <div className="mb-4 bg-amber-500/15 border-2 border-amber-500/60 rounded-xl p-4 text-amber-200 flex items-start justify-between shadow-lg backdrop-blur-sm animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm tracking-wide text-amber-300 uppercase">
                Integrity Notice
              </div>
              <p className="text-sm text-slate-100 mt-0.5 font-medium">
                {activeWarningMessage}
              </p>
            </div>
          </div>
          {graceSecondsRemaining !== null && (
            <div className="shrink-0 ml-4 px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-full shadow">
              {graceSecondsRemaining}s remaining
            </div>
          )}
        </div>
      )}

      {/* Floating Badge attached to camera / interview toolbar */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/80 border border-slate-700 backdrop-blur-md text-slate-300">
        {status === 'monitoring' && detectorReady && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">Proctoring Active</span>
          </>
        )}

        {status === 'monitoring' && !detectorReady && (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 font-medium">Activity Monitored</span>
          </>
        )}

        {status === 'warning' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 font-semibold">Integrity Warning</span>
          </>
        )}

        {status === 'paused' && (
          <>
            <VideoOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-300 font-semibold">Camera Interrupted</span>
          </>
        )}

        {status === 'terminated' && (
          <>
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span className="text-rose-300 font-bold">Session Halted</span>
          </>
        )}

        {tabSwitchCount > 0 && status !== 'terminated' && (
          <span className="ml-1 text-[11px] text-slate-400 border-l border-slate-700 pl-2">
            Tabs: {tabSwitchCount}/3
          </span>
        )}
      </div>
    </>
  );
};
