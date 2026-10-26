import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { QuestionDetail, TurnActionResponse } from '../types';
import { ProctoringEngine, ProctoringState } from '../services/proctoring/proctoringEngine';
import { ProctoringIndicator } from '../components/ProctoringIndicator';
import { ProctoringConsentModal } from '../components/ProctoringConsentModal';
import { ProctoringTerminatedModal } from '../components/ProctoringTerminatedModal';
import {
  Mic, Camera, Volume2, RotateCcw, HelpCircle,
  SkipForward, Send, StopCircle, Radio, Clock,
  Bot, AlertCircle, Sparkles, CheckCircle2, AlertTriangle,
  RefreshCw, ShieldCheck
} from 'lucide-react';

export const InterviewRoomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Interview state
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDetail | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [interviewerMessage, setInterviewerMessage] = useState<string>('');
  const [notification, setNotification] = useState<string>('');
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);

  // Media & Device state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaDisconnected, setMediaDisconnected] = useState<'camera' | 'microphone' | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [reconnectingMedia, setReconnectingMedia] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [showTextFallback, setShowTextFallback] = useState<boolean>(false);

  // Proctoring state
  const proctoringEngineRef = useRef<ProctoringEngine | null>(null);
  const [proctoringState, setProctoringState] = useState<ProctoringState>({
    status: 'initializing',
    faceCount: 1,
    activeWarningType: null,
    activeWarningMessage: null,
    graceSecondsRemaining: null,
    tabSwitchCount: 0,
    isTerminated: false,
    terminationReason: null,
    detectorReady: false,
    errorMessage: null,
  });
  const [showConsentModal, setShowConsentModal] = useState<boolean>(() => {
    return localStorage.getItem('proctoring_consent') !== 'true';
  });
  const [isTerminated, setIsTerminated] = useState<boolean>(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Fetch initial session state and support refresh recovery
  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const data = await api.getInterviewDetail(sessionId);
      setSessionDetail(data);
      setCurrentDifficulty(data.current_difficulty);

      if (data.status === 'terminated_proctoring') {
        setIsTerminated(true);
        setTerminationReason('Interview session was terminated due to an integrity violation.');
        setLoading(false);
        return;
      }

      if (data.status === 'completed' || (!data.current_question && data.status !== 'draft')) {
        navigate(`/reports/${sessionId}`);
        return;
      }

      if (data.current_question) {
        setCurrentQuestion(data.current_question);
        speakQuestion(data.current_question.question_text);
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Webcam & Microphone initialization with disconnect listeners
  const initWebcam = async () => {
    setReconnectingMedia(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      streamRef.current = stream;

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length > 0) {
        setCameraActive(true);
        videoTracks[0].onended = () => {
          setCameraActive(false);
          setMediaDisconnected('camera');
        };
      }

      if (audioTracks.length > 0) {
        setMicActive(true);
        audioTracks[0].onended = () => {
          setMicActive(false);
          setMediaDisconnected('microphone');
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Start client-side proctoring monitoring
        if (sessionId) {
          if (!proctoringEngineRef.current) {
            const engine = new ProctoringEngine(sessionId);
            proctoringEngineRef.current = engine;
            engine.subscribe((pState) => {
              setProctoringState(pState);
              if (pState.isTerminated) {
                setIsTerminated(true);
                setTerminationReason(pState.terminationReason);
                setIsRecording(false);
              }
            });
          }

          if (localStorage.getItem('proctoring_consent') === 'true') {
            proctoringEngineRef.current.start(videoRef.current, stream);
          }
        }
      }

      setMediaDisconnected(null);
    } catch (e) {
      console.warn('Media devices could not be initialized or permission denied:', e);
      setMediaDisconnected('camera');
    } finally {
      setReconnectingMedia(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setMicActive(false);
  };

  useEffect(() => {
    fetchSession();
    initWebcam();

    const handleDeviceChange = () => {
      if (streamRef.current) {
        const hasVideo = streamRef.current.getVideoTracks().some(t => t.readyState === 'live');
        const hasAudio = streamRef.current.getAudioTracks().some(t => t.readyState === 'live');
        if (!hasVideo) setMediaDisconnected('camera');
        if (!hasAudio) setMediaDisconnected('microphone');
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      proctoringEngineRef.current?.stop();
      stopWebcam();
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [sessionId]);

  // Text-To-Speech for Question Playback
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Recording Controls
  const startRecording = () => {
    if (isTerminated || proctoringState.isTerminated) return;
    if (!streamRef.current || mediaDisconnected) return;
    try {
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setTimerSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      setShowTextFallback(true);
    }
  };

  const stopRecordingAndGetBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve('');
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        resolve('');
      }
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    });
  };

  // Turn Submission with duplication guards and state preservation
  const handleSubmitAnswer = async () => {
    if (isTerminated || proctoringState.isTerminated) {
      setNotification('Interview session has been terminated due to an integrity violation.');
      return;
    }
    if (submitting || !sessionId || !currentQuestion) return;

    // Check media availability
    if (mediaDisconnected && !typedAnswer.trim()) {
      setNotification('Required media is disconnected. Please reconnect your devices or type your answer below.');
      return;
    }

    setSubmitting(true);
    setNotification('Transcribing and evaluating candidate response...');

    let base64Audio = '';
    if (isRecording) {
      base64Audio = await stopRecordingAndGetBase64();
    }

    // Require either audio or text response
    if (!base64Audio && !typedAnswer.trim()) {
      setNotification('Please record your spoken answer or enter a typed response before submitting.');
      setSubmitting(false);
      return;
    }

    try {
      const res: TurnActionResponse = await api.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        audio_base64: base64Audio || undefined,
        text_answer: typedAnswer.trim() || undefined,
        duration_seconds: timerSeconds,
      });

      // Mark question as answered in client tracking
      setAnsweredQuestionIds(prev => [...prev, currentQuestion.id]);
      setTypedAnswer('');
      setTimerSeconds(0);
      handleTurnAction(res);
    } catch (err: any) {
      setNotification(err.response?.data?.detail || 'Error submitting response. Your answer has been preserved; please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTurnAction = (res: TurnActionResponse) => {
    setCurrentDifficulty(res.current_difficulty);

    if (res.is_concluded || res.action === 'concluded') {
      navigate(`/reports/${sessionId}`);
      return;
    }

    if (res.action === 'repeat_prompt_unreliable') {
      setInterviewerMessage(res.message);
      setNotification('Audio unclear or missing. Please repeat your answer or type it.');
      speakQuestion(res.message);
      return;
    }

    if (res.action === 'follow_up' && res.next_question) {
      setCurrentQuestion(res.next_question);
      setInterviewerMessage(res.message);
      setNotification('Targeted follow-up question requested by interviewer.');
      speakQuestion(res.message);
      return;
    }

    if (res.action === 'next_question' && res.next_question) {
      // Prevent repeated question display
      if (res.next_question.id !== currentQuestion?.id) {
        setCurrentQuestion(res.next_question);
        setInterviewerMessage(res.message);
        setNotification(`Advanced to Question #${res.next_question.order_index} (Difficulty Level ${res.current_difficulty})`);
        speakQuestion(res.next_question.question_text);
      } else {
        fetchSession();
      }
      return;
    }

    // If next question is null or interview concluded
    if (!res.next_question) {
      navigate(`/reports/${sessionId}`);
    }
  };

  const handleRepeat = async () => {
    if (isTerminated || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.repeatQuestion(sessionId);
      setInterviewerMessage(res.message);
      if (res.next_question) {
        speakQuestion(res.next_question.question_text);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarify = async () => {
    if (isTerminated || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.clarifyQuestion(sessionId);
      setInterviewerMessage(res.message);
      speakQuestion(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isTerminated || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.skipQuestion(sessionId);
      handleTurnAction(res);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId || submitting) return;
    if (window.confirm('Are you sure you want to conclude the interview and view your evaluation report?')) {
      setSubmitting(true);
      try {
        await api.endInterview(sessionId);
        navigate(`/reports/${sessionId}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleConsent = () => {
    localStorage.setItem('proctoring_consent', 'true');
    setShowConsentModal(false);
    if (videoRef.current && streamRef.current && proctoringEngineRef.current) {
      proctoringEngineRef.current.start(videoRef.current, streamRef.current);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-400 text-sm">
        <Bot className="h-10 w-10 text-blue-500 animate-pulse mb-3" />
        Connecting to AI Interview Orchestrator...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Proctoring Modals */}
      <ProctoringConsentModal
        isOpen={showConsentModal}
        onConsent={handleConsent}
      />
      <ProctoringTerminatedModal
        isOpen={isTerminated}
        sessionId={sessionId!}
        reason={terminationReason}
      />

      {/* Proctoring Banner Indicator */}
      <ProctoringIndicator state={proctoringState} />
      {/* Media Disconnected Warning Banner */}
      {mediaDisconnected && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              <strong>Required {mediaDisconnected === 'camera' ? 'Camera' : 'Microphone'} Disconnected:</strong>{' '}
              The continuous media feed stopped. Please check your hardware permissions or click Reconnect.
            </span>
          </div>
          <button
            onClick={initWebcam}
            disabled={reconnectingMedia}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reconnectingMedia ? 'animate-spin' : ''}`} />
            {reconnectingMedia ? 'Reconnecting...' : 'Reconnect Device'}
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Interview Active</span>
          </div>
          <div className="text-xs text-slate-400">
            Target Role: <span className="text-white font-medium">{sessionDetail?.target_role || 'Software Engineer'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <span>Adaptive Difficulty:</span>
            <span className="text-white font-bold">Level {currentDifficulty} / 5</span>
          </div>

          <button
            onClick={handleEndInterview}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main Grid: Video Feeds & Question */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interviewer AI & Candidate Video (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* AI Interviewer Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
              <Bot className="h-9 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">AI Interviewer</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Voice-Interaction & Evaluation Agent</p>
            </div>
          </div>

          {/* Candidate Webcam Feed */}
          <div className="relative aspect-video rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* In-feed status indicator */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <div className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                    <Radio className="h-3.5 w-3.5" /> ANSWER RECORDING
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-slate-300 text-[10px] font-semibold border border-slate-700">
                    READY
                  </div>
                )}
              </div>
              <div className="pointer-events-auto">
                <ProctoringIndicator state={proctoringState} />
              </div>
            </div>

            {/* Device Status Badges (Accidental toggles disabled as continuous access is required) */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-700/50 text-[11px]">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className="text-slate-300 font-medium">Camera: {cameraActive ? 'Active' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${micActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className="text-slate-300 font-medium">Mic: {micActive ? 'Active' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Question & Answer Interaction Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">
                  {currentQuestion?.round_type || 'Technical'} Round
                </span>
                {currentQuestion?.is_followup && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                    Follow-up Probe
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Question {currentQuestion?.order_index || 1}
              </span>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQuestion?.question_text || 'Loading next question...'}
              </h2>
              {currentQuestion?.competency_focus && (
                <p className="text-xs text-slate-400">
                  Competency Focus: <span className="text-slate-300">{currentQuestion.competency_focus}</span>
                </p>
              )}
            </div>

            {/* Interviewer Message / Clarification Note */}
            {interviewerMessage && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed space-y-1">
                <span className="font-semibold text-white block">Interviewer Note:</span>
                <p>{interviewerMessage}</p>
              </div>
            )}

            {/* Question Audio Playback Action */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => currentQuestion && speakQuestion(currentQuestion.question_text)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Volume2 className="h-4 w-4 text-blue-400" /> Read Aloud
              </button>
              <button
                onClick={handleRepeat}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4 text-slate-400" /> Repeat
              </button>
              <button
                onClick={handleClarify}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <HelpCircle className="h-4 w-4 text-slate-400" /> Clarify
              </button>
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition ml-auto disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4 text-slate-400" /> Skip
              </button>
            </div>
          </div>

          {/* Answer Recording & Submission Area */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Your Spoken Answer</span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Clock className="h-4 w-4 text-blue-400" /> {formatTimer(timerSeconds)}
              </div>
            </div>

            {/* Answer Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={submitting || isTerminated || !!mediaDisconnected}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
                >
                  <Mic className="h-4 w-4" /> Start Speaking Answer
                </button>
              ) : (
                <button
                  onClick={() => setIsRecording(false)}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition"
                >
                  <StopCircle className="h-4 w-4" /> Stop Recording
                </button>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || isTerminated || (!isRecording && !typedAnswer.trim() && timerSeconds === 0)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 ml-auto"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Analyzing Turn...' : 'Submit Answer'}
              </button>
            </div>

            {/* Notification Banner */}
            {notification && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{notification}</span>
              </div>
            )}

            {/* Text Fallback Area Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTextFallback(!showTextFallback)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                {showTextFallback ? 'Hide typed answer fallback' : 'Or type / edit answer transcript textually'}
              </button>

              {showTextFallback && (
                <textarea
                  rows={3}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer or paste your transcript here..."
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InterviewRoomPage;
