import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Mic, Award, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
          <Bot className="h-4 w-4" /> Next-Gen AI Technical Interview Practice
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Master Your Next Tech Interview with an <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Adaptive Voice Agent</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload your resume, select your target role, and participate in a realistic voice-driven mock interview. 
          Our trained NLP agent listens, adapts question difficulty dynamically, and produces evidence-based scoring reports.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-base shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
          >
            Start Practicing Free <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-base transition flex items-center justify-center"
          >
            Explore How It Works
          </a>
        </div>

        {/* Feature Pillars */}
        <div id="features" className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
              <Mic className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Trained Voice Interaction</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Equipped with a fine-tuned Transformer model to classify candidate intent—distinguishing answers, repeat requests, and clarifications without penalty.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Adaptive Orchestration</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Questions scale dynamically from difficulty 1 to 5. Delivers follow-up probes if core concepts are missed, simulating real human interviewers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-5">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Evidence-Based Rubric</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Evaluates answers across 5 dimensions with exact transcript quotes, missing concepts, PDF performance reports, and retry coaching.
            </p>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mt-28 py-12 border-t border-slate-800/80">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12">How The Adaptive Interview Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-left">
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-2xl font-bold text-blue-500">01</span>
              <h4 className="text-white font-semibold mt-2">Upload Resume</h4>
              <p className="text-slate-400 text-xs mt-1">Our agent extracts your key skills, projects, and matches them to the job description.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-2xl font-bold text-blue-500">02</span>
              <h4 className="text-white font-semibold mt-2">Configure Rounds</h4>
              <p className="text-slate-400 text-xs mt-1">Customize Technical, Behavioral, Situational, and HR interview lengths and difficulty.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-2xl font-bold text-blue-500">03</span>
              <h4 className="text-white font-semibold mt-2">Live Voice Interview</h4>
              <p className="text-slate-400 text-xs mt-1">Speak answers directly through your webcam and microphone with spoken question feedback.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-2xl font-bold text-blue-500">04</span>
              <h4 className="text-white font-semibold mt-2">Evidence Report</h4>
              <p className="text-slate-400 text-xs mt-1">Review 5-dimension scores, download PDF reports, and practice weaker concepts.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
